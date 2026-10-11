import { DEFAULT_SETTINGS, HIDE_ANIMATIONS, sanitizeSettings } from './settings.js';
import type { DemoSettings } from './settings.js';

type FlagKey = 'userResumable' | 'localStorage' | 'autoComplete' | 'allowEdit' | 'showContinueIcon';
type SecondsKey = 'autoHideQuestions' | 'autoHideAnswers' | 'thinkingDelay';

interface FlagField {
  key: FlagKey;
  label: string;
  hint: string;
}

interface NumberField {
  key: SecondsKey | 'typingSpeed';
  label: string;
  hint: string;
  /** Seconds are shown to the user but stored as milliseconds. */
  unit: 'seconds' | 'milliseconds';
}

const FLAG_FIELDS: readonly FlagField[] = [
  { key: 'allowEdit', label: 'Allow editing answers', hint: 'Shows an Edit icon on each answer.' },
  { key: 'showContinueIcon', label: 'Continue button icon', hint: 'Shows an arrow on Continue.' },
  { key: 'userResumable', label: 'Resumable', hint: 'Saves progress so users can come back.' },
  { key: 'localStorage', label: 'Save answers as typed', hint: 'Writes each answer to localStorage.' },
  { key: 'autoComplete', label: 'Browser autocomplete', hint: 'Off adds autocomplete="off".' },
];

const NUMBER_FIELDS: readonly NumberField[] = [
  { key: 'autoHideQuestions', label: 'Hide questions after', hint: '0 keeps them.', unit: 'seconds' },
  { key: 'autoHideAnswers', label: 'Hide answers after', hint: '0 keeps them.', unit: 'seconds' },
  { key: 'thinkingDelay', label: 'Thinking bubble', hint: '0 turns it off.', unit: 'seconds' },
  { key: 'typingSpeed', label: 'Typing speed', hint: 'Per character. 0 shows questions at once.', unit: 'milliseconds' },
];

export interface SettingsModalHandlers {
  /** Called with the new settings. Returns an error message, or null when saving worked. */
  onSave: (settings: DemoSettings) => string | null;
  /** Called to forget saved settings. Returns the defaults to show, and an error message or null. */
  onReset: () => { settings: DemoSettings; error: string | null };
}

export interface SettingsModal {
  open: () => void;
  close: () => void;
  /** Shows a message in the modal's status area (also used for storage problems at load time). */
  setStatus: (message: string, isError: boolean) => void;
}

function makeElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Builds the settings dialog and wires its buttons. The caller adds a trigger that calls `open()`. */
export function createSettingsModal(
  initial: DemoSettings,
  handlers: SettingsModalHandlers,
): SettingsModal {
  let current: DemoSettings = initial;
  const flagInputs = new Map<FlagKey, HTMLInputElement>();
  const numberInputs = new Map<NumberField['key'], HTMLInputElement>();

  const dialog = makeElement('dialog', 'settings-modal');
  dialog.setAttribute('aria-labelledby', 'settingsTitle');

  const form = makeElement('form', 'settings-form');
  form.noValidate = false;
  form.appendChild(makeElement('h2', 'settings-title', 'Demo settings')).id = 'settingsTitle';
  form.appendChild(
    makeElement(
      'p',
      'settings-intro',
      'These options are saved in this browser. Saving restarts the form.',
    ),
  );

  for (const field of FLAG_FIELDS) {
    const row = makeElement('label', 'settings-row settings-row--flag');
    const input = makeElement('input');
    input.type = 'checkbox';
    input.name = field.key;
    flagInputs.set(field.key, input);
    const text = makeElement('span', 'settings-label', field.label);
    text.appendChild(makeElement('small', 'settings-hint', field.hint));
    row.append(input, text);
    form.appendChild(row);
  }

  for (const field of NUMBER_FIELDS) {
    const row = makeElement('label', 'settings-row');
    const text = makeElement('span', 'settings-label', field.label);
    text.appendChild(makeElement('small', 'settings-hint', field.hint));
    const input = makeElement('input', 'settings-number');
    input.type = 'number';
    input.min = '0';
    input.step = field.unit === 'seconds' ? '0.1' : '1';
    input.name = field.key;
    numberInputs.set(field.key, input);
    row.append(text, input, makeElement('span', 'settings-unit', field.unit === 'seconds' ? 's' : 'ms'));
    form.appendChild(row);
  }

  const animationSelect = makeElement('select', 'settings-select');
  animationSelect.name = 'hideAnimation';
  for (const animation of HIDE_ANIMATIONS) {
    animationSelect.appendChild(makeElement('option', undefined, animation)).setAttribute('value', animation);
  }
  const animationRow = makeElement('label', 'settings-row');
  const animationText = makeElement('span', 'settings-label', 'Hide animation');
  animationText.appendChild(makeElement('small', 'settings-hint', 'How hidden bubbles leave.'));
  animationRow.append(animationText, animationSelect);
  form.appendChild(animationRow);

  const thinkingTextInput = makeElement('input', 'settings-text');
  thinkingTextInput.type = 'text';
  thinkingTextInput.name = 'thinkingText';
  thinkingTextInput.placeholder = 'Empty shows dots';
  const thinkingTextRow = makeElement('label', 'settings-row');
  const thinkingTextLabel = makeElement('span', 'settings-label', 'Thinking text');
  thinkingTextLabel.appendChild(makeElement('small', 'settings-hint', 'Words instead of dots.'));
  thinkingTextRow.append(thinkingTextLabel, thinkingTextInput);
  form.appendChild(thinkingTextRow);

  const status = makeElement('p', 'settings-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);

  const actions = makeElement('div', 'settings-actions');
  const saveButton = makeElement('button', 'settings-btn settings-btn--primary', 'Save and restart');
  saveButton.type = 'submit';
  const resetButton = makeElement('button', 'settings-btn', 'Reset to defaults');
  resetButton.type = 'button';
  const cancelButton = makeElement('button', 'settings-btn', 'Cancel');
  cancelButton.type = 'button';
  actions.append(saveButton, resetButton, cancelButton);
  form.appendChild(actions);
  dialog.appendChild(form);

  function setStatus(message: string, isError: boolean): void {
    status.textContent = message;
    status.classList.toggle('settings-status--error', isError);
  }

  function fillFields(settings: DemoSettings): void {
    for (const [key, input] of flagInputs) input.checked = Boolean(settings[key]);
    for (const field of NUMBER_FIELDS) {
      const stored = Number(settings[field.key] ?? 0);
      const shown = field.unit === 'seconds' ? stored / 1000 : stored;
      const input = numberInputs.get(field.key);
      if (input) input.value = String(shown);
    }
    animationSelect.value = settings.hideAnimation ?? DEFAULT_SETTINGS.hideAnimation ?? 'fade';
    thinkingTextInput.value = settings.thinkingText ?? '';
  }

  function readFields(): DemoSettings {
    const raw: Record<string, unknown> = {};
    for (const [key, input] of flagInputs) raw[key] = input.checked;
    for (const field of NUMBER_FIELDS) {
      const input = numberInputs.get(field.key);
      const typed = input?.value.trim() ? Number(input.value) : Number.NaN;
      // An empty or invalid box is passed on as NaN so sanitizeSettings uses the default.
      raw[field.key] = field.unit === 'seconds' ? typed * 1000 : typed;
    }
    raw['hideAnimation'] = animationSelect.value;
    raw['thinkingText'] = thinkingTextInput.value;
    return sanitizeSettings(raw);
  }

  function open(): void {
    fillFields(current);
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    flagInputs.values().next().value?.focus();
  }

  function close(): void {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = readFields();
    const error = handlers.onSave(next);
    current = next;
    if (error) {
      // The new settings still apply for this visit, but the user is told they will not be remembered.
      setStatus(`${error} The settings apply until you reload.`, true);
      return;
    }
    setStatus('', false);
    close();
  });

  resetButton.addEventListener('click', () => {
    const result = handlers.onReset();
    current = result.settings;
    fillFields(current);
    if (result.error) setStatus(`${result.error} Defaults apply until you reload.`, true);
    else setStatus('Defaults restored and the form restarted.', false);
  });

  cancelButton.addEventListener('click', close);

  // A click on the dimmed backdrop lands on the dialog element itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  document.body.appendChild(dialog);

  return { open, close, setStatus };
}
