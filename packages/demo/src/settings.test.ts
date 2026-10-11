import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  clearSettings,
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from './settings.js';
import type { DemoSettings, StorageLike } from './settings.js';

function makeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string): string | null => (key in data ? data[key] : null),
    setItem: (key: string, value: string): void => {
      data[key] = value;
    },
    removeItem: (key: string): void => {
      delete data[key];
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('access denied');
  },
  setItem: () => {
    throw new Error('quota exceeded');
  },
  removeItem: () => {
    throw new Error('access denied');
  },
};

describe('sanitizeSettings', () => {
  it('returns the defaults for anything that is not an object', () => {
    for (const raw of [null, undefined, 42, 'text', []]) {
      expect(sanitizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('keeps valid values', () => {
    const custom: DemoSettings = {
      userResumable: false,
      localStorage: false,
      autoComplete: true,
      allowEdit: false,
      autoHideQuestions: 1500,
      autoHideAnswers: 3000,
      hideAnimation: 'pop',
      typingSpeed: 0,
      thinkingDelay: 2000,
      thinkingText: 'Hmm...',
      showContinueIcon: false,
    };
    expect(sanitizeSettings(custom)).toEqual(custom);
  });

  it('replaces a value of the wrong type or out of range with its default', () => {
    const result = sanitizeSettings({
      allowEdit: 'yes',
      typingSpeed: -5,
      thinkingDelay: Number.NaN,
      autoHideQuestions: '1000',
      hideAnimation: 'explode',
      thinkingText: 7,
    });
    expect(result.allowEdit).toBe(DEFAULT_SETTINGS.allowEdit);
    expect(result.typingSpeed).toBe(DEFAULT_SETTINGS.typingSpeed);
    expect(result.thinkingDelay).toBe(DEFAULT_SETTINGS.thinkingDelay);
    expect(result.autoHideQuestions).toBe(DEFAULT_SETTINGS.autoHideQuestions);
    expect(result.hideAnimation).toBe('fade');
    expect(result.thinkingText).toBe('');
  });

  it('rounds fractional milliseconds and ignores unknown keys', () => {
    const result = sanitizeSettings({ typingSpeed: 12.6, somethingElse: true });
    expect(result.typingSpeed).toBe(13);
    expect(result).not.toHaveProperty('somethingElse');
  });
});

describe('loadSettings', () => {
  it('gives the defaults, with no error, when nothing is saved', () => {
    expect(loadSettings(makeStorage())).toEqual({ settings: DEFAULT_SETTINGS, error: null });
  });

  it('reads saved settings and fills any missing ones from the defaults', () => {
    const storage = makeStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ typingSpeed: 0, hideAnimation: 'none' }),
    });
    const { settings, error } = loadSettings(storage);
    expect(error).toBeNull();
    expect(settings.typingSpeed).toBe(0);
    expect(settings.hideAnimation).toBe('none');
    expect(settings.thinkingDelay).toBe(DEFAULT_SETTINGS.thinkingDelay);
  });

  it('explains and uses the defaults when the saved value is not valid JSON', () => {
    const { settings, error } = loadSettings(makeStorage({ [SETTINGS_STORAGE_KEY]: '{oops' }));
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(error).toContain('not valid JSON');
  });

  it('explains and uses the defaults when storage cannot be read', () => {
    const { settings, error } = loadSettings(throwingStorage);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(error).toContain('access denied');
  });

  it('explains and uses the defaults when there is no storage at all', () => {
    const { settings, error } = loadSettings(null);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(error).toContain('not available');
  });
});

describe('saveSettings', () => {
  it('saves settings that load back unchanged', () => {
    const storage = makeStorage();
    const custom: DemoSettings = { ...DEFAULT_SETTINGS, typingSpeed: 55, hideAnimation: 'pop' };

    expect(saveSettings(custom, storage)).toEqual({ ok: true, error: null });
    expect(loadSettings(storage).settings).toEqual(custom);
  });

  it('saves only valid values', () => {
    const storage = makeStorage();
    saveSettings({ ...DEFAULT_SETTINGS, typingSpeed: -1 }, storage);
    expect(JSON.parse(storage.data[SETTINGS_STORAGE_KEY]).typingSpeed).toBe(
      DEFAULT_SETTINGS.typingSpeed,
    );
  });

  it('reports why it could not save, without throwing', () => {
    const result = saveSettings(DEFAULT_SETTINGS, throwingStorage);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('quota exceeded');
  });

  it('reports when there is no storage', () => {
    const result = saveSettings(DEFAULT_SETTINGS, null);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not available');
  });
});

describe('clearSettings', () => {
  it('forgets saved settings', () => {
    const storage = makeStorage();
    saveSettings({ ...DEFAULT_SETTINGS, typingSpeed: 99 }, storage);

    expect(clearSettings(storage)).toEqual({ ok: true, error: null });
    expect(loadSettings(storage).settings).toEqual(DEFAULT_SETTINGS);
  });

  it('reports a storage failure without throwing', () => {
    const result = clearSettings(throwingStorage);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('access denied');
  });
});
