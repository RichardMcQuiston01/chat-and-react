import type {
  ErrorLogAdapter as BaseErrorLogAdapter,
  ErrorLogEntry,
  ErrorLogResult,
} from '@richardmcquiston01/error-log-adapter';

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
  /**
   * Shows a "thinking" bubble before this question appears, so the conversation
   * feels less abrupt. A number is the delay in milliseconds (0 turns it off for
   * this question). An object can also set the text shown instead of the dots.
   * Overrides the `thinkingDelay` and `thinkingText` options.
   */
  'x-chat-thinking'?: number | { delay?: number; text?: string };
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

/** How a bubble leaves the screen when it is hidden: fade out, shrink away ("pop"), or vanish at once. */
export type HideAnimation = 'fade' | 'pop' | 'none';

export interface ChatOptions {
  userResumable: boolean;
  localStorage: boolean;
  autoComplete: boolean;
  /** Show an Edit icon on answered questions so users can change their answers. */
  allowEdit: boolean;
  /** Milliseconds to wait before hiding an answered question bubble. 0 keeps them visible. */
  autoHideQuestions: number;
  /** Milliseconds to wait before hiding an answer bubble once its question is answered. 0 keeps them visible. */
  autoHideAnswers: number;
  /** How hidden bubbles leave the screen. */
  hideAnimation: HideAnimation;
  /** Milliseconds per character when question text is "typed" onto the screen. 0 shows it at once. */
  typingSpeed: number;
  /** Milliseconds to show a "thinking" bubble before each question. 0 turns it off. */
  thinkingDelay: number;
  /** Text for the thinking bubble. Empty shows animated dots. */
  thinkingText: string;
  /** Show an icon on the Continue button. */
  showContinueIcon: boolean;
}

export interface ChatSchema {
  $schema?: string;
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
  /** Present and true when the user re-submitted a page they had already answered. */
  edited?: boolean;
}

/** One page the user has submitted, in the order they visited it. */
export interface RouteEntry {
  pageId: string;
  answers: AnswerMap;
}

/**
 * What happened to the form after `submitPage`:
 * - `advanced`: a normal submit; the form moved to the next page or completed.
 * - `edit-resumed`: an earlier page was edited and the route is unchanged, so the
 *   form is back on the page the user was on.
 * - `edit-rerouted`: an earlier page was edited and its branching now leads
 *   somewhere else. Later pages were dropped and the form moved to the new page.
 */
export type SubmitOutcome = 'advanced' | 'edit-resumed' | 'edit-rerouted';

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

export type ChatError = ErrorLogEntry<ChatErrorCode>;

export interface InputAdapter {
  transform(raw: unknown): unknown;
}

export interface OutputAdapter {
  emit(event: ChatEvent): void;
}

/**
 * Routes `ChatError`s to a sink. `log` returns a result instead of throwing, so the
 * caller can check `ok`. See `@richardmcquiston01/error-log-adapter`.
 */
export type ErrorLogAdapter = BaseErrorLogAdapter<ChatErrorCode>;

export type { ErrorLogEntry, ErrorLogResult };

export interface ChatControllerConfig {
  schema: unknown;
  inputAdapter?: InputAdapter;
  outputAdapter?: OutputAdapter;
  errorAdapter?: ErrorLogAdapter;
  /**
   * Option values that win over the schema's `x-chat-options`, for example ones
   * read from element attributes.
   */
  options?: Partial<ChatOptions>;
}
