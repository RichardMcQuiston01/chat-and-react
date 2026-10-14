import {
  ConsoleErrorAdapter as BaseConsoleErrorAdapter,
  type ConsoleErrorOptions,
} from '@richardmcquiston01/error-log-adapter';
import type { ChatErrorCode } from '../types.js';

/** Writes errors to `console.error`, prefixed with `[chat-and-react]` unless overridden. */
export class ConsoleErrorAdapter extends BaseConsoleErrorAdapter<ChatErrorCode> {
  constructor(options: ConsoleErrorOptions = {}) {
    super({ prefix: '[chat-and-react]', ...options });
  }
}
