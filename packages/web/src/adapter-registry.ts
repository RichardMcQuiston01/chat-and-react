import type {
  ErrorLogAdapter,
  InputAdapter,
  OutputAdapter,
  StorageAdapter,
} from '@richardmcquiston01/chat-and-react-core';
import {
  BrowserEventAdapter,
  ConsoleErrorAdapter,
  IdentityInputAdapter,
} from '@richardmcquiston01/chat-and-react-core';

export class AdapterRegistry {
  private inputAdapter: InputAdapter = new IdentityInputAdapter();
  private outputAdapter: OutputAdapter = new BrowserEventAdapter();
  private errorAdapter: ErrorLogAdapter = new ConsoleErrorAdapter();
  private storageAdapter: StorageAdapter | null = null;

  setInputAdapter(adapter: InputAdapter): void {
    this.inputAdapter = adapter;
  }

  setOutputAdapter(adapter: OutputAdapter): void {
    this.outputAdapter = adapter;
  }

  setErrorAdapter(adapter: ErrorLogAdapter): void {
    this.errorAdapter = adapter;
  }

  /**
   * Saves progress through a `StorageAdapter` (for example `localStorageAdapter()`,
   * or one that talks to your server). `null` goes back to the built-in storage.
   */
  setStorageAdapter(adapter: StorageAdapter | null): void {
    this.storageAdapter = adapter;
  }

  getInputAdapter(): InputAdapter {
    return this.inputAdapter;
  }

  getOutputAdapter(): OutputAdapter {
    return this.outputAdapter;
  }

  getErrorAdapter(): ErrorLogAdapter {
    return this.errorAdapter;
  }

  getStorageAdapter(): StorageAdapter | null {
    return this.storageAdapter;
  }

  reset(): void {
    this.inputAdapter = new IdentityInputAdapter();
    this.outputAdapter = new BrowserEventAdapter();
    this.errorAdapter = new ConsoleErrorAdapter();
    this.storageAdapter = null;
  }
}
