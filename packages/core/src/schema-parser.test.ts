import { describe, it, expect } from 'vitest';
import { parseSchema } from './schema-parser.js';

const validPage = {
  id: 'page-1',
  title: 'Page 1',
  questions: [
    { id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'Q1?' },
  ],
  branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
};

const validSchema = {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'x-chat-version': '1',
  'x-chat-pages': [validPage],
};

describe('parseSchema', () => {
  it('returns typed schema for a valid input', () => {
    const result = parseSchema(validSchema);
    expect(result['x-chat-version']).toBe('1');
    expect(result['x-chat-pages']).toHaveLength(1);
  });

  it('throws SCHEMA_INVALID when x-chat-version is missing', () => {
    expect(() => parseSchema({ 'x-chat-pages': [] })).toThrow();
    try {
      parseSchema({ 'x-chat-pages': [] });
    } catch (e: unknown) {
      expect((e as { code: string }).code).toBe('SCHEMA_INVALID');
    }
  });

  it('throws SCHEMA_INVALID when x-chat-pages is not an array', () => {
    expect(() => parseSchema({ 'x-chat-version': '1', 'x-chat-pages': 'bad' })).toThrow();
  });

  it('throws SCHEMA_INVALID for duplicate page ids', () => {
    expect(() =>
      parseSchema({
        'x-chat-version': '1',
        'x-chat-pages': [validPage, { ...validPage }],
      }),
    ).toThrow();
  });

  it('throws SCHEMA_INVALID for duplicate question ids across pages', () => {
    const page2 = {
      id: 'page-2',
      title: 'Page 2',
      questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'Dupe' }],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    };
    expect(() =>
      parseSchema({ 'x-chat-version': '1', 'x-chat-pages': [validPage, page2] }),
    ).toThrow();
  });

  it('throws SCHEMA_INVALID when branching destination_id references unknown page', () => {
    const bad = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'Q' }],
        branching: [{ type: 'always', destination_id: 'does-not-exist' }],
      }],
    };
    expect(() => parseSchema(bad)).toThrow();
  });

  it('allows **FORM_COMPLETED** as a destination_id', () => {
    expect(() => parseSchema(validSchema)).not.toThrow();
  });

  it('throws SCHEMA_INVALID when last branching rule is not "always"', () => {
    const bad = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Q', enum: ['A', 'B'] }],
        branching: [{ type: 'if', form_element: 'q1', value: 'A', destination_id: '**FORM_COMPLETED**' }],
      }],
    };
    expect(() => parseSchema(bad)).toThrow();
  });

  it('throws SCHEMA_INVALID when branching if form_element references unknown question', () => {
    const bad = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Q', enum: ['A'] }],
        branching: [
          { type: 'if', form_element: 'no-such-question', value: 'A', destination_id: '**FORM_COMPLETED**' },
          { type: 'always', destination_id: '**FORM_COMPLETED**' },
        ],
      }],
    };
    expect(() => parseSchema(bad)).toThrow();
  });

  it('throws SCHEMA_INVALID for invalid x-chat-input value', () => {
    const bad = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'range', title: 'Q' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      }],
    };
    expect(() => parseSchema(bad)).toThrow();
  });

  it('throws SCHEMA_INVALID when x-chat-condition ref is not in x-chat-rules', () => {
    const bad = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{
          id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'Q',
          'x-chat-condition': { ref: 'no-such-rule' },
        }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      }],
      'x-chat-rules': {},
    };
    expect(() => parseSchema(bad)).toThrow();
  });

  it('accepts x-chat-condition with valid ref', () => {
    const schema = {
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{
          id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'Q',
          'x-chat-condition': { ref: 'my-rule' },
        }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      }],
      'x-chat-rules': { 'my-rule': { '!!': [{ var: 'q1' }] } },
    };
    expect(() => parseSchema(schema)).not.toThrow();
  });
});
