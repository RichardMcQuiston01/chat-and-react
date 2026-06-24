import type { OutputAdapter, ChatEvent } from '../types.js';

export class BrowserEventAdapter implements OutputAdapter {
  emit(event: ChatEvent): void {
    if (typeof document === 'undefined') return;
    const name = event.type === 'page:submit' ? 'chat-page-submit' : 'chat-form-complete';
    document.dispatchEvent(new CustomEvent(name, { detail: event, bubbles: true }));
  }
}
