import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhookOutputAdapter } from './webhook-output-adapter.js';
import type { ChatEvent } from '@chat-and-react/core';

const PAGE_EVENT: ChatEvent = {
  type: 'page:submit',
  sessionId: 'sid',
  pageId: 'p1',
  visitIndex: 0,
  answers: { q: 'a' },
};

describe('WebhookOutputAdapter', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('POSTs the event as JSON to the configured URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    const adapter = new WebhookOutputAdapter('https://example.com/hook');

    adapter.emit(PAGE_EVENT);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/hook');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(PAGE_EVENT);
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('merges custom headers into the request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    const adapter = new WebhookOutputAdapter('https://example.com/hook', {
      headers: { Authorization: 'Bearer token' },
    });

    adapter.emit(PAGE_EVENT);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('logs to console.error on fetch rejection', async () => {
    const error = new Error('network error');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new WebhookOutputAdapter('https://example.com/hook');

    adapter.emit(PAGE_EVENT);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledWith('[chat-and-react] WebhookOutputAdapter:', error);
    spy.mockRestore();
  });
});
