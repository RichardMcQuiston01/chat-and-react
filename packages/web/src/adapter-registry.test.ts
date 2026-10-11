import type {
  ErrorLogAdapter,
  InputAdapter,
  OutputAdapter,
} from '@richardmcquiston01/chat-and-react-core';
import {
  BrowserEventAdapter,
  ConsoleErrorAdapter,
  IdentityInputAdapter,
} from '@richardmcquiston01/chat-and-react-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('returns default IdentityInputAdapter when no input adapter set', () => {
    expect(registry.getInputAdapter()).toBeInstanceOf(IdentityInputAdapter);
  });

  it('returns default BrowserEventAdapter when no output adapter set', () => {
    expect(registry.getOutputAdapter()).toBeInstanceOf(BrowserEventAdapter);
  });

  it('returns default ConsoleErrorAdapter when no error adapter set', () => {
    expect(registry.getErrorAdapter()).toBeInstanceOf(ConsoleErrorAdapter);
  });

  it('stores and retrieves a custom input adapter', () => {
    const adapter: InputAdapter = { transform: (raw) => raw as any };
    registry.setInputAdapter(adapter);
    expect(registry.getInputAdapter()).toBe(adapter);
  });

  it('stores and retrieves a custom output adapter', () => {
    const adapter: OutputAdapter = { emit: () => {} };
    registry.setOutputAdapter(adapter);
    expect(registry.getOutputAdapter()).toBe(adapter);
  });

  it('stores and retrieves a custom error adapter', () => {
    const adapter: ErrorLogAdapter = { log: () => {} };
    registry.setErrorAdapter(adapter);
    expect(registry.getErrorAdapter()).toBe(adapter);
  });

  it('reset() restores all adapters to defaults', () => {
    registry.setInputAdapter({ transform: (raw) => raw as any });
    registry.setOutputAdapter({ emit: () => {} });
    registry.setErrorAdapter({ log: () => {} });
    registry.reset();
    expect(registry.getInputAdapter()).toBeInstanceOf(IdentityInputAdapter);
    expect(registry.getOutputAdapter()).toBeInstanceOf(BrowserEventAdapter);
    expect(registry.getErrorAdapter()).toBeInstanceOf(ConsoleErrorAdapter);
  });
});
