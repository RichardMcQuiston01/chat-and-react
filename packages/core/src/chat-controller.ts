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
  RouteEntry,
  SubmitOutcome,
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
  allowEdit: false,
  autoHideQuestions: 0,
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
  /** Pages submitted in this session, in visit order. Used for editing earlier answers. */
  private route: RouteEntry[] = [];
  /** Index in `route` of the page being edited, or null when not editing. */
  private editIndex: number | null = null;
  /** The page the user was on before they started editing an earlier one. */
  private resumePageId: string | null = null;
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
      allowEdit: schemaOpts.allowEdit ?? DEFAULT_OPTIONS.allowEdit,
      autoHideQuestions: schemaOpts.autoHideQuestions ?? DEFAULT_OPTIONS.autoHideQuestions,
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
   * Returns the pages the user has submitted in this session, in visit order.
   * A session restored from storage starts with an empty route.
   */
  getRoute(): RouteEntry[] {
    return this.route.map((entry) => ({ pageId: entry.pageId, answers: { ...entry.answers } }));
  }

  /**
   * Returns every answer given so far, for pre-filling inputs.
   */
  getAnswers(): AnswerMap {
    return { ...this.allAnswers };
  }

  /**
   * Re-opens a page the user already submitted so its answers can be changed.
   * Call `submitPage` afterwards to save the new answers. Not available once the
   * form is complete.
   *
   * @param routeIndex - Position of the page in `getRoute()`.
   * @returns true when the page was re-opened.
   */
  reopenPage(routeIndex: number): boolean {
    if (!this.schema || !this.currentPage) return false;
    const entry = this.route[routeIndex];
    if (!entry) return false;
    const page = this.schema['x-chat-pages'].find((p) => p.id === entry.pageId);
    if (!page) return false;

    // Remember where the user was, but only the first time: editing another
    // earlier page before finishing this edit must still return to that page.
    if (this.editIndex === null) this.resumePageId = this.currentPage.id;
    this.editIndex = routeIndex;
    this.currentPage = page;
    return true;
  }

  /**
   * Submits the answers for the current page and advances the session.
   * - Accumulates answers into `allAnswers`.
   * - Emits `page:submit` (suppressed when `userResumable` is false).
   * - Resolves branching to find the next page.
   * - Emits `form:complete` and clears session when `**FORM_COMPLETED**` is reached.
   *
   * When the page was re-opened with `reopenPage`, the new answers replace the
   * old ones and `page:submit` is emitted with `edited: true`. If the page's
   * branching still leads to the same next page, the form returns to the page the
   * user was on. If it leads somewhere else, the pages that followed it are
   * dropped, along with their answers, and the form continues from the new page.
   *
   * @param pageAnswers - Answers collected for the current page.
   */
  submitPage(pageAnswers: AnswerMap): SubmitOutcome {
    if (!this.currentPage || !this.schema) return 'advanced';

    const pageId = this.currentPage.id;
    const currentVisitIndex = this.visitIndex;
    const editedIndex = this.editIndex;
    const isEdit = editedIndex !== null;

    let outcome: SubmitOutcome = 'advanced';
    let nextPageId: string;
    let resumePageId: string | null = null;

    if (isEdit) {
      const entry = this.route[editedIndex];
      // Replace the old answers for this page, including any question that is
      // no longer visible after the change.
      const remaining = { ...this.allAnswers };
      for (const questionId of Object.keys(entry.answers)) delete remaining[questionId];
      this.allAnswers = { ...remaining, ...pageAnswers };
      entry.answers = { ...pageAnswers };

      nextPageId = this.resolveBranching(this.currentPage, this.allAnswers);
      const expectedNextPageId = this.route[editedIndex + 1]?.pageId ?? this.resumePageId;

      if (nextPageId === expectedNextPageId) {
        outcome = 'edit-resumed';
        resumePageId = this.resumePageId;
      } else {
        outcome = 'edit-rerouted';
        // The route changed: forget the pages that followed and their answers.
        for (const later of this.route.slice(editedIndex + 1)) {
          for (const questionId of Object.keys(later.answers)) delete this.allAnswers[questionId];
        }
        this.route.length = editedIndex + 1;
      }
      this.editIndex = null;
      this.resumePageId = null;
    } else {
      this.allAnswers = { ...this.allAnswers, ...pageAnswers };
      this.route.push({ pageId, answers: { ...pageAnswers } });
      nextPageId = this.resolveBranching(this.currentPage, this.allAnswers);
    }

    if (this.options.userResumable) {
      const progressPageId =
        outcome === 'edit-resumed' && resumePageId
          ? resumePageId
          : nextPageId === '**FORM_COMPLETED**'
            ? pageId
            : nextPageId;
      this.session.saveProgress(progressPageId, this.allAnswers);

      const submitEvent: ChatEvent = {
        type: 'page:submit',
        sessionId: this.session.getSessionId(),
        pageId,
        visitIndex: currentVisitIndex,
        answers: pageAnswers,
        ...(isEdit ? { edited: true } : {}),
      };
      this.safeEmit(submitEvent);
      this.emit('page:submit', submitEvent);
    }

    this.visitIndex++;

    if (outcome === 'edit-resumed' && resumePageId) {
      this.currentPage =
        this.schema['x-chat-pages'].find((p) => p.id === resumePageId) ?? null;
      return outcome;
    }

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
        this.schema['x-chat-pages'].find((p) => p.id === nextPageId) ?? null;
    }
    return outcome;
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
      return this.ruleEngine.evaluate(rule, this.answersForRules());
    } catch (e) {
      this.config.errorAdapter.log(e as ChatError);
      return false;
    }
  }

  /**
   * The answers question conditions are checked against. While an earlier page is
   * being edited, that page's own answers are left out, so its questions are
   * shown exactly as they were the first time the page was asked.
   */
  private answersForRules(): AnswerMap {
    if (this.editIndex === null) return this.allAnswers;
    const rest = { ...this.allAnswers };
    for (const questionId of Object.keys(this.route[this.editIndex].answers)) delete rest[questionId];
    return rest;
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
