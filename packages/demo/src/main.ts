import 'chat-and-react';
import { demoSchema } from './demo-schema.js';

const chatForm = document.getElementById('chat') as HTMLElement;
const eventLog = document.getElementById('event-log') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

chatForm.setAttribute('schema', JSON.stringify(demoSchema));

function logEvent(label: string, detail: unknown): void {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<strong>${label}</strong><pre>${JSON.stringify(detail, null, 2)}</pre>`;
  eventLog.prepend(entry);
}

chatForm.addEventListener('chat-page-submit', (e) => {
  logEvent('page:submit', (e as CustomEvent).detail);
});

chatForm.addEventListener('chat-form-complete', (e) => {
  logEvent('form:complete', (e as CustomEvent).detail);
  const banner = document.getElementById('complete-banner') as HTMLElement;
  banner.hidden = false;
});

chatForm.addEventListener('chat-error', (e) => {
  logEvent('error', (e as CustomEvent).detail);
});

resetBtn.addEventListener('click', () => {
  const banner = document.getElementById('complete-banner') as HTMLElement;
  banner.hidden = true;
  eventLog.innerHTML = '';
  chatForm.replaceWith(chatForm.cloneNode(false));
  const fresh = document.getElementById('chat') as HTMLElement;
  fresh.setAttribute('schema', JSON.stringify(demoSchema));
  eventLog.innerHTML = '';
});
