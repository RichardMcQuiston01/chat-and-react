/** The `storage-key` the demo form saves its progress under. */
export const DEMO_STORAGE_KEY = 'demo';

/** The part of `localStorage` needed to find and remove saved progress. */
export type ProgressStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

/** Returns the browser's localStorage, or null when it is blocked or unavailable. */
export function getProgressStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Removes the progress the demo form saved, so the next form starts on its first page. A visitor
 * who reloads the page still resumes; "Start over" and "Save and restart" call this first.
 * Returns how many keys were removed.
 */
export function clearSavedProgress(storage: ProgressStorage | null): number {
  if (!storage) return 0;
  const prefix = `car:form:${DEMO_STORAGE_KEY}:`;
  try {
    const saved: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) saved.push(key);
    }
    for (const key of saved) storage.removeItem(key);
    return saved.length;
  } catch {
    // Storage is blocked; there is no saved progress to clear.
    return 0;
  }
}
