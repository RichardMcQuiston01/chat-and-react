# chat-and-react Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public open-source framework-agnostic chat-form library as a Bun monorepo with a pure TypeScript core and a Web Component shell.

**Architecture:** A `@chat-and-react/core` package handles all logic (schema parsing, rule evaluation, session persistence, page-graph navigation) with zero DOM dependency. A `chat-and-react` package wraps core in a `<chat-form>` Web Component with Shadow DOM rendering. Consumers can use core headlessly or drop in the Web Component.

**Tech Stack:** TypeScript 5, Bun workspaces, tsup (build), Vitest (tests), json-logic-js (rule engine), happy-dom (web package tests).

## Global Constraints

- Bun is the package manager and runtime — never use npm or yarn
- Browser targets: Chrome/Firefox/Edge last 2 versions, Safari 14+; no polyfills
- All source files use `.ts` extension; imports use `.js` extension (ESM convention)
- 2-space indent, LF line endings, trailing commas, spaces within object literal braces
- Test files live alongside source: `foo.test.ts` next to `foo.ts`
- `x-chat-*` is the namespace for all schema extension keywords
- `car:` is the localStorage key prefix for all session data
- `**FORM_COMPLETED**` is the exact terminal sentinel string for branching `destination_id`
- Page-submit events are suppressed when `userResumable` is `false`

---

## File Map

```
chat-and-react/
├── package.json                              # root workspace (private)
├── tsconfig.base.json                        # shared TS compiler options
├── packages/
│   ├── core/
│   │   ├── package.json                      # @chat-and-react/core
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts                    # ESM + CJS output
│   │   └── src/
│   │       ├── index.ts                      # public re-exports
│   │       ├── types.ts                      # all shared interfaces & types
│   │       ├── schema-parser.ts              # parseSchema()
│   │       ├── schema-parser.test.ts
│   │       ├── rule-engine.ts                # RuleEngine class
│   │       ├── rule-engine.test.ts
│   │       ├── session-manager.ts            # SessionManager class
│   │       ├── session-manager.test.ts
│   │       ├── chat-controller.ts            # ChatController class
│   │       ├── chat-controller.test.ts
│   │       └── adapters/
│   │           ├── index.ts
│   │           ├── identity-input-adapter.ts
│   │           ├── browser-event-adapter.ts
│   │           ├── console-error-adapter.ts
│   │           └── adapters.test.ts
│   └── web/
│       ├── package.json                      # chat-and-react
│       ├── tsconfig.json
│       ├── tsup.config.ts                    # ESM + CJS + IIFE output
│       └── src/
│           ├── index.ts                      # registers element, exports AdapterRegistry
│           ├── adapter-registry.ts           # global adapter lookup
│           ├── adapter-registry.test.ts
│           ├── styles.ts                     # Shadow DOM stylesheet string
│           ├── renderer.ts                   # DOM helpers (bubbles, input widgets)
│           ├── chat-form-element.ts          # <chat-form> custom element
│           └── chat-form-element.test.ts
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/tsup.config.ts`
- Create: `packages/web/vitest.config.ts`

**Interfaces:**
- Produces: working `bun install` and `bun run typecheck` in both packages

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "chat-and-react-workspace",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.3.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 3: Create `packages/core/package.json`**

```json
{
  "name": "@chat-and-react/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "json-logic-js": "^2.0.2"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@types/json-logic-js": "^2.0.8"
  }
}
```

- [ ] **Step 4: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
});
```

- [ ] **Step 6: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 7: Create `packages/web/package.json`**

```json
{
  "name": "chat-and-react",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@chat-and-react/core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "happy-dom": "^14.0.0"
  }
}
```

- [ ] **Step 8: Create `packages/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create `packages/web/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'ChatAndReact',
    outExtension: () => ({ js: '.iife.js' }),
    clean: false,
  },
]);
```

- [ ] **Step 10: Create `packages/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
});
```

- [ ] **Step 11: Install dependencies**

Run: `bun install`

Expected: `node_modules` created at root; `packages/core/node_modules` and `packages/web/node_modules` symlinked via workspace.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.base.json packages/
git commit -m "chore: scaffold monorepo with core and web packages"
```

---

## Task 2: Core Types

**Files:**
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/index.ts` (skeleton)

**Interfaces:**
- Produces: all shared TypeScript types consumed by Tasks 3–7

- [ ] **Step 1: Create `packages/core/src/types.ts`**

```ts
export type AnswerMap = Record<string, string | string[]>;

export type ChatInputType = 'text' | 'textarea' | 'dropdown' | 'radio' | 'checkbox';

export type JsonLogicRule = Record<string, unknown>;

export interface ChatConditionRef {
  ref: string;
}

export interface ChatQuestion {
  id: string;
  type: 'string' | 'array';
  'x-chat-input': ChatInputType;
  title: string;
  'x-chat-placeholder'?: string;
  'x-chat-condition'?: JsonLogicRule | ChatConditionRef;
  enum?: string[];
  items?: { enum: string[] };
}

export interface BranchingAlways {
  type: 'always';
  destination_id: string;
}

export interface BranchingIf {
  type: 'if';
  form_element: string;
  value: string;
  destination_id: string;
}

export type BranchingRule = BranchingAlways | BranchingIf;

export interface ChatPage {
  id: string;
  title: string;
  questions: ChatQuestion[];
  branching: BranchingRule[];
}

export interface ChatOptions {
  userResumable: boolean;
  localStorage: boolean;
  autoComplete: boolean;
}

export interface ChatSchema {
  '$schema'?: string;
  'x-chat-version': '1';
  'x-chat-options'?: Partial<ChatOptions>;
  'x-chat-pages': ChatPage[];
  'x-chat-rules'?: Record<string, JsonLogicRule>;
}

export interface PageSubmitEvent {
  type: 'page:submit';
  sessionId: string;
  pageId: string;
  visitIndex: number;
  answers: AnswerMap;
}

export interface FormCompleteEvent {
  type: 'form:complete';
  sessionId: string;
  allAnswers: AnswerMap;
}

export type ChatEvent = PageSubmitEvent | FormCompleteEvent;

export type ChatErrorCode =
  | 'SCHEMA_INVALID'
  | 'RULE_EVAL_FAILED'
  | 'ADAPTER_ERROR'
  | 'STORAGE_UNAVAILABLE';

export interface ChatError {
  code: ChatErrorCode;
  message: string;
  cause?: unknown;
}

export interface InputAdapter {
  transform(raw: unknown): unknown;
}

export interface OutputAdapter {
  emit(event: ChatEvent): void;
}

export interface ErrorLogAdapter {
  log(error: ChatError): void;
}

export interface ChatControllerConfig {
  schema: unknown;
  inputAdapter?: InputAdapter;
  outputAdapter?: OutputAdapter;
  errorAdapter?: ErrorLogAdapter;
}
```

