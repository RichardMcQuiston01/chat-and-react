// packages/core/src/chat-controller.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ChatController } from './chat-controller.js';
import { SessionManager } from './session-manager.js';
import type { ChatControllerConfig, ChatEvent } from './types.js';

function makeStorage() {
  const store: Record<string, string> = {};
  const keys: string[] = [];
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { if (!(k in store)) keys.push(k); store[k] = v; },
    removeItem: (k: string) => { delete store[k]; const i = keys.indexOf(k); if (i >= 0) keys.splice(i, 1); },
    key: (i: number) => keys[i] ?? null,
    get length() { return keys.length; },
  };
}

const singlePageSchema = {
  'x-chat-version': '1' as const,
  'x-chat-pages': [{
    id: 'p1', title: 'P1',
    questions: [{ id: 'q1', type: 'string' as const, 'x-chat-input': 'text' as const, title: 'Q1?' }],
    branching: [{ type: 'always' as const, destination_id: '**FORM_COMPLETED**' }],
  }],
};

const branchingSchema = {
  'x-chat-version': '1' as const,
  'x-chat-pages': [
    {
      id: 'start', title: 'Start',
      questions: [{ id: 'choice', type: 'string' as const, 'x-chat-input': 'radio' as const, title: 'Pick?', enum: ['A', 'B'] }],
      branching: [
        { type: 'if' as const, form_element: 'choice', value: 'A', destination_id: 'page-a' },
        { type: 'always' as const, destination_id: 'page-b' },
      ],
    },
    {
      id: 'page-a', title: 'A',
      questions: [{ id: 'qa', type: 'string' as const, 'x-chat-input': 'text' as const, title: 'QA?' }],
      branching: [{ type: 'always' as const, destination_id: '**FORM_COMPLETED**' }],
    },
    {
      id: 'page-b', title: 'B',
      questions: [{ id: 'qb', type: 'string' as const, 'x-chat-input': 'text' as const, title: 'QB?' }],
      branching: [{ type: 'always' as const, destination_id: '**FORM_COMPLETED**' }],
    },
  ],
};

function makeController(schema: unknown = singlePageSchema, overrides: Partial<ChatControllerConfig> = {}) {
  const session = new SessionManager(makeStorage());
  return new ChatController({ schema, ...overrides }, session);
}

