import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';
import type { OutputAdapter } from '@chat-and-react/core';

describe('AdapterRegistry', () => {
  beforeEach(() => AdapterRegistry.clear());

  it('returns undefined for an unregistered key', () => {
    expect(AdapterRegistry.get('missing')).toBeUndefined();
  });

  it('returns a registered adapter by key', () => {
    const adapter: OutputAdapter = { emit: () => {} };
    AdapterRegistry.register('my-output', adapter);
    expect(AdapterRegistry.get('my-output')).toBe(adapter);
  });

  it('overwrites an existing registration', () => {
    const a1: OutputAdapter = { emit: () => {} };
    const a2: OutputAdapter = { emit: () => {} };
    AdapterRegistry.register('key', a1);
    AdapterRegistry.register('key', a2);
    expect(AdapterRegistry.get('key')).toBe(a2);
  });

  it('clear() removes all registrations', () => {
    AdapterRegistry.register('k', { emit: () => {} });
    AdapterRegistry.clear();
    expect(AdapterRegistry.get('k')).toBeUndefined();
  });
});