- [ ] **Step 2: Create `packages/core/src/index.ts` (skeleton — expanded in Task 7)**

```ts
export * from './types.js';
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/core && bun run typecheck`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/
git commit -m "feat(core): add shared TypeScript types"
```

---

## Task 3: SchemaParser

**Files:**
- Create: `packages/core/src/schema-parser.ts`
- Create: `packages/core/src/schema-parser.test.ts`

**Interfaces:**
- Consumes: `ChatSchema`, `ChatPage`, `ChatQuestion`, `BranchingRule` from `./types.js`
- Produces: `parseSchema(raw: unknown): ChatSchema` — throws `{ code: 'SCHEMA_INVALID', message: string }` on failure

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/schema-parser.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/core && bun run test -- schema-parser`

Expected: all tests FAIL with "Cannot find module './schema-parser.js'"

- [ ] **Step 3: Implement `schema-parser.ts`**

```ts
// packages/core/src/schema-parser.ts
import type { ChatSchema, ChatPage, ChatQuestion, BranchingRule } from './types.js';

const VALID_INPUTS = new Set(['text', 'textarea', 'dropdown', 'radio', 'checkbox']);
const FORM_COMPLETED = '**FORM_COMPLETED**';

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
  const rules = (typeof obj['x-chat-rules'] === 'object' && obj['x-chat-rules'] !== null
    ? obj['x-chat-rules']
    : {}) as Record<string, unknown>;

  const pageIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const page of pages) {
    validatePage(page, pageIds, questionIds, rules);
  }

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
  if (!Array.isArray(page['branching']) || (page['branching'] as unknown[]).length === 0) {
    throw makeError(`Page "${page['id']}" must have a non-empty branching array`);
  }

  const branching = page['branching'] as unknown[];
  const lastRule = branching[branching.length - 1] as Record<string, unknown>;
  if (lastRule['type'] !== 'always') {
    throw makeError(`Page "${page['id']}" branching must end with a rule of type "always"`);
  }

  for (const q of page['questions'] as unknown[]) {
    validateQuestion(q, page['id'] as string, questionIds, rules);
  }
}

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
      if (!rules[c['ref']]) {
        throw makeError(
          `Question "${q['id']}" x-chat-condition refs unknown rule "${c['ref']}"`,
        );
      }
    }
  }
}

function makeError(message: string): { code: 'SCHEMA_INVALID'; message: string } {
  return { code: 'SCHEMA_INVALID', message };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/core && bun run test -- schema-parser`

Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/schema-parser.ts packages/core/src/schema-parser.test.ts
git commit -m "feat(core): add SchemaParser with full validation"
```

---

## Task 4: RuleEngine

**Files:**
- Create: `packages/core/src/rule-engine.ts`
- Create: `packages/core/src/rule-engine.test.ts`

**Interfaces:**
- Consumes: `AnswerMap`, `JsonLogicRule` from `./types.js`; `json-logic-js` npm package
- Produces: `class RuleEngine { evaluate(rule: JsonLogicRule, answers: AnswerMap): boolean }`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/rule-engine.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/core && bun run test -- rule-engine`

Expected: FAIL with "Cannot find module './rule-engine.js'"

- [ ] **Step 3: Implement `rule-engine.ts`**

```ts
// packages/core/src/rule-engine.ts
import jsonLogic from 'json-logic-js';
import type { AnswerMap, JsonLogicRule } from './types.js';

export class RuleEngine {
  evaluate(rule: JsonLogicRule, answers: AnswerMap): boolean {
    try {
      // json-logic-js apply() returns any; cast to boolean
      return Boolean((jsonLogic as { apply: (rule: unknown, data: unknown) => unknown }).apply(rule, answers));
    } catch (cause) {
      throw { code: 'RULE_EVAL_FAILED', message: 'Rule evaluation failed', cause };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/core && bun run test -- rule-engine`

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/rule-engine.ts packages/core/src/rule-engine.test.ts
git commit -m "feat(core): add RuleEngine wrapping json-logic-js"
```

---

## Task 5: SessionManager

**Files:**
- Create: `packages/core/src/session-manager.ts`
- Create: `packages/core/src/session-manager.test.ts`

**Interfaces:**
- Consumes: `AnswerMap` from `./types.js`
- Produces:
  ```ts
  interface StorageBackend {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    key(index: number): string | null;
    readonly length: number;
  }
  interface SessionProgress { currentPageId: string; answers: AnswerMap; }
  class SessionManager {
    constructor(storage?: StorageBackend)
    getSessionId(): string
    get isStorageAvailable(): boolean
    saveProgress(currentPageId: string, answers: AnswerMap): void
    loadProgress(): SessionProgress | null
    saveInput(questionId: string, value: string | string[]): void
    loadInput(questionId: string): string | string[] | null
    clearAll(): void
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/session-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';
import type { StorageBackend } from './session-manager.js';

function makeStorage(): StorageBackend {
  const store: Record<string, string> = {};
  const keys: string[] = [];
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      if (!(k in store)) keys.push(k);
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
      const i = keys.indexOf(k);
      if (i >= 0) keys.splice(i, 1);
    },
    key: (i) => keys[i] ?? null,
    get length() {
      return keys.length;
    },
  };
}

