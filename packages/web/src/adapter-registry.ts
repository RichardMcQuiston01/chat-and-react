import type { InputAdapter, OutputAdapter, ErrorLogAdapter } from '@chat-and-react/core';
import {
  IdentityInputAdapter,
  BrowserEventAdapter,
  ConsoleErrorAdapter,
} from '@chat-and-react/core';

export class AdapterRegistry {
  private inputAdapter: InputAdapter = new IdentityInputAdapter();
  private outputAdapter: OutputAdapter = new BrowserEventAdapter();
  private errorAdapter: ErrorLogAdapter = new ConsoleErrorAdapter();

  setInputAdapter(adapter: InputAdapter): void {
    this.inputAdapter = adapter;
  }

  setOutputAdapter(adapter: OutputAdapter): void {
    this.outputAdapter = adapter;
  }

  setErrorAdapter(adapter: ErrorLogAdapter): void {
    this.errorAdapter = adapter;
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

  reset(): void {
    this.inputAdapter = new IdentityInputAdapter();
    this.outputAdapter = new BrowserEventAdapter();
    this.errorAdapter = new ConsoleErrorAdapter();
  }
}
