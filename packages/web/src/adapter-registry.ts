import type { InputAdapter, OutputAdapter, ErrorLogAdapter } from '@chat-and-react/core';

type AnyAdapter = InputAdapter | OutputAdapter | ErrorLogAdapter;

const registry = new Map<string, AnyAdapter>();

/** Registry for looking up named adapters by key. */
export const AdapterRegistry = {
  /**
   * Register an adapter under a given key.
   * Overwrites any existing registration for the same key.
   */
  register(key: string, adapter: AnyAdapter): void {
    registry.set(key, adapter);
  },

  /**
   * Retrieve a previously registered adapter by key.
   * Returns `undefined` if no adapter is registered under that key.
   */
  get(key: string): AnyAdapter | undefined {
    return registry.get(key);
  },

  /** Remove all registered adapters. Useful between tests. */
  clear(): void {
    registry.clear();
  },
};