function makeThrowingStorage(): StorageBackend {
  return {
    getItem: () => { throw new Error('Storage blocked'); },
    setItem: () => { throw new Error('Storage blocked'); },
    removeItem: () => { throw new Error('Storage blocked'); },
    key: () => null,
    get length() { return 0; },
  };
}

describe('SessionManager', () => {
  let storage: StorageBackend;
  let manager: SessionManager;

  beforeEach(() => {
    storage = makeStorage();
    manager = new SessionManager(storage);
  });

  it('generates a session id on construction', () => {
    expect(manager.getSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('reuses the session id stored in storage', () => {
    const existing = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    storage.setItem('car:session-id', existing);
    const m2 = new SessionManager(storage);
    expect(m2.getSessionId()).toBe(existing);
  });

  it('reports storage as available', () => {
    expect(manager.isStorageAvailable).toBe(true);
  });

  it('reports storage as unavailable when storage throws', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(m.isStorageAvailable).toBe(false);
  });

  it('still generates a session id when storage is unavailable', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(m.getSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('saves and loads progress', () => {
    manager.saveProgress('page-2', { q1: 'hello' });
    const loaded = manager.loadProgress();
    expect(loaded).toEqual({ currentPageId: 'page-2', answers: { q1: 'hello' } });
  });

  it('returns null when no progress saved', () => {
    expect(manager.loadProgress()).toBeNull();
  });

  it('saves and loads individual input values', () => {
    manager.saveInput('email', 'test@example.com');
    expect(manager.loadInput('email')).toBe('test@example.com');
  });

  it('saves and loads array input values', () => {
    manager.saveInput('colors', ['red', 'blue']);
    expect(manager.loadInput('colors')).toEqual(['red', 'blue']);
  });

  it('clears progress and input keys but not session id', () => {
    const sessionId = manager.getSessionId();
    manager.saveProgress('p1', { q1: 'a' });
    manager.saveInput('q1', 'a');
    manager.clearAll();
    expect(manager.loadProgress()).toBeNull();
    expect(manager.loadInput('q1')).toBeNull();
    expect(storage.getItem('car:session-id')).toBe(sessionId);
  });

  it('silently does nothing when storage unavailable', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(() => m.saveProgress('p1', {})).not.toThrow();
    expect(m.loadProgress()).toBeNull();
    expect(() => m.clearAll()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/core && bun run test -- session-manager`

Expected: FAIL with "Cannot find module './session-manager.js'"

- [ ] **Step 3: Implement `session-manager.ts`**

```ts
// packages/core/src/session-manager.ts
import type { AnswerMap } from './types.js';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export interface SessionProgress {
  currentPageId: string;
  answers: AnswerMap;
}

const KEY_SESSION = 'car:session-id';
const keyProgress = (id: string) => `car:progress:${id}`;
const keyInput = (sessionId: string, questionId: string) =>
  `car:input:${sessionId}:${questionId}`;

export class SessionManager {
  private readonly sessionId: string;
  private readonly available: boolean;

  constructor(private readonly storage: StorageBackend = globalThis.localStorage) {
    this.available = this.checkStorage();
    this.sessionId = this.loadOrCreateSessionId();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  get isStorageAvailable(): boolean {
    return this.available;
  }

  saveProgress(currentPageId: string, answers: AnswerMap): void {
    if (!this.available) return;
    this.storage.setItem(keyProgress(this.sessionId), JSON.stringify({ currentPageId, answers }));
  }

  loadProgress(): SessionProgress | null {
    if (!this.available) return null;
    const raw = this.storage.getItem(keyProgress(this.sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionProgress;
    } catch {
      return null;
    }
  }

  saveInput(questionId: string, value: string | string[]): void {
    if (!this.available) return;
    this.storage.setItem(keyInput(this.sessionId, questionId), JSON.stringify(value));
  }

  loadInput(questionId: string): string | string[] | null {
    if (!this.available) return null;
    const raw = this.storage.getItem(keyInput(this.sessionId, questionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as string | string[];
    } catch {
      return null;
    }
  }

  clearAll(): void {
    if (!this.available) return;
    const progressKey = keyProgress(this.sessionId);
    const inputPrefix = `car:input:${this.sessionId}:`;
    const keysToRemove: string[] = [progressKey];

    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k?.startsWith(inputPrefix)) keysToRemove.push(k);
    }

    for (const k of keysToRemove) {
      this.storage.removeItem(k);
    }
  }

  private loadOrCreateSessionId(): string {
    if (!this.available) return crypto.randomUUID();
    const existing = this.storage.getItem(KEY_SESSION);
    if (existing) return existing;
    const id = crypto.randomUUID();
    this.storage.setItem(KEY_SESSION, id);
    return id;
  }

  private checkStorage(): boolean {
    try {
      const probe = '__car_probe__';
      this.storage.setItem(probe, '1');
      this.storage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/core && bun run test -- session-manager`

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/session-manager.ts packages/core/src/session-manager.test.ts
git commit -m "feat(core): add SessionManager with injectable storage backend"
```

---

## Task 6: Adapters

**Files:**
- Create: `packages/core/src/adapters/identity-input-adapter.ts`
- Create: `packages/core/src/adapters/browser-event-adapter.ts`
- Create: `packages/core/src/adapters/console-error-adapter.ts`
- Create: `packages/core/src/adapters/index.ts`
- Create: `packages/core/src/adapters/adapters.test.ts`

**Interfaces:**
- Consumes: `InputAdapter`, `OutputAdapter`, `ErrorLogAdapter`, `ChatEvent`, `ChatError` from `../types.js`
- Produces: three concrete adapter classes

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/adapters/adapters.test.ts
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
    vi.spyOn(document, 'dispatchEvent').mockImplementation((e) => {
      dispatched.push(e as CustomEvent);
      return true;
    });
    adapter = new BrowserEventAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/core && bun run test -- adapters`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement the three adapters**

```ts
// packages/core/src/adapters/identity-input-adapter.ts
import type { InputAdapter } from '../types.js';

export class IdentityInputAdapter implements InputAdapter {
  transform(raw: unknown): unknown {
    return raw;
  }
}
```

```ts
// packages/core/src/adapters/browser-event-adapter.ts
import type { OutputAdapter, ChatEvent } from '../types.js';

export class BrowserEventAdapter implements OutputAdapter {
  emit(event: ChatEvent): void {
    const name = event.type === 'page:submit' ? 'chat-page-submit' : 'chat-form-complete';
    document.dispatchEvent(new CustomEvent(name, { detail: event, bubbles: true }));
  }
}
```

```ts
// packages/core/src/adapters/console-error-adapter.ts
import type { ErrorLogAdapter, ChatError } from '../types.js';

export class ConsoleErrorAdapter implements ErrorLogAdapter {
  log(error: ChatError): void {
    console.error('[chat-and-react]', error);
  }
}
```

```ts
// packages/core/src/adapters/index.ts
export { IdentityInputAdapter } from './identity-input-adapter.js';
export { BrowserEventAdapter } from './browser-event-adapter.js';
export { ConsoleErrorAdapter } from './console-error-adapter.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/core && bun run test -- adapters`

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/adapters/
git commit -m "feat(core): add built-in adapter implementations"
```

---

## Task 7: ChatController

**Files:**
- Create: `packages/core/src/chat-controller.ts`
- Create: `packages/core/src/chat-controller.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: all prior core modules
- Produces:
  ```ts
  class ChatController {
    constructor(config: ChatControllerConfig, sessionManager?: SessionManager)
    start(): void
    getCurrentPage(): ChatPage | null
    getVisibleQuestions(): ChatQuestion[]
    getOptions(): ChatOptions
    submitPage(pageAnswers: AnswerMap): void
    on(event: 'page:submit' | 'form:complete', listener: (e: ChatEvent) => void): void
    off(event: 'page:submit' | 'form:complete', listener: (e: ChatEvent) => void): void
    destroy(): void
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/chat-controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatController } from './chat-controller.js';
import { SessionManager } from './session-manager.js';
import type { ChatControllerConfig, ChatEvent, OutputAdapter, ErrorLogAdapter } from './types.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/core && bun run test -- chat-controller`

Expected: FAIL with "Cannot find module './chat-controller.js'"

- [ ] **Step 3: Implement `chat-controller.ts`**

```ts
// packages/core/src/chat-controller.ts
import type {
  ChatControllerConfig,
  ChatOptions,
  ChatSchema,
  ChatPage,
  ChatQuestion,
  AnswerMap,
  ChatEvent,
  ChatError,
} from './types.js';
import { parseSchema } from './schema-parser.js';
import { RuleEngine } from './rule-engine.js';
import { SessionManager } from './session-manager.js';
import { IdentityInputAdapter } from './adapters/identity-input-adapter.js';
import { BrowserEventAdapter } from './adapters/browser-event-adapter.js';
import { ConsoleErrorAdapter } from './adapters/console-error-adapter.js';

type EventName = 'page:submit' | 'form:complete';
type Listener = (event: ChatEvent) => void;

const DEFAULT_OPTIONS: ChatOptions = {
  userResumable: true,
  localStorage: true,
  autoComplete: true,
};

export class ChatController {
  private schema: ChatSchema | null = null;
  private options: ChatOptions = { ...DEFAULT_OPTIONS };
  private readonly config: Required<ChatControllerConfig>;
  private readonly session: SessionManager;
  private readonly ruleEngine = new RuleEngine();
  private currentPage: ChatPage | null = null;
  private allAnswers: AnswerMap = {};
  private visitIndex = 0;
  private readonly listeners = new Map<EventName, Set<Listener>>();

  constructor(config: ChatControllerConfig, sessionManager?: SessionManager) {
    this.config = {
      inputAdapter: config.inputAdapter ?? new IdentityInputAdapter(),
      outputAdapter: config.outputAdapter ?? new BrowserEventAdapter(),
      errorAdapter: config.errorAdapter ?? new ConsoleErrorAdapter(),
      schema: config.schema,
    };
    this.session = sessionManager ?? new SessionManager();
  }

  start(): void {
    let raw: unknown;
    try {
      raw = this.config.inputAdapter.transform(this.config.schema);
    } catch (cause) {
      this.handleFatal({ code: 'ADAPTER_ERROR', message: 'InputAdapter.transform() threw', cause });
    }

    try {
      this.schema = parseSchema(raw!);
    } catch (e) {
      this.handleFatal(e as ChatError);
    }

    if (!this.session.isStorageAvailable) {
      this.config.errorAdapter.log({
        code: 'STORAGE_UNAVAILABLE',
        message: 'localStorage unavailable; running in memory-only mode',
      });
    }

    const schemaOpts = this.schema!['x-chat-options'] ?? {};
    this.options = {
      userResumable: schemaOpts.userResumable ?? DEFAULT_OPTIONS.userResumable,
      localStorage: schemaOpts.localStorage ?? DEFAULT_OPTIONS.localStorage,
      autoComplete: schemaOpts.autoComplete ?? DEFAULT_OPTIONS.autoComplete,
    };

    if (this.options.userResumable) {
      const saved = this.session.loadProgress();
      if (saved) {
        const page = this.schema!['x-chat-pages'].find((p) => p.id === saved.currentPageId);
        if (page) {
          this.allAnswers = saved.answers;
          this.currentPage = page;
          return;
        }
      }
    }

    this.currentPage = this.schema!['x-chat-pages'][0];
  }

  getCurrentPage(): ChatPage | null {
    return this.currentPage;
  }

  getVisibleQuestions(): ChatQuestion[] {
    if (!this.currentPage) return [];
    return this.currentPage.questions.filter((q) => this.isQuestionVisible(q));
  }

  getOptions(): ChatOptions {
    return { ...this.options };
  }

  submitPage(pageAnswers: AnswerMap): void {
    if (!this.currentPage || !this.schema) return;

    this.allAnswers = { ...this.allAnswers, ...pageAnswers };
    const pageId = this.currentPage.id;
    const currentVisitIndex = this.visitIndex;
    const nextPageId = this.resolveBranching(this.currentPage, this.allAnswers);

    if (this.options.userResumable) {
      const progressPageId =
        nextPageId === '**FORM_COMPLETED**' ? pageId : nextPageId;
      this.session.saveProgress(progressPageId, this.allAnswers);

      const submitEvent: ChatEvent = {
        type: 'page:submit',
        sessionId: this.session.getSessionId(),
        pageId,
        visitIndex: currentVisitIndex,
        answers: pageAnswers,
      };
      this.safeEmit(submitEvent);
      this.emit('page:submit', submitEvent);
    }

    this.visitIndex++;

    if (nextPageId === '**FORM_COMPLETED**') {
      this.session.clearAll();
      const completeEvent: ChatEvent = {
        type: 'form:complete',
        sessionId: this.session.getSessionId(),
        allAnswers: this.allAnswers,
      };
      this.safeEmit(completeEvent);
      this.emit('form:complete', completeEvent);
      this.currentPage = null;
    } else {
      this.currentPage = this.schema!['x-chat-pages'].find((p) => p.id === nextPageId) ?? null;
    }
  }

  on(event: EventName, listener: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: EventName, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  destroy(): void {
    this.listeners.clear();
    this.currentPage = null;
    this.schema = null;
  }

  private isQuestionVisible(question: ChatQuestion): boolean {
    const condition = question['x-chat-condition'];
    if (!condition) return true;

    const rules = this.schema?.['x-chat-rules'] ?? {};
    let rule: Record<string, unknown>;

    if ('ref' in condition && typeof (condition as { ref?: unknown }).ref === 'string') {
      const ref = (condition as { ref: string }).ref;
      rule = rules[ref];
      if (!rule) return false;
    } else {
      rule = condition as Record<string, unknown>;
    }

    try {
      return this.ruleEngine.evaluate(rule, this.allAnswers);
    } catch (e) {
      this.config.errorAdapter.log(e as ChatError);
      return false;
    }
  }

  private resolveBranching(page: ChatPage, answers: AnswerMap): string {
    for (const rule of page.branching) {
      if (rule.type === 'always') return rule.destination_id;
      if (rule.type === 'if' && answers[rule.form_element] === rule.value) {
        return rule.destination_id;
      }
    }
    return '**FORM_COMPLETED**';
  }

  private safeEmit(event: ChatEvent): void {
    try {
      this.config.outputAdapter.emit(event);
    } catch (cause) {
      this.config.errorAdapter.log({
        code: 'ADAPTER_ERROR',
        message: `OutputAdapter.emit() threw for ${event.type}`,
        cause,
      });
    }
  }

  private emit(event: EventName, payload: ChatEvent): void {
    this.listeners.get(event)?.forEach((l) => l(payload));
  }

  private handleFatal(error: ChatError): never {
    this.config.errorAdapter.log(error);
    throw error;
  }
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

```ts
// packages/core/src/index.ts
export * from './types.js';
export { parseSchema } from './schema-parser.js';
export { RuleEngine } from './rule-engine.js';
export { SessionManager } from './session-manager.js';
export type { StorageBackend, SessionProgress } from './session-manager.js';
export { ChatController } from './chat-controller.js';
export { IdentityInputAdapter } from './adapters/identity-input-adapter.js';
export { BrowserEventAdapter } from './adapters/browser-event-adapter.js';
export { ConsoleErrorAdapter } from './adapters/console-error-adapter.js';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/core && bun run test -- chat-controller`

Expected: all 14 tests PASS.

- [ ] **Step 6: Run all core tests**

Run: `cd packages/core && bun run test`

Expected: all tests across all files PASS.

- [ ] **Step 7: Typecheck core**

Run: `cd packages/core && bun run typecheck`

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/chat-controller.ts packages/core/src/chat-controller.test.ts packages/core/src/index.ts
git commit -m "feat(core): add ChatController with page-graph navigation"
```

---

## Task 8: Web Package — AdapterRegistry

**Files:**
- Create: `packages/web/src/adapter-registry.ts`
- Create: `packages/web/src/adapter-registry.test.ts`
- Create: `packages/web/src/index.ts` (skeleton)

**Interfaces:**
- Consumes: `InputAdapter`, `OutputAdapter`, `ErrorLogAdapter` from `@chat-and-react/core`
- Produces:
  ```ts
  const AdapterRegistry: {
    register(key: string, adapter: InputAdapter | OutputAdapter | ErrorLogAdapter): void;
    get(key: string): InputAdapter | OutputAdapter | ErrorLogAdapter | undefined;
    clear(): void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/web/src/adapter-registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';
import type { OutputAdapter } from '@chat-and-react/core';

describe('AdapterRegistry', () => {
  beforeEach(() => AdapterRegistry.clear());

  it('returns undefined for an unregistered key', () => {
    expect(AdapterRegistry.get('missing')).toBeUndefined();
  });

  it('returns a registered adapter by key', () => {
    const adapter: OutputAdapter = { emit: () => {} };
    AdapterRegistry.register('my-output', adapter);
    expect(AdapterRegistry.get('my-output')).toBe(adapter);
  });

  it('overwrites an existing registration', () => {
    const a1: OutputAdapter = { emit: () => {} };
    const a2: OutputAdapter = { emit: () => {} };
    AdapterRegistry.register('key', a1);
    AdapterRegistry.register('key', a2);
    expect(AdapterRegistry.get('key')).toBe(a2);
  });

  it('clear() removes all registrations', () => {
    AdapterRegistry.register('k', { emit: () => {} });
    AdapterRegistry.clear();
    expect(AdapterRegistry.get('k')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/web && bun run test -- adapter-registry`

Expected: FAIL with "Cannot find module './adapter-registry.js'"

- [ ] **Step 3: Implement `adapter-registry.ts`**

```ts
// packages/web/src/adapter-registry.ts
import type { InputAdapter, OutputAdapter, ErrorLogAdapter } from '@chat-and-react/core';

type AnyAdapter = InputAdapter | OutputAdapter | ErrorLogAdapter;

const registry = new Map<string, AnyAdapter>();

export const AdapterRegistry = {
  register(key: string, adapter: AnyAdapter): void {
    registry.set(key, adapter);
  },
  get(key: string): AnyAdapter | undefined {
    return registry.get(key);
  },
  clear(): void {
    registry.clear();
  },
};
```

- [ ] **Step 4: Create `packages/web/src/index.ts` skeleton**

```ts
// packages/web/src/index.ts
export { AdapterRegistry } from './adapter-registry.js';
// ChatFormElement registration added in Task 10
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/web && bun run test -- adapter-registry`

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/adapter-registry.ts packages/web/src/adapter-registry.test.ts packages/web/src/index.ts
git commit -m "feat(web): add AdapterRegistry for custom adapter lookup"
```

---

## Task 9: Styles and Renderer

**Files:**
- Create: `packages/web/src/styles.ts`
- Create: `packages/web/src/renderer.ts`

**Interfaces:**
- Consumes: `ChatQuestion`, `ChatInputType` from `@chat-and-react/core`
- Produces:
  ```ts
  function getStyles(): string
  function appendBotBubble(container: Element, text: string): void
  function appendUserBubble(container: Element, text: string): void
  function renderInputWidget(
    container: Element,
    question: ChatQuestion,
    autoComplete: boolean,
    onSubmit: (value: string | string[]) => void,
  ): void
  function removeInputWidget(container: Element): void
  ```

- [ ] **Step 1: Implement `styles.ts`**

(No TDD for pure style strings — verify visually in Task 10 integration tests instead.)

```ts
// packages/web/src/styles.ts
export function getStyles(): string {
  return `
    :host {
      display: block;
      font-family: var(--chat-font, system-ui, sans-serif);
      height: 100%;
    }
    [part="container"] {
      background: var(--chat-bg, #f5f5f5);
      padding: var(--chat-spacing, 1rem);
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }
    [part="message-list"] {
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing, 1rem);
    }
    [part="bubble-bot"] {
      background: var(--chat-bot-bubble-bg, #ffffff);
      border-radius: var(--chat-radius, 1rem);
      padding: 0.75rem 1rem;
      max-width: 80%;
      align-self: flex-start;
    }
    [part="bubble-user"] {
      background: var(--chat-user-bubble-bg, #0084ff);
      color: white;
      border-radius: var(--chat-radius, 1rem);
      padding: 0.75rem 1rem;
      max-width: 80%;
      align-self: flex-end;
    }
    [part="input-area"] {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }
    [part="submit-btn"] {
      background: var(--chat-accent, #0084ff);
      color: white;
      border: none;
      border-radius: calc(var(--chat-radius, 1rem) / 2);
      padding: 0.5rem 1.25rem;
      cursor: pointer;
      align-self: flex-start;
      font: inherit;
    }
    [part="submit-btn"]:focus-visible {
      outline: 2px solid var(--chat-accent, #0084ff);
      outline-offset: 2px;
    }
    input[type="text"], textarea, select {
      border: 1px solid #ddd;
      border-radius: 0.5rem;
      padding: 0.5rem;
      font: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
  `;
}
```

- [ ] **Step 2: Implement `renderer.ts`**

```ts
// packages/web/src/renderer.ts
import type { ChatQuestion } from '@chat-and-react/core';

export function appendBotBubble(container: Element, text: string): void {
  const div = document.createElement('div');
  div.setAttribute('part', 'bubble-bot');
  div.textContent = text;
  container.appendChild(div);
}

export function appendUserBubble(container: Element, text: string): void {
  const div = document.createElement('div');
  div.setAttribute('part', 'bubble-user');
  div.textContent = text;
  container.appendChild(div);
}

export function removeInputWidget(container: Element): void {
  container.querySelector('[part="input-area"]')?.remove();
}

export function renderInputWidget(
  container: Element,
  question: ChatQuestion,
  autoComplete: boolean,
  onSubmit: (value: string | string[]) => void,
): void {
  const area = document.createElement('div');
  area.setAttribute('part', 'input-area');

  const inputEl = buildInputElement(question, autoComplete);
  area.appendChild(inputEl);

  const btn = document.createElement('button');
  btn.setAttribute('part', 'submit-btn');
  btn.textContent = 'Send';
  btn.addEventListener('click', () => {
    const value = extractValue(inputEl, question['x-chat-input']);
    onSubmit(value);
  });
  area.appendChild(btn);

  container.appendChild(area);
}

function buildInputElement(question: ChatQuestion, autoComplete: boolean): Element {
  const acAttr = autoComplete ? 'on' : 'off';

  switch (question['x-chat-input']) {
    case 'text': {
      const el = document.createElement('input');
      el.type = 'text';
      el.autocomplete = acAttr;
      if (question['x-chat-placeholder']) el.placeholder = question['x-chat-placeholder'];
      return el;
    }
    case 'textarea': {
      const el = document.createElement('textarea');
      el.autocomplete = acAttr;
      if (question['x-chat-placeholder']) el.placeholder = question['x-chat-placeholder'];
      return el;
    }
    case 'dropdown': {
      const el = document.createElement('select');
      el.autocomplete = acAttr;
      for (const opt of question.enum ?? []) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        el.appendChild(option);
      }
      return el;
    }
    case 'radio':
    case 'checkbox': {
      const wrap = document.createElement('div');
      const type = question['x-chat-input'];
      const opts = type === 'checkbox' ? (question.items?.enum ?? question.enum ?? []) : (question.enum ?? []);
      for (const opt of opts) {
        const label = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = type;
        inp.name = question.id;
        inp.value = opt;
        label.appendChild(inp);
        label.append(` ${opt}`);
        wrap.appendChild(label);
      }
      return wrap;
    }
  }
}

function extractValue(inputEl: Element, type: ChatQuestion['x-chat-input']): string | string[] {
  switch (type) {
    case 'text':
      return (inputEl as HTMLInputElement).value;
    case 'textarea':
      return (inputEl as HTMLTextAreaElement).value;
    case 'dropdown':
      return (inputEl as HTMLSelectElement).value;
    case 'radio': {
      const checked = inputEl.querySelector('input[type="radio"]:checked') as HTMLInputElement | null;
      return checked?.value ?? '';
    }
    case 'checkbox': {
      const checked = inputEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
      return Array.from(checked).map((el) => el.value);
    }
  }
}
```

- [ ] **Step 3: Typecheck web package**

Run: `cd packages/web && bun run typecheck`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/styles.ts packages/web/src/renderer.ts
git commit -m "feat(web): add Shadow DOM styles and renderer helpers"
```

---

## Task 10: ChatFormElement Web Component

**Files:**
- Create: `packages/web/src/chat-form-element.ts`
- Create: `packages/web/src/chat-form-element.test.ts`
- Modify: `packages/web/src/index.ts`

**Interfaces:**
- Consumes: `ChatController`, `ChatPage`, `ChatQuestion` from `@chat-and-react/core`; `AdapterRegistry`; `appendBotBubble`, `appendUserBubble`, `removeInputWidget`, `renderInputWidget`; `getStyles`
- Produces: `<chat-form>` custom element registered as `customElements.define('chat-form', ChatFormElement)`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/web/src/chat-form-element.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js'; // registers <chat-form>

const minimalSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [{
    id: 'p1',
    title: 'Page One',
    questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'What is your name?' }],
    branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
  }],
});

const twoPageSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [
    {
      id: 'p1', title: 'P1',
      questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Pick?', enum: ['A', 'B'] }],
      branching: [
        { type: 'if', form_element: 'q1', value: 'A', destination_id: 'p2' },
        { type: 'always', destination_id: '**FORM_COMPLETED**' },
      ],
    },
    {
      id: 'p2', title: 'P2',
      questions: [{ id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Tell us more' }],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    },
  ],
});

function mount(schema: string): HTMLElement {
  const el = document.createElement('chat-form');
  el.setAttribute('schema', schema);
  document.body.appendChild(el);
  return el;
}

function getShadow(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

describe('<chat-form>', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  it('renders a bot bubble for the first question on connect', () => {
    el = mount(minimalSchema);
    const bubble = getShadow(el).querySelector('[part="bubble-bot"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toBe('What is your name?');
  });

  it('renders an input-area with a submit button', () => {
    el = mount(minimalSchema);
    const btn = getShadow(el).querySelector('[part="submit-btn"]');
    expect(btn).not.toBeNull();
  });

  it('renders a user bubble after submit and removes input-area', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const input = shadow.querySelector('input') as HTMLInputElement;
    input.value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    const userBubble = shadow.querySelector('[part="bubble-user"]');
    expect(userBubble?.textContent).toBe('Alice');
    expect(shadow.querySelector('[part="input-area"]')).toBeNull();
  });

  it('fires chat-form-complete after final answer on single-page form', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const events: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => events.push(e as CustomEvent));
    (shadow.querySelector('input') as HTMLInputElement).value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    expect(events).toHaveLength(1);
    expect(events[0].detail.allAnswers).toEqual({ q1: 'Alice' });
  });

  it('fires chat-page-submit before navigating to next page', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const pageEvents: CustomEvent[] = [];
    el.addEventListener('chat-page-submit', (e) => pageEvents.push(e as CustomEvent));
    const radio = shadow.querySelector('input[value="A"]') as HTMLInputElement;
    radio.checked = true;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    expect(pageEvents).toHaveLength(1);
    expect(pageEvents[0].detail.pageId).toBe('p1');
  });

  it('renders next page question after navigating', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const radio = shadow.querySelector('input[value="A"]') as HTMLInputElement;
    radio.checked = true;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    const bubbles = shadow.querySelectorAll('[part="bubble-bot"]');
    expect(bubbles.length).toBeGreaterThanOrEqual(2);
    expect(bubbles[1].textContent).toBe('Tell us more');
  });

  it('dispatches chat-error for invalid schema JSON', () => {
    el = document.createElement('chat-form');
    el.setAttribute('schema', 'not-json');
    const errors: CustomEvent[] = [];
    el.addEventListener('chat-error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    expect(errors).toHaveLength(1);
    expect(errors[0].detail.code).toBe('SCHEMA_INVALID');
  });

  it('exposes CSS parts on shadow DOM elements', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    expect(shadow.querySelector('[part="container"]')).not.toBeNull();
    expect(shadow.querySelector('[part="message-list"]')).not.toBeNull();
    expect(shadow.querySelector('[part="bubble-bot"]')).not.toBeNull();
    expect(shadow.querySelector('[part="input-area"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/web && bun run test -- chat-form-element`

Expected: FAIL with "Cannot find module './index.js'"

- [ ] **Step 3: Implement `chat-form-element.ts`**

```ts
// packages/web/src/chat-form-element.ts
import { ChatController } from '@chat-and-react/core';
import type { ChatQuestion, ChatEvent } from '@chat-and-react/core';
import { AdapterRegistry } from './adapter-registry.js';
import {
  appendBotBubble,
  appendUserBubble,
  removeInputWidget,
  renderInputWidget,
} from './renderer.js';
import { getStyles } from './styles.js';

export class ChatFormElement extends HTMLElement {
  static observedAttributes = [
    'schema',
    'user-resumable',
    'local-storage',
    'auto-complete',
    'input-adapter',
    'output-adapter',
    'error-adapter',
  ];

  private controller: ChatController | null = null;
  private messageList: Element | null = null;
  private pageAnswers: Record<string, string | string[]> = {};

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${getStyles()}</style>
      <div part="container">
        <div part="message-list"></div>
      </div>
    `;
    this.messageList = shadow.querySelector('[part="message-list"]')!;
    this.initController();
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
    this.controller = null;
  }

  private initController(): void {
    const schemaAttr = this.getAttribute('schema');
    if (!schemaAttr) return;

    let schema: unknown;
    try {
      schema = JSON.parse(schemaAttr);
    } catch {
      this.dispatchEvent(
        new CustomEvent('chat-error', {
          detail: { code: 'SCHEMA_INVALID', message: 'schema attribute is not valid JSON' },
          bubbles: true,
        }),
      );
      return;
    }

    const inputAdapterKey = this.getAttribute('input-adapter');
    const outputAdapterKey = this.getAttribute('output-adapter');
    const errorAdapterKey = this.getAttribute('error-adapter');

    this.controller = new ChatController({
      schema,
      inputAdapter: inputAdapterKey
        ? (AdapterRegistry.get(inputAdapterKey) as import('@chat-and-react/core').InputAdapter)
        : undefined,
      outputAdapter: outputAdapterKey
        ? (AdapterRegistry.get(outputAdapterKey) as import('@chat-and-react/core').OutputAdapter)
        : undefined,
      errorAdapter: errorAdapterKey
        ? (AdapterRegistry.get(errorAdapterKey) as import('@chat-and-react/core').ErrorLogAdapter)
        : undefined,
    });

    this.controller.on('page:submit', (e: ChatEvent) => {
      this.dispatchEvent(new CustomEvent('chat-page-submit', { detail: e, bubbles: true }));
    });

    this.controller.on('form:complete', (e: ChatEvent) => {
      this.dispatchEvent(new CustomEvent('chat-form-complete', { detail: e, bubbles: true }));
    });

    try {
      this.controller.start();
    } catch (e) {
      this.dispatchEvent(new CustomEvent('chat-error', { detail: e, bubbles: true }));
      return;
    }

    this.renderCurrentPage();
  }

  private renderCurrentPage(): void {
    if (!this.controller || !this.messageList) return;
    if (!this.controller.getCurrentPage()) return;

    this.pageAnswers = {};
    const questions = this.controller.getVisibleQuestions();
    this.renderQuestion(questions, 0);
  }

  private renderQuestion(questions: ChatQuestion[], index: number): void {
    if (!this.controller || !this.messageList) return;

    if (index >= questions.length) {
      this.controller.submitPage(this.pageAnswers);
      if (this.controller.getCurrentPage()) {
        this.renderCurrentPage();
      }
      return;
    }

    const question = questions[index];
    appendBotBubble(this.messageList, question.title);
    renderInputWidget(
      this.messageList,
      question,
      this.controller.getOptions().autoComplete,
      (value) => {
        removeInputWidget(this.messageList!);
        const display = Array.isArray(value) ? value.join(', ') : value;
        appendUserBubble(this.messageList!, display);
        this.pageAnswers[question.id] = value;
        this.renderQuestion(questions, index + 1);
      },
    );
  }
}
```

- [ ] **Step 4: Update `packages/web/src/index.ts`**

```ts
// packages/web/src/index.ts
export { AdapterRegistry } from './adapter-registry.js';

import { ChatFormElement } from './chat-form-element.js';

if (!customElements.get('chat-form')) {
  customElements.define('chat-form', ChatFormElement);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/web && bun run test -- chat-form-element`

Expected: all 8 tests PASS.

- [ ] **Step 6: Run all web tests**

Run: `cd packages/web && bun run test`

Expected: all tests PASS.

- [ ] **Step 7: Typecheck web**

Run: `cd packages/web && bun run typecheck`

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/chat-form-element.ts packages/web/src/chat-form-element.test.ts packages/web/src/index.ts
git commit -m "feat(web): add <chat-form> custom element"
```

---

## Task 11: Build Verification

**Files:**
- No new files — verifies dist output from both packages

**Interfaces:**
- Consumes: all prior tasks
- Produces: verified dist artifacts for npm and CDN

- [ ] **Step 1: Build core**

Run: `cd packages/core && bun run build`

Expected output:
```
dist/index.mjs   (ESM)
dist/index.cjs   (CJS)
dist/index.d.ts  (types)
```

- [ ] **Step 2: Build web**

Run: `cd packages/web && bun run build`

Expected output:
```
dist/index.mjs          (ESM)
dist/index.cjs          (CJS)
dist/index.d.ts         (types)
dist/index.iife.js      (CDN bundle)
```

- [ ] **Step 3: Verify IIFE exports global**

Run: `node -e "const fs = require('fs'); const src = fs.readFileSync('packages/web/dist/index.iife.js', 'utf8'); console.log(src.includes('ChatAndReact') ? 'PASS' : 'FAIL')"`

Expected: `PASS`

- [ ] **Step 4: Run full test suite from root**

Run: `bun run test`

Expected: all tests from both packages PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/dist/ packages/web/dist/
echo "dist/" >> .gitignore
git add .gitignore
git commit -m "chore: verify build artifacts and add dist to .gitignore"
```

Note: After this commit, remove `packages/core/dist/` and `packages/web/dist/` from git tracking if they were accidentally committed — dist should be in `.gitignore` and rebuilt by CI.

---

## Self-Review Notes

**Spec coverage check:**
- §1 Overview — covered by Task 1 (monorepo scaffold, dual output)
- §2 Architecture — covered by Tasks 1–10 (two-package split, ChatController as bridge)
- §3 Schema Format — covered by Tasks 2–3 (types + SchemaParser); branching model in Task 7
- §4.1 ChatController — covered by Task 7
- §4.2 SchemaParser — covered by Task 3
- §4.3 RuleEngine — covered by Task 4
- §4.4 SessionManager — covered by Task 5
- §4.5 Adapters — covered by Task 6
- §4.6 Event Payloads — types in Task 2, fired in Task 7
- §4.7 Error Types — types in Task 2; fatal/non-fatal handling in Task 7
- §5.1 Element Registration — covered by Task 10
- §5.2 Attributes — covered by Task 10 (`ChatFormElement.observedAttributes`)
- §5.3 Shadow DOM Structure — covered by Task 10 (`connectedCallback` template)
- §5.4 CSS Custom Properties — covered by Task 9 (`styles.ts`)
- §5.5 DOM Events — covered by Task 10 (`chat-page-submit`, `chat-form-complete`, `chat-error`)
- §6 Build & Distribution — covered by Tasks 1 and 11
- §7 Testing Strategy — unit tests in Tasks 3–7, integration tests in Task 10
- §8 Deferred — complex branching, URL fetching, a11y, animation: none of these are implemented ✓
