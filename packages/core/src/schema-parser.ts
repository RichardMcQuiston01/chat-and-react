import type { ChatSchema, ChatPage } from './types.js';

const VALID_INPUTS = new Set(['text', 'textarea', 'dropdown', 'radio', 'checkbox']);
const FORM_COMPLETED = '**FORM_COMPLETED**';

/**
 * Parses and validates an unknown input as a {@link ChatSchema}.
 *
 * @param raw - The raw input to validate.
 * @returns The typed {@link ChatSchema} if valid.
 * @throws `{ code: 'SCHEMA_INVALID', message: string }` on any validation failure.
 */
export function parseSchema(raw: unknown): ChatSchema {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw makeError('Schema must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['x-chat-version'] !== '1') {
    throw makeError('x-chat-version must be "1"');
  }

  if (!Array.isArray(obj['x-chat-pages'])) {
    throw makeError('x-chat-pages must be an array');
  }

  const pages = obj['x-chat-pages'] as unknown[];
  const rules = (
    typeof obj['x-chat-rules'] === 'object' && obj['x-chat-rules'] !== null
      ? obj['x-chat-rules']
      : {}
  ) as Record<string, unknown>;

  const pageIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const page of pages) {
    validatePage(page, pageIds, questionIds, rules);
  }

  // Second pass: validate branching destinations now that all page ids are known
  for (const page of pages) {
    const p = page as ChatPage;
    for (const rule of p.branching) {
      if (rule.destination_id !== FORM_COMPLETED && !pageIds.has(rule.destination_id)) {
        throw makeError(
          `branching destination_id "${rule.destination_id}" does not reference a known page id`,
        );
      }
      if (rule.type === 'if' && !questionIds.has(rule.form_element)) {
        throw makeError(
          `branching form_element "${rule.form_element}" does not reference a known question id`,
        );
      }
    }
  }

  return raw as ChatSchema;
}

/**
 * Validates a single page object, collecting its id and question ids.
 *
 * @param raw - The raw page value.
 * @param pageIds - Set of already-seen page ids (mutated in place).
 * @param questionIds - Set of already-seen question ids (mutated in place).
 * @param rules - The x-chat-rules map for condition ref resolution.
 */
function validatePage(
  raw: unknown,
  pageIds: Set<string>,
  questionIds: Set<string>,
  rules: Record<string, unknown>,
): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw makeError('Each page must be a non-null object');
  }
  const page = raw as Record<string, unknown>;

  if (typeof page['id'] !== 'string' || !page['id']) {
    throw makeError('Page id must be a non-empty string');
  }
  if (pageIds.has(page['id'] as string)) {
    throw makeError(`Duplicate page id "${page['id']}"`);
  }
  pageIds.add(page['id'] as string);

  if (!Array.isArray(page['questions'])) {
    throw makeError(`Page "${page['id']}" must have a questions array`);
  }

  const branching = page['branching'];
  if (!Array.isArray(branching) || (branching as unknown[]).length === 0) {
    throw makeError(`Page "${page['id']}" must have a non-empty branching array`);
  }

  const lastRule = (branching as unknown[])[branching.length - 1] as Record<string, unknown>;
  if (lastRule['type'] !== 'always') {
    throw makeError(`Page "${page['id']}" branching must end with a rule of type "always"`);
  }

  for (const q of page['questions'] as unknown[]) {
    validateQuestion(q, page['id'] as string, questionIds, rules);
  }
}

/**
 * Validates a single question object, collecting its id.
 *
 * @param raw - The raw question value.
 * @param pageId - The id of the containing page (for error messages).
 * @param questionIds - Set of already-seen question ids (mutated in place).
 * @param rules - The x-chat-rules map for condition ref resolution.
 */
function validateQuestion(
  raw: unknown,
  pageId: string,
  questionIds: Set<string>,
  rules: Record<string, unknown>,
): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw makeError('Each question must be a non-null object');
  }
  const q = raw as Record<string, unknown>;

  if (typeof q['id'] !== 'string' || !q['id']) {
    throw makeError(`In page "${pageId}": question id must be a non-empty string`);
  }
  if (questionIds.has(q['id'] as string)) {
    throw makeError(`Duplicate question id "${q['id']}"`);
  }
  questionIds.add(q['id'] as string);

  if (!VALID_INPUTS.has(q['x-chat-input'] as string)) {
    throw makeError(
      `Question "${q['id']}" has invalid x-chat-input "${q['x-chat-input']}". ` +
        `Must be one of: text, textarea, dropdown, radio, checkbox`,
    );
  }

  const condition = q['x-chat-condition'];
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const c = condition as Record<string, unknown>;
    if ('ref' in c && typeof c['ref'] === 'string') {
      if (!(c['ref'] in rules)) {
        throw makeError(
          `Question "${q['id']}" x-chat-condition refs unknown rule "${c['ref']}"`,
        );
      }
    }
  }
}

/**
 * Creates a schema validation error object.
 *
 * @param message - Human-readable description of the validation failure.
 * @returns An error object with `code: 'SCHEMA_INVALID'`.
 */
function makeError(message: string): { code: 'SCHEMA_INVALID'; message: string } {
  return { code: 'SCHEMA_INVALID', message };
}
