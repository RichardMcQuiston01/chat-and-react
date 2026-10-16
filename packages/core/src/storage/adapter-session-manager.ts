import type {
  StorageAdapter,
  StoredValue,
  StoreResult,
} from '@richardmcquiston01/storage-adapters';
import type { SessionProgress, SessionStore } from '../session-manager.js';
import type { AnswerMap, ChatError } from '../types.js';

const KEY_SESSION = 'car:session-id';
const keyRecord = (sessionId: string): string => `car:session:${sessionId}`;

/** After this many revision conflicts in a row, a save is abandoned and reported. */
const MAX_CONFLICT_RETRIES = 3;

type InputValue = string | string[];

/** Everything saved for one session, stored under a single key. */
interface SessionRecord {
  progress: SessionProgress | null;
  inputs: Record<string, InputValue>;
}

export interface AdapterSessionManagerOptions {
  /** Called when the adapter fails. The session keeps working from memory. */
  onError?: (error: ChatError) => void;
  /**
   * Called when saved progress changes because of a write made elsewhere, such as
   * another tab. `null` means the session was cleared there.
   */
  onExternalChange?: (progress: SessionProgress | null) => void;
}

const emptyRecord = (): SessionRecord => ({ progress: null, inputs: {} });

function parseRecord(raw: string): SessionRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    return {
      progress: parsed.progress ?? null,
      inputs: parsed.inputs && typeof parsed.inputs === 'object' ? parsed.inputs : {},
    };
  } catch {
    return null;
  }
}

/**
 * A session store backed by a `StorageAdapter`. `ChatController` is synchronous, so
 * the saved session is loaded into memory by `create()`, reads come from memory, and
 * writes are saved in the background. Failures are reported through `onError`.
 *
 * Saves carry the revision they were based on. If another tab wrote first, the two
 * are merged: inputs per question, and progress only when this tab saved progress
 * itself, so a tab that only typed cannot overwrite another tab's progress.
 */
export class AdapterSessionManager implements SessionStore {
  private record: SessionRecord;
  private revision: string | undefined;
  private readonly dirtyInputs = new Set<string>();
  private dirtyProgress = false;
  private pending = false;
  private persisting: Promise<void> | null = null;
  private readonly signal: AbortSignal = new AbortController().signal;
  private unsubscribe: (() => void) | null = null;

  private constructor(
    private readonly adapter: StorageAdapter,
    private readonly sessionId: string,
    private readonly available: boolean,
    initial: StoredValue | null,
    private readonly options: AdapterSessionManagerOptions,
  ) {
    const parsed: SessionRecord | null = initial ? parseRecord(initial.value) : null;
    this.record = parsed ?? emptyRecord();
    this.revision = initial?.revision;
    if (initial && !parsed) {
      this.report(
        `Saved session ${sessionId} could not be read as JSON; starting with an empty session`,
      );
    }
    if (available) {
      this.unsubscribe =
        adapter.subscribe?.(keyRecord(sessionId), (stored) => this.applyRemote(stored)) ?? null;
    }
  }

