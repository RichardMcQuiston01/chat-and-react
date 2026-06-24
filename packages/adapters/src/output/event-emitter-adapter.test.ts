import { describe, it, expect, vi } from 'vitest';
import { EventEmitterOutputAdapter } from './event-emitter-adapter.js';
import type { ChatEvent } from '@chat-and-react/core';

describe('EventEmitterOutputAdapter', () => {
  it('emits page:submit on the emitter with the event payload', () => {
    const mockEmit = vi.fn();
    const adapter = new EventEmitterOutputAdapter({ emit: mockEmit });
    const event: ChatEvent = {
      type: 'page:submit',
      sessionId: 'sid',
      pageId: 'p1',
      visitIndex: 0,
      answers: { q: 'a' },
    };

    adapter.emit(event);

    expect(mockEmit).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith('page:submit', event);
  });

  it('emits form:complete on the emitter with the event payload', () => {
    const mockEmit = vi.fn();
    const adapter = new EventEmitterOutputAdapter({ emit: mockEmit });
    const event: ChatEvent = {
      type: 'form:complete',
      sessionId: 'sid',
      allAnswers: { q: 'a' },
    };

    adapter.emit(event);

    expect(mockEmit).toHaveBeenCalledWith('form:complete', event);
  });
});
