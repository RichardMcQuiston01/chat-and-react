import { beforeEach, describe, expect, it } from 'vitest';
import { clearSavedProgress, DEMO_STORAGE_KEY, type ProgressStorage } from './progress.js';

describe('clearSavedProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes only the keys the demo form saved', () => {
    localStorage.setItem(`car:form:${DEMO_STORAGE_KEY}:car:session-id`, 'id');
    localStorage.setItem(`car:form:${DEMO_STORAGE_KEY}:car:progress:id`, '{}');
    localStorage.setItem('car:form:other:car:session-id', 'kept');
    localStorage.setItem('chat-and-react-demo:settings', 'kept');

    expect(clearSavedProgress(localStorage)).toBe(2);

    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem('car:form:other:car:session-id')).toBe('kept');
    expect(localStorage.getItem('chat-and-react-demo:settings')).toBe('kept');
  });

  it('does nothing when there is no saved progress or no storage', () => {
    expect(clearSavedProgress(localStorage)).toBe(0);
    expect(clearSavedProgress(null)).toBe(0);
  });

  it('copes with storage that throws', () => {
    const blocked: ProgressStorage = {
      get length(): number {
        throw new Error('blocked');
      },
      key: () => null,
      removeItem: () => {},
    };
    expect(clearSavedProgress(blocked)).toBe(0);
  });
});