  /** Loads (or creates) the session id and its saved record, then returns the manager. */
  static async create(
    adapter: StorageAdapter,
    options: AdapterSessionManagerOptions = {},
  ): Promise<AdapterSessionManager> {
    const signal: AbortSignal = new AbortController().signal;
    const fail = (message: string): void =>
      options.onError?.({ code: 'STORAGE_UNAVAILABLE', message });

    let sessionId: string | null = null;
    let available = true;

    const idResult: StoreResult<StoredValue | null> = await adapter.get(KEY_SESSION, { signal });
    if (idResult.ok) {
      sessionId = idResult.value?.value ?? null;
    } else {
      available = false;
      fail(`Could not read the session id: ${idResult.error}. Running in memory-only mode`);
    }
    if (available && sessionId === null) {
      sessionId = crypto.randomUUID();
      const saved: StoreResult<StoredValue> = await adapter.set(KEY_SESSION, sessionId, {
        signal,
      });
      if (!saved.ok) {
        available = false;
        fail(`Could not save the session id: ${saved.error}. Running in memory-only mode`);
      }
    }
    const id: string = sessionId ?? crypto.randomUUID();

    let initial: StoredValue | null = null;
    if (available) {
      const recordResult: StoreResult<StoredValue | null> = await adapter.get(keyRecord(id), {
        signal,
      });
      if (recordResult.ok) {
        initial = recordResult.value;
      } else {
        available = false;
        fail(`Could not read saved progress: ${recordResult.error}. Running in memory-only mode`);
      }
    }
    return new AdapterSessionManager(adapter, id, available, initial, options);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  get isStorageAvailable(): boolean {
    return this.available;
  }

  saveProgress(currentPageId: string, answers: AnswerMap): void {
    this.record.progress = { currentPageId, answers };
    this.dirtyProgress = true;
    this.schedulePersist();
  }

  loadProgress(): SessionProgress | null {
    return this.record.progress;
  }

  saveInput(questionId: string, value: InputValue): void {
    this.record.inputs[questionId] = value;
    this.dirtyInputs.add(questionId);
    this.schedulePersist();
  }

  loadInput(questionId: string): InputValue | null {
    return this.record.inputs[questionId] ?? null;
  }

  clearInput(questionId: string): void {
    if (!(questionId in this.record.inputs)) return;
    delete this.record.inputs[questionId];
    this.dirtyInputs.add(questionId);
    this.schedulePersist();
  }

  clearAll(): void {
    this.record = emptyRecord();
    this.dirtyInputs.clear();
    this.dirtyProgress = false;
    this.pending = false;
    if (!this.available) return;
    void this.removeRecord();
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Resolves when every save made so far has finished. Mostly for tests. */
  async flush(): Promise<void> {
    while (this.persisting) {
      await this.persisting;
    }
  }

  private report(message: string, cause?: unknown): void {
    this.options.onError?.({ code: 'STORAGE_UNAVAILABLE', message, cause });
  }

  private schedulePersist(): void {
    if (!this.available) return;
    this.pending = true;
    this.persisting ??= this.drain();
  }

  /** Saves until nothing is left to save. Never rejects. */
  private async drain(): Promise<void> {
    let conflicts = 0;
    try {
      while (this.pending) {
        this.pending = false;
        const outcome: 'saved' | 'conflict' | 'failed' = await this.persistOnce();
        conflicts = outcome === 'conflict' ? conflicts + 1 : 0;
        if (outcome === 'conflict') {
          if (conflicts >= MAX_CONFLICT_RETRIES) {
            this.report(
              `Gave up saving session ${this.sessionId} after ${conflicts} revision conflicts in a row`,
            );
            break;
          }
          this.pending = true;
        }
      }
    } finally {
      // Cleared in the same tick the loop ends, so a save requested right now starts a new drain.
      this.persisting = null;
    }
  }

  private async persistOnce(): Promise<'saved' | 'conflict' | 'failed'> {
    const sentInputs = new Set<string>(this.dirtyInputs);
    const sentProgress: boolean = this.dirtyProgress;
    this.dirtyInputs.clear();
    this.dirtyProgress = false;

    const result: StoreResult<StoredValue> = await this.adapter.set(
      keyRecord(this.sessionId),
      JSON.stringify(this.record),
      { signal: this.signal, ifRevision: this.revision },
    );
    if (result.ok) {
      this.revision = result.value.revision;
      return 'saved';
    }

    // Keep what was not saved so the next attempt includes it.
    for (const questionId of sentInputs) this.dirtyInputs.add(questionId);
    this.dirtyProgress = this.dirtyProgress || sentProgress;

    if (result.code !== 'conflict') {
      this.report(`Could not save session ${this.sessionId}: ${result.error}`);
      return 'failed';
    }
    const latest: StoreResult<StoredValue | null> = await this.adapter.get(
      keyRecord(this.sessionId),
      { signal: this.signal },
    );
    if (!latest.ok) {
      this.report(
        `Session ${this.sessionId} changed elsewhere, but the new version could not be read: ${latest.error}`,
      );
      return 'failed';
    }
    this.applyRemote(latest.value);
    return 'conflict';
  }

  /** Merges a version written elsewhere with this tab's unsaved changes. */
  private applyRemote(stored: StoredValue | null): void {
    const before: string = JSON.stringify(this.record.progress);
    if (!stored) {
      if (!this.dirtyProgress && this.dirtyInputs.size === 0) {
        this.record = emptyRecord();
      }
      this.revision = undefined;
    } else {
      const remote: SessionRecord | null = parseRecord(stored.value);
      if (!remote) {
        this.report(
          `Session ${this.sessionId} was changed elsewhere to a value that is not valid JSON; ignoring it`,
        );
        this.revision = stored.revision;
        return;
      }
      const inputs: Record<string, InputValue> = { ...remote.inputs };
      for (const questionId of this.dirtyInputs) {
        const mine: InputValue | undefined = this.record.inputs[questionId];
        // An input that is dirty but missing here was cleared on this tab.
        if (mine !== undefined) {
          inputs[questionId] = mine;
        } else {
          delete inputs[questionId];
        }
      }
      this.record = {
        progress: this.dirtyProgress ? this.record.progress : remote.progress,
        inputs,
      };
      this.revision = stored.revision;
    }
    if (JSON.stringify(this.record.progress) !== before) {
      this.options.onExternalChange?.(this.record.progress);
    }
  }

  private async removeRecord(): Promise<void> {
    const key: string = keyRecord(this.sessionId);
    const result: StoreResult<unknown> = this.adapter.remove
      ? await this.adapter.remove(key, { signal: this.signal })
      : await this.adapter.set(key, JSON.stringify(emptyRecord()), { signal: this.signal });
    if (result.ok) {
      this.revision = undefined;
    } else {
      this.report(`Could not clear session ${this.sessionId}: ${result.error}`);
    }
  }
}
