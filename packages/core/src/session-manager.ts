// packages/core/src/session-manager.ts
import type { AnswerMap } from './types.js';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export interface SessionProgress {
  currentPageId: string;
  answers: AnswerMap;
}

const KEY_SESSION = 'car:session-id';
const keyProgress = (id: string) => `car:progress:${id}`;
const keyInput = (sessionId: string, questionId: string) => `car:input:${sessionId}:${questionId}`;
const keyCompleted = (sessionId: string) => `car:completed:${sessionId}`;

/**
 * What `ChatController` needs from session storage. `SessionManager` keeps it in a
 * synchronous Web Storage object; `AdapterSessionManager` keeps it in a `StorageAdapter`.
 */
export interface SessionStore {
  readonly isStorageAvailable: boolean;
  getSessionId(): string;
  saveProgress(currentPageId: string, answers: AnswerMap): void;
  loadProgress(): SessionProgress | null;
  saveInput(questionId: string, value: string | string[]): void;
  loadInput(questionId: string): string | string[] | null;
  /** Forgets a saved input, such as a draft that has been submitted. */
  clearInput(questionId: string): void;
  clearAll(): void;
  /**
   * Called when the form is finished. Clears the saved session like `clearAll()` and also records
   * that it was completed, so another tab that is still open can tell "finished" from "cleared".
   * A store without it is cleared with `clearAll()`.
   */
  complete?(): void;
  /** When `complete()` was last called, in any tab (milliseconds since the epoch), or null. */
  completedAt?(): number | null;
  /** Stops listening for changes made elsewhere. Called when the controller is destroyed. */
  dispose?(): void;
}

export class SessionManager implements SessionStore {
  private readonly sessionId: string;
  private readonly available: boolean;

  constructor(private readonly storage: StorageBackend = globalThis.localStorage) {
    this.available = this.checkStorage();
    this.sessionId = this.loadOrCreateSessionId();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  get isStorageAvailable(): boolean {
    return this.available;
  }

  saveProgress(currentPageId: string, answers: AnswerMap): void {
    if (!this.available) return;
    this.storage.setItem(keyProgress(this.sessionId), JSON.stringify({ currentPageId, answers }));
  }

  loadProgress(): SessionProgress | null {
    if (!this.available) return null;
    const raw = this.storage.getItem(keyProgress(this.sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionProgress;
    } catch {
      return null;
    }
  }

  saveInput(questionId: string, value: string | string[]): void {
    if (!this.available) return;
    this.storage.setItem(keyInput(this.sessionId, questionId), JSON.stringify(value));
  }

  loadInput(questionId: string): string | string[] | null {
    if (!this.available) return null;
    const raw = this.storage.getItem(keyInput(this.sessionId, questionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as string | string[];
    } catch {
      return null;
    }
  }

  clearInput(questionId: string): void {
    if (!this.available) return;
    this.storage.removeItem(keyInput(this.sessionId, questionId));
  }

  complete(): void {
    this.clearAll();
    if (!this.available) return;
    this.storage.setItem(keyCompleted(this.sessionId), String(Date.now()));
  }

  completedAt(): number | null {
    if (!this.available) return null;
    const completedAt = Number(this.storage.getItem(keyCompleted(this.sessionId)));
    return Number.isFinite(completedAt) && completedAt > 0 ? completedAt : null;
  }

  clearAll(): void {
    if (!this.available) return;
    const progressKey = keyProgress(this.sessionId);
    const inputPrefix = `car:input:${this.sessionId}:`;
    const keysToRemove: string[] = [progressKey, keyCompleted(this.sessionId)];

    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k?.startsWith(inputPrefix)) keysToRemove.push(k);
    }

    for (const k of keysToRemove) {
      this.storage.removeItem(k);
    }
  }

  private loadOrCreateSessionId(): string {
    if (!this.available) return crypto.randomUUID();
    const existing = this.storage.getItem(KEY_SESSION);
    if (existing) return existing;
    const id = crypto.randomUUID();
    this.storage.setItem(KEY_SESSION, id);
    return id;
  }

  private checkStorage(): boolean {
    try {
      const probe = '__car_probe__';
      this.storage.setItem(probe, '1');
      this.storage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
}
