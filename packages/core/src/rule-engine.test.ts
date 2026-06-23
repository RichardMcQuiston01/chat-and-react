import { describe, it, expect } from 'vitest';
import { RuleEngine } from './rule-engine.js';

describe('RuleEngine', () => {
  const engine = new RuleEngine();

  it('returns true for a truthy var rule', () => {
    expect(engine.evaluate({ '!!': [{ var: 'name' }] }, { name: 'Alice' })).toBe(true);
  });

  it('returns false when var is missing', () => {
    expect(engine.evaluate({ '!!': [{ var: 'name' }] }, {})).toBe(false);
  });

  it('evaluates equality', () => {
    expect(engine.evaluate({ '==': [{ var: 'choice' }, 'Yes'] }, { choice: 'Yes' })).toBe(true);
    expect(engine.evaluate({ '==': [{ var: 'choice' }, 'Yes'] }, { choice: 'No' })).toBe(false);
  });

  it('evaluates AND combination', () => {
    const rule = { and: [{ '!!': [{ var: 'a' }] }, { '!!': [{ var: 'b' }] }] };
    expect(engine.evaluate(rule, { a: 'x', b: 'y' })).toBe(true);
    expect(engine.evaluate(rule, { a: 'x' })).toBe(false);
  });

  it('evaluates OR combination', () => {
    const rule = { or: [{ '==': [{ var: 'x' }, 'A'] }, { '==': [{ var: 'x' }, 'B'] }] };
    expect(engine.evaluate(rule, { x: 'A' })).toBe(true);
    expect(engine.evaluate(rule, { x: 'B' })).toBe(true);
    expect(engine.evaluate(rule, { x: 'C' })).toBe(false);
  });

  it('evaluates NOT', () => {
    expect(engine.evaluate({ '!': [{ var: 'flag' }] }, { flag: '' })).toBe(true);
    expect(engine.evaluate({ '!': [{ var: 'flag' }] }, { flag: 'yes' })).toBe(false);
  });

  it('throws RULE_EVAL_FAILED for invalid rule', () => {
    try {
      engine.evaluate({ '__invalid__': null } as never, {});
    } catch (e: unknown) {
      expect((e as { code: string }).code).toBe('RULE_EVAL_FAILED');
    }
  });
});
