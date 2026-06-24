import type { ErrorLogAdapter, ChatError } from '@chat-and-react/core';

interface WebhookErrorOptions {
  headers?: Record<string, string>;
}

export class WebhookErrorAdapter implements ErrorLogAdapter {
  constructor(
    private readonly url: string,
    private readonly options: WebhookErrorOptions = {},
  ) {}

  log(error: ChatError): void {
    fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.options.headers },
      body: JSON.stringify(error),
    }).catch((err: unknown) => {
      console.error('[chat-and-react] WebhookErrorAdapter:', err);
    });
  }
}
