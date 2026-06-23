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
const keyInput = (sessionId: string, questionId: string) =>
  `car:input:${sessionId}:${questionId}`;

export class SessionManager {
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
    this.storage.setItem(
      keyProgress(this.sessionId),
      JSON.stringify({ currentPageId, answers }),
    );
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
    this.storage.setItem(
      keyInput(this.sessionId, questionId),
      JSON.stringify(value),
    );
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

  clearAll(): void {
    if (!this.available) return;
    const progressKey = keyProgress(this.sessionId);
    const inputPrefix = `car:input:${this.sessionId}:`;
    const keysToRemove: string[] = [progressKey];

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
