import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhookErrorAdapter } from './webhook-error-adapter.js';
import type { ChatError } from '@chat-and-react/core';

const ERROR: ChatError = { code: 'ADAPTER_ERROR', message: 'something went wrong' };

describe('WebhookErrorAdapter', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('POSTs the error as JSON to the configured URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    const adapter = new WebhookErrorAdapter('https://example.com/errors');

    adapter.log(ERROR);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/errors');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(ERROR);
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('merges custom headers into the request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    const adapter = new WebhookErrorAdapter('https://example.com/errors', {
      headers: { 'X-Api-Key': 'secret' },
    });

    adapter.log(ERROR);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret');
  });

  it('logs to console.error on fetch rejection', async () => {
    const networkError = new Error('offline');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new WebhookErrorAdapter('https://example.com/errors');

    adapter.log(ERROR);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledWith('[chat-and-react] WebhookErrorAdapter:', networkError);
    spy.mockRestore();
  });
});
