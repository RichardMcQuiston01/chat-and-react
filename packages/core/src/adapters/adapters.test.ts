import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdentityInputAdapter } from './identity-input-adapter.js';
import { BrowserEventAdapter } from './browser-event-adapter.js';
import { ConsoleErrorAdapter } from './console-error-adapter.js';
import type { ChatEvent, ChatError } from '../types.js';

describe('IdentityInputAdapter', () => {
  const adapter = new IdentityInputAdapter();

  it('returns its input unchanged for an object', () => {
    const schema = { 'x-chat-version': '1' };
    expect(adapter.transform(schema)).toBe(schema);
  });

  it('returns its input unchanged for a string', () => {
    expect(adapter.transform('hello')).toBe('hello');
  });
});

describe('BrowserEventAdapter', () => {
  let adapter: BrowserEventAdapter;
  let dispatched: CustomEvent[];

  beforeEach(() => {
    dispatched = [];
    const mockDoc = {
      dispatchEvent: vi.fn((e: Event) => { dispatched.push(e as CustomEvent); return true; }),
    };
    vi.stubGlobal('document', mockDoc);
    adapter = new BrowserEventAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches a chat-page-submit CustomEvent for page:submit', () => {
    const event: ChatEvent = {
      type: 'page:submit',
      sessionId: 'sid',
      pageId: 'p1',
      visitIndex: 0,
      answers: { q1: 'hello' },
    };
    adapter.emit(event);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('chat-page-submit');
    expect((dispatched[0] as CustomEvent).detail).toEqual(event);
  });

  it('dispatches a chat-form-complete CustomEvent for form:complete', () => {
    const event: ChatEvent = {
      type: 'form:complete',
      sessionId: 'sid',
      allAnswers: { q1: 'hello' },
    };
    adapter.emit(event);
    expect(dispatched[0].type).toBe('chat-form-complete');
  });
});

describe('ConsoleErrorAdapter', () => {
  it('calls console.error with the error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new ConsoleErrorAdapter();
    const error: ChatError = { code: 'SCHEMA_INVALID', message: 'bad schema' };
    adapter.log(error);
    expect(spy).toHaveBeenCalledWith('[chat-and-react]', error);
    spy.mockRestore();
  });
});
