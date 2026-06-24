import { describe, it, expect } from 'vitest';
import { emptySchema, emptyPage, emptyQuestion } from './schema-helpers.js';
import { parseSchema } from '@chat-and-react/core';

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
