import type { ChatError, ErrorLogAdapter } from '../types.js';

export class ConsoleErrorAdapter implements ErrorLogAdapter {
  log(error: ChatError): void {
    console.error('[chat-and-react]', error);
  }
}
