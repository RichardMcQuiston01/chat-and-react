import { describe, it, expect, vi } from 'vitest';
import { WebSocketOutputAdapter } from './websocket-output-adapter.js';
import type { ChatEvent } from '@chat-and-react/core';

const COMPLETE_EVENT: ChatEvent = {
  type: 'form:complete',
  sessionId: 'sid',
  allAnswers: { q: 'a' },
};

const makeSocket = (readyState: number) => ({
  readyState,
  OPEN: 1,
  send: vi.fn(),
});

describe('WebSocketOutputAdapter', () => {
  it('sends the JSON-serialised event when the socket is open', () => {
    const socket = makeSocket(1);
    const adapter = new WebSocketOutputAdapter(socket);

    adapter.emit(COMPLETE_EVENT);

    expect(socket.send).toHaveBeenCalledOnce();
    expect(JSON.parse(socket.send.mock.calls[0][0] as string)).toEqual(COMPLETE_EVENT);
  });

  it('does not send and logs a warning when the socket is not open', () => {
    const socket = makeSocket(0);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new WebSocketOutputAdapter(socket);

    adapter.emit(COMPLETE_EVENT);

    expect(socket.send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[chat-and-react] WebSocketOutputAdapter: socket not open');
    warn.mockRestore();
  });
});
