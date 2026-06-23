import type { ErrorLogAdapter, ChatError } from '../types.js';

export class ConsoleErrorAdapter implements ErrorLogAdapter {
  log(error: ChatError): void {
    console.error('[chat-and-react]', error);
  }
}