describe('ChatController', () => {
  it('starts at the first page', () => {
    const c = makeController();
    c.start();
    expect(c.getCurrentPage()?.id).toBe('p1');
  });

  it('getVisibleQuestions returns all questions when no conditions', () => {
    const c = makeController();
    c.start();
    expect(c.getVisibleQuestions()).toHaveLength(1);
    expect(c.getVisibleQuestions()[0].id).toBe('q1');
  });

  it('getOptions returns merged defaults', () => {
    const c = makeController();
    c.start();
    expect(c.getOptions()).toEqual({ userResumable: true, localStorage: true, autoComplete: true });
  });

  it('fires page:submit listener on submitPage', () => {
    const c = makeController();
    c.start();
    const listener = vi.fn();
    c.on('page:submit', listener);
    c.submitPage({ q1: 'hello' });
    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as ChatEvent;
    expect(event.type).toBe('page:submit');
    expect((event as { pageId: string }).pageId).toBe('p1');
    expect((event as { answers: Record<string, string> }).answers).toEqual({ q1: 'hello' });
  });

  it('fires form:complete when FORM_COMPLETED reached', () => {
    const c = makeController();
    c.start();
    const completeFn = vi.fn();
    c.on('form:complete', completeFn);
    c.submitPage({ q1: 'done' });
    expect(completeFn).toHaveBeenCalledOnce();
    const event = completeFn.mock.calls[0][0] as ChatEvent;
    expect(event.type).toBe('form:complete');
    expect((event as { allAnswers: Record<string, string> }).allAnswers).toEqual({ q1: 'done' });
  });

  it('getCurrentPage is null after form completes', () => {
    const c = makeController();
    c.start();
    c.submitPage({ q1: 'done' });
    expect(c.getCurrentPage()).toBeNull();
  });

  it('navigates to correct page via "if" branching', () => {
    const c = makeController(branchingSchema);
    c.start();
    expect(c.getCurrentPage()?.id).toBe('start');
    c.submitPage({ choice: 'A' });
    expect(c.getCurrentPage()?.id).toBe('page-a');
  });

  it('falls through to "always" when "if" condition does not match', () => {
    const c = makeController(branchingSchema);
    c.start();
    c.submitPage({ choice: 'B' });
    expect(c.getCurrentPage()?.id).toBe('page-b');
  });

  it('accumulates allAnswers across pages', () => {
    const c = makeController(branchingSchema);
    c.start();
    const completeFn = vi.fn();
    c.on('form:complete', completeFn);
    c.submitPage({ choice: 'A' });
    c.submitPage({ qa: 'answer' });
    const event = completeFn.mock.calls[0][0] as { allAnswers: Record<string, string> };
    expect(event.allAnswers).toEqual({ choice: 'A', qa: 'answer' });
  });

  it('suppresses page:submit when userResumable is false', () => {
    const schema = {
      'x-chat-version': '1' as const,
      'x-chat-options': { userResumable: false },
      'x-chat-pages': singlePageSchema['x-chat-pages'],
    };
    const c = makeController(schema);
    c.start();
    const submitFn = vi.fn();
    c.on('page:submit', submitFn);
    c.submitPage({ q1: 'val' });
    expect(submitFn).not.toHaveBeenCalled();
  });

  it('resumes from saved progress when userResumable is true', () => {
    const storage = makeStorage();
    const session = new SessionManager(storage);
    // Pre-seed saved progress for page-a
    const c1 = new ChatController({ schema: branchingSchema }, session);
    c1.start();
    c1.submitPage({ choice: 'A' }); // navigates to page-a, saves progress
    // Now construct a new controller with the same storage — should resume at page-a
    const session2 = new SessionManager(storage);
    const c2 = new ChatController({ schema: branchingSchema }, session2);
    c2.start();
    expect(c2.getCurrentPage()?.id).toBe('page-a');
  });

  it('filters hidden questions via x-chat-condition', () => {
    const schema = {
      'x-chat-version': '1' as const,
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [
          { id: 'q1', type: 'string' as const, 'x-chat-input': 'text' as const, title: 'Q1?' },
          {
            id: 'q2', type: 'string' as const, 'x-chat-input': 'text' as const, title: 'Q2?',
            'x-chat-condition': { '==': [{ var: 'q1' }, 'show'] },
          },
        ],
        branching: [{ type: 'always' as const, destination_id: '**FORM_COMPLETED**' }],
      }],
    };
    const c = makeController(schema);
    c.start();
    expect(c.getVisibleQuestions()).toHaveLength(1);
  });

  it('throws SCHEMA_INVALID for an invalid schema', () => {
    const c = makeController({ 'x-chat-version': '2' });
    expect(() => c.start()).toThrow();
  });

  it('calls OutputAdapter.emit on page:submit', () => {
    const emitFn = vi.fn();
    const outputAdapter = { emit: emitFn };
    const c = makeController(singlePageSchema, { outputAdapter });
    c.start();
    c.submitPage({ q1: 'val' });
    expect(emitFn).toHaveBeenCalledTimes(2); // page:submit + form:complete
  });

  it('off() removes a listener', () => {
    const c = makeController();
    c.start();
    const listener = vi.fn();
    c.on('page:submit', listener);
    c.off('page:submit', listener);
    c.submitPage({ q1: 'val' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('visitIndex increments across pages', () => {
    const c = makeController(branchingSchema);
    c.start();
    const events: ChatEvent[] = [];
    c.on('page:submit', (e) => events.push(e));
    c.submitPage({ choice: 'A' });
    c.submitPage({ qa: 'answer' });
    expect((events[0] as { visitIndex: number }).visitIndex).toBe(0);
    expect((events[1] as { visitIndex: number }).visitIndex).toBe(1);
  });
});
