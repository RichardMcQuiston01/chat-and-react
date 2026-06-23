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
