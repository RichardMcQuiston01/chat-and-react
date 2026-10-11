import '@richardmcquiston01/chat-and-react';
import { demoSchema } from './demo-schema.js';
import './donate-widget.css';
import './donate-widget.js';

const chatPanel = document.getElementById('chat-panel') as HTMLElement;
const eventLog = document.getElementById('event-log') as HTMLElement;
const banner = document.getElementById('complete-banner') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

function logEvent(label: string, detail: unknown): void {
  eventLog.querySelector('.log-empty')?.remove();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<strong>${label}</strong><pre>${JSON.stringify(detail, null, 2)}</pre>`;
  eventLog.prepend(entry);
}

/**
 * Builds a fresh <chat-form> with its schema and listeners attached BEFORE it
 * is added to the page. The element reads its `schema` attribute when it is
 * connected, so setting the attribute afterwards would render nothing.
 */
function createChatForm(): HTMLElement {
  const form = document.createElement('chat-form');
  form.id = 'chat';
  form.setAttribute('schema', JSON.stringify(demoSchema));

  form.addEventListener('chat-page-submit', (e) => {
    logEvent('page:submit', (e as CustomEvent).detail);
  });

  form.addEventListener('chat-form-complete', (e) => {
    logEvent('form:complete', (e as CustomEvent).detail);
    banner.hidden = false;
  });

  form.addEventListener('chat-error', (e) => {
    logEvent('error', (e as CustomEvent).detail);
  });

  return form;
}

function clearEventLog(): void {
  eventLog.innerHTML = '';
}

function startForm(): void {
  const existingForm = document.getElementById('chat');
  const freshForm = createChatForm();
  if (existingForm) {
    existingForm.replaceWith(freshForm);
  } else {
    chatPanel.insertBefore(freshForm, banner);
  }
}

resetBtn.addEventListener('click', () => {
  banner.hidden = true;
  clearEventLog();
  startForm();
});

startForm();
