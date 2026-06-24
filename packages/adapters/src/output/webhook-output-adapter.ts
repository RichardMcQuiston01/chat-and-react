import type { OutputAdapter, ChatEvent } from '@chat-and-react/core';

interface WebhookOptions {
  headers?: Record<string, string>;
}

export class WebhookOutputAdapter implements OutputAdapter {
  constructor(
    private readonly url: string,
    private readonly options: WebhookOptions = {},
  ) {}

  emit(event: ChatEvent): void {
    fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.options.headers },
      body: JSON.stringify(event),
    }).catch((err: unknown) => {
      console.error('[chat-and-react] WebhookOutputAdapter:', err);
    });
  }
}
