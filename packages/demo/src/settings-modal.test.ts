import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSettingsModal } from './settings-modal.js';
import { DEFAULT_SETTINGS } from './settings.js';
import type { DemoSettings } from './settings.js';

function field(name: string): HTMLInputElement | HTMLSelectElement {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  if (!element) throw new Error(`No field named ${name}`);
  return element;
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === label,
  );
  if (!found) throw new Error(`No button labelled ${label}`);
  return found;
}

/** happy-dom does not turn a submit-button click into a submit event, so send it directly. */
function submitForm(): void {
  const form = document.querySelector('form');
  if (!form) throw new Error('The settings form is missing');
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('settings modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the current settings when opened, with seconds converted from milliseconds', () => {
    const modal = createSettingsModal(
      { ...DEFAULT_SETTINGS, autoHideQuestions: 2500, allowEdit: false, hideAnimation: 'pop' },
      { onSave: () => null, onReset: () => ({ settings: DEFAULT_SETTINGS, error: null }) },
    );
    modal.open();

    expect((field('autoHideQuestions') as HTMLInputElement).value).toBe('2.5');
    expect((field('allowEdit') as HTMLInputElement).checked).toBe(false);
    expect(field('hideAnimation').value).toBe('pop');
  });

  it('saves edited values as milliseconds and closes', () => {
    const onSave = vi.fn((_settings: DemoSettings): string | null => null);
    const modal = createSettingsModal(DEFAULT_SETTINGS, {
      onSave,
      onReset: () => ({ settings: DEFAULT_SETTINGS, error: null }),
    });
    modal.open();
    (field('thinkingDelay') as HTMLInputElement).value = '1.5';
    (field('typingSpeed') as HTMLInputElement).value = '40';
    (field('thinkingText') as HTMLInputElement).value = 'Hmm...';
    submitForm();

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.thinkingDelay).toBe(1500);
    expect(saved.typingSpeed).toBe(40);
    expect(saved.thinkingText).toBe('Hmm...');
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('uses the default for an empty number box', () => {
    const onSave = vi.fn((_settings: DemoSettings): string | null => null);
    const modal = createSettingsModal(DEFAULT_SETTINGS, {
      onSave,
      onReset: () => ({ settings: DEFAULT_SETTINGS, error: null }),
    });
    modal.open();
    (field('typingSpeed') as HTMLInputElement).value = '';
    submitForm();

    expect(onSave.mock.calls[0][0].typingSpeed).toBe(DEFAULT_SETTINGS.typingSpeed);
  });

  it('keeps the dialog open and explains a storage failure', () => {
    const modal = createSettingsModal(DEFAULT_SETTINGS, {
      onSave: () => 'Could not save settings: quota exceeded',
      onReset: () => ({ settings: DEFAULT_SETTINGS, error: null }),
    });
    modal.open();
    submitForm();

    const status = document.querySelector('.settings-status');
    expect(status?.textContent).toContain('quota exceeded');
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('resets the fields to the defaults', () => {
    const onReset = vi.fn(() => ({ settings: DEFAULT_SETTINGS, error: null }));
    const modal = createSettingsModal(
      { ...DEFAULT_SETTINGS, typingSpeed: 99 },
      { onSave: () => null, onReset },
    );
    modal.open();
    button('Reset to defaults').click();

    expect(onReset).toHaveBeenCalledTimes(1);
    expect((field('typingSpeed') as HTMLInputElement).value).toBe(String(DEFAULT_SETTINGS.typingSpeed));
  });

  it('cancel closes without saving', () => {
    const onSave = vi.fn((): string | null => null);
    const modal = createSettingsModal(DEFAULT_SETTINGS, {
      onSave,
      onReset: () => ({ settings: DEFAULT_SETTINGS, error: null }),
    });
    modal.open();
    button('Cancel').click();

    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });
});
