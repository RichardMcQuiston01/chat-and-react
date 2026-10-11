import { describe, it, expect } from 'vitest';
import {
  emptySchema,
  emptyPage,
  emptyQuestion,
  readThinking,
  buildThinking,
} from './schema-helpers.js';
import type { ChatQuestion } from '@richardmcquiston01/chat-and-react-core';
import { parseSchema } from '@richardmcquiston01/chat-and-react-core';

describe('emptySchema', () => {
  it('produces a schema that parseSchema accepts without throwing', () => {
    expect(() => parseSchema(emptySchema())).not.toThrow();
  });

  it('starts with exactly one page', () => {
    expect(emptySchema()['x-chat-pages']).toHaveLength(1);
  });

  it('has x-chat-version set to "1"', () => {
    expect(emptySchema()['x-chat-version']).toBe('1');
  });
});

describe('emptyPage', () => {
  it('generates a page id not present in existingPageIds', () => {
    const existing = ['page-1', 'page-2'];
    const page = emptyPage(existing);
    expect(existing).not.toContain(page.id);
  });

  it('ends its branching array with an always rule targeting **FORM_COMPLETED**', () => {
    const page = emptyPage([]);
    const last = page.branching[page.branching.length - 1];
    expect(last.type).toBe('always');
    expect(last.destination_id).toBe('**FORM_COMPLETED**');
  });

  it('starts with an empty questions array', () => {
    expect(emptyPage([]).questions).toHaveLength(0);
  });
});

describe('emptyQuestion', () => {
  it('generates a question id not present in existingQuestionIds', () => {
    const existing = ['q-1', 'q-2'];
    const q = emptyQuestion(existing);
    expect(existing).not.toContain(q.id);
  });

  it('defaults to x-chat-input text and type string', () => {
    const q = emptyQuestion([]);
    expect(q['x-chat-input']).toBe('text');
    expect(q.type).toBe('string');
  });
});

describe('thinking fields', () => {
  const question = (thinking: ChatQuestion['x-chat-thinking']): ChatQuestion => ({
    ...emptyQuestion([]),
    'x-chat-thinking': thinking,
  });

  it('reads no setting as empty fields', () => {
    expect(readThinking(question(undefined))).toEqual({ delaySeconds: '', text: '' });
  });

  it('reads a number as a delay in seconds', () => {
    expect(readThinking(question(1500))).toEqual({ delaySeconds: '1.5', text: '' });
    expect(readThinking(question(0))).toEqual({ delaySeconds: '0', text: '' });
  });

  it('reads an object into both fields', () => {
    expect(readThinking(question({ delay: 2000, text: 'Hmm...' }))).toEqual({
      delaySeconds: '2',
      text: 'Hmm...',
    });
    expect(readThinking(question({ text: 'Hmm...' }))).toEqual({ delaySeconds: '', text: 'Hmm...' });
  });

  it('leaves the key out when both fields are empty', () => {
    expect(buildThinking('', '')).toBeUndefined();
    expect(buildThinking('  ', '')).toBeUndefined();
  });

  it('writes a delay on its own as a number of milliseconds, including 0', () => {
    expect(buildThinking('1.5', '')).toBe(1500);
    expect(buildThinking('0', '')).toBe(0);
  });

  it('writes text with or without a delay as an object', () => {
    expect(buildThinking('2', 'Hmm...')).toEqual({ delay: 2000, text: 'Hmm...' });
    expect(buildThinking('', 'Hmm...')).toEqual({ text: 'Hmm...' });
  });

  it('ignores a delay that is not a number and never goes negative', () => {
    expect(buildThinking('abc', '')).toBeUndefined();
    expect(buildThinking('-3', '')).toBe(0);
  });

  it('round-trips through the editor fields', () => {
    for (const value of [undefined, 0, 800, { delay: 1300, text: 'One moment' }, { text: 'Hmm' }]) {
      const fields = readThinking(question(value));
      expect(buildThinking(fields.delaySeconds, fields.text)).toEqual(value);
    }
  });
});
