import jsonLogic from 'json-logic-js';
import type { AnswerMap, JsonLogicRule } from './types.js';

/**
 * Evaluates JSON Logic rules against provided answers.
 * Wraps json-logic-js to provide type-safe rule evaluation.
 */
export class RuleEngine {
  /**
   * Evaluates a JSON Logic rule against an answer map.
   * @param rule The JSON Logic rule to evaluate
   * @param answers The answer map to evaluate the rule against
   * @returns The boolean result of the rule evaluation
   * @throws {{ code: 'RULE_EVAL_FAILED', message: string, cause: unknown }} if rule evaluation fails
   */
  evaluate(rule: JsonLogicRule, answers: AnswerMap): boolean {
    try {
      // json-logic-js apply() returns any; cast to boolean
      return Boolean((jsonLogic as { apply: (rule: unknown, data: unknown) => unknown }).apply(rule, answers));
    } catch (cause) {
      throw { code: 'RULE_EVAL_FAILED', message: 'Rule evaluation failed', cause };
    }
  }
}
