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

/**
 * Central orchestrator for the chat-and-react form flow.
 * Drives page navigation, branching, session persistence, and event emission.
 */
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

  /**
   * @param config - Controller configuration including schema and optional adapters.
   * @param sessionManager - Optional session manager for test injection.
   */
  constructor(config: ChatControllerConfig, sessionManager?: SessionManager) {
    this.config = {
      inputAdapter: config.inputAdapter ?? new IdentityInputAdapter(),
      outputAdapter: config.outputAdapter ?? new BrowserEventAdapter(),
      errorAdapter: config.errorAdapter ?? new ConsoleErrorAdapter(),
      schema: config.schema,
    };
    this.session = sessionManager ?? new SessionManager();
  }

  /**
   * Initialises the controller: parses the schema, resolves options,
   * restores any saved session, and positions to the first page.
   */
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

  /**
   * Returns the page currently being presented to the user, or null if complete.
   */
  getCurrentPage(): ChatPage | null {
    return this.currentPage;
  }

  /**
   * Returns the subset of questions on the current page that pass their
   * `x-chat-condition` rule (if any). Questions without a condition are always visible.
   */
  getVisibleQuestions(): ChatQuestion[] {
    if (!this.currentPage) return [];
    return this.currentPage.questions.filter((q) => this.isQuestionVisible(q));
  }

  /**
   * Returns the resolved options for the current session (schema options merged with defaults).
   */
  getOptions(): ChatOptions {
    return { ...this.options };
  }

  /**
   * Submits the answers for the current page and advances the session.
   * - Accumulates answers into `allAnswers`.
   * - Emits `page:submit` (suppressed when `userResumable` is false).
   * - Resolves branching to find the next page.
   * - Emits `form:complete` and clears session when `**FORM_COMPLETED**` is reached.
   *
   * @param pageAnswers - Answers collected for the current page.
   */
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
      this.currentPage =
        this.schema!['x-chat-pages'].find((p) => p.id === nextPageId) ?? null;
    }
  }

  /**
   * Registers an event listener for the given event type.
   *
   * @param event - The event to listen for.
   * @param listener - The callback to invoke when the event fires.
   */
  on(event: EventName, listener: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Removes a previously registered event listener.
   *
   * @param event - The event type to deregister from.
   * @param listener - The specific listener to remove.
   */
  off(event: EventName, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Tears down the controller: removes all listeners and nulls internal state.
   */
  destroy(): void {
    this.listeners.clear();
    this.currentPage = null;
    this.schema = null;
  }

  /**
   * Evaluates whether a question should be shown based on its `x-chat-condition`.
   * Returns true when no condition is present. On evaluation failure, logs and returns false.
   */
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

  /**
   * Walks the branching rules top-to-bottom. Returns the first match's destination_id.
   * Falls back to `**FORM_COMPLETED**` if nothing matches (should not happen with valid schemas).
   */
  private resolveBranching(page: ChatPage, answers: AnswerMap): string {
    for (const rule of page.branching) {
      if (rule.type === 'always') return rule.destination_id;
      if (rule.type === 'if' && answers[rule.form_element] === rule.value) {
        return rule.destination_id;
      }
    }
    return '**FORM_COMPLETED**';
  }

  /**
   * Calls `outputAdapter.emit()` and swallows adapter errors (logging them instead).
   */
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

  /**
   * Notifies all registered listeners for the given event.
   */
  private emit(event: EventName, payload: ChatEvent): void {
    this.listeners.get(event)?.forEach((l) => l(payload));
  }

  /**
   * Logs the error via the error adapter and then throws it.
   * Used for unrecoverable errors (schema invalid, adapter failure on start).
   */
  private handleFatal(error: ChatError): never {
    this.config.errorAdapter.log(error);
    throw error;
  }
}
