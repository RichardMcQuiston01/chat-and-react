import type { ChatOptions, HideAnimation } from '@richardmcquiston01/chat-and-react-core';

/** The demo's settings are exactly the library's options. */
export type DemoSettings = ChatOptions;

/** The part of `localStorage` the settings code needs. Lets tests pass in a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LoadResult {
  settings: DemoSettings;
  /** Why saved settings could not be used, or null when they loaded cleanly (or none were saved). */
  error: string | null;
}

export interface SaveResult {
  ok: boolean;
  /** What went wrong, or null when the settings were saved. */
  error: string | null;
}

type SettingKey = Extract<keyof DemoSettings, string>;

export const SETTINGS_STORAGE_KEY = 'chat-and-react-demo:settings';

export const HIDE_ANIMATIONS: readonly HideAnimation[] = ['fade', 'pop', 'none'];

export const DEFAULT_SETTINGS: DemoSettings = {
  userResumable: true,
  localStorage: true,
  autoComplete: false,
  allowEdit: true,
  autoHideQuestions: 5000,
  autoHideAnswers: 0,
  hideAnimation: 'fade',
  typingSpeed: 20,
  thinkingDelay: 700,
  thinkingText: '',
  showContinueIcon: true,
};

/** Returns the browser's localStorage, or null when it is blocked or unavailable. */
export function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Turns anything (for example parsed JSON) into valid settings. A value that is
 * missing or the wrong type falls back to its default, so saved settings from an
 * older version of the demo, or ones edited by hand, can never break the form.
 */
export function sanitizeSettings(raw: unknown): DemoSettings {
  const source: Record<string, unknown> =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const flag = (key: SettingKey): boolean => {
    const value = source[key];
    return typeof value === 'boolean' ? value : (DEFAULT_SETTINGS[key] as boolean);
  };
  const milliseconds = (key: SettingKey): number => {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.round(value)
      : (DEFAULT_SETTINGS[key] as number);
  };
  const animation = (value: unknown): HideAnimation =>
    HIDE_ANIMATIONS.find((candidate) => candidate === value) ?? DEFAULT_SETTINGS.hideAnimation;

  return {
    userResumable: flag('userResumable'),
    localStorage: flag('localStorage'),
    autoComplete: flag('autoComplete'),
    allowEdit: flag('allowEdit'),
    autoHideQuestions: milliseconds('autoHideQuestions'),
    autoHideAnswers: milliseconds('autoHideAnswers'),
    hideAnimation: animation(source['hideAnimation']),
    typingSpeed: milliseconds('typingSpeed'),
    thinkingDelay: milliseconds('thinkingDelay'),
    thinkingText:
      typeof source['thinkingText'] === 'string'
        ? source['thinkingText']
        : DEFAULT_SETTINGS.thinkingText,
    showContinueIcon: flag('showContinueIcon'),
  };
}

/** Reads the saved settings. Anything that cannot be read gives the defaults and an explanation. */
export function loadSettings(storage: StorageLike | null): LoadResult {
  if (!storage) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      error: 'localStorage is not available in this browser, so settings cannot be remembered.',
    };
  }

  let stored: string | null;
  try {
    stored = storage.getItem(SETTINGS_STORAGE_KEY);
  } catch (error) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      error: `Could not read saved settings from localStorage: ${describeError(error)}`,
    };
  }
  if (stored === null) return { settings: { ...DEFAULT_SETTINGS }, error: null };

  try {
    return { settings: sanitizeSettings(JSON.parse(stored)), error: null };
  } catch (error) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      error: `Saved settings were not valid JSON, so the defaults are being used: ${describeError(error)}`,
    };
  }
}

/** Saves the settings to localStorage. */
export function saveSettings(settings: DemoSettings, storage: StorageLike | null): SaveResult {
  if (!storage) {
    return {
      ok: false,
      error: 'localStorage is not available in this browser, so the settings were not saved.',
    };
  }
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)));
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: `Could not save settings to localStorage (it may be full or blocked): ${describeError(error)}`,
    };
  }
}

/** Forgets any saved settings so the defaults apply next time. */
export function clearSettings(storage: StorageLike | null): SaveResult {
  if (!storage) {
    return { ok: false, error: 'localStorage is not available in this browser.' };
  }
  try {
    storage.removeItem(SETTINGS_STORAGE_KEY);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: `Could not clear saved settings from localStorage: ${describeError(error)}`,
    };
  }
}
