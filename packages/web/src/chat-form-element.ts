import type {
  AnswerMap,
  ChatError,
  ChatEvent,
  ChatOptions,
  ChatQuestion,
  ErrorLogAdapter,
  HideAnimation,
  InputAdapter,
  OutputAdapter,
  SessionProgress,
  SessionStore,
  StorageAdapter,
} from '@richardmcquiston01/chat-and-react-core';
import {
  AdapterSessionManager,
  ChatController,
  SessionManager,
} from '@richardmcquiston01/chat-and-react-core';
import { AdapterRegistry } from './adapter-registry.js';
import type { ThinkingConfig } from './renderer.js';
import { Renderer } from './renderer.js';
import { getStyles } from './styles.js';

/**
 * A stable 53-bit hash of a string (cyrb53), as lowercase hex. It gives a form a name that is the
 * same on every page load, so a returning visitor finds the progress they saved.
 */
function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Keys written by versions up to 0.7.0 started with `car:inst:` and a random UUID that changed on
 * every page load, so they could never be read again.
 */
const ORPHANED_KEY = /^car:inst:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/;

/** Removes the unreadable keys left by earlier versions. Finds nothing after the first run. */
function removeOrphanedKeys(): void {
  try {
    const orphaned: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key !== null && ORPHANED_KEY.test(key)) orphaned.push(key);
    }
    for (const key of orphaned) localStorage.removeItem(key);
  } catch {
    // Storage is unavailable; there is nothing to clean up.
  }
}

/**
 * A localStorage-backed storage that prefixes every key with the form's storage key. The same form
 * gets the same prefix on every page load, so its saved progress can be found again, and forms with
 * different keys cannot read or clobber each other's session state.
 */
class FormStorage {
  private readonly prefix: string;

  constructor(storageKey: string) {
    this.prefix = `car:form:${storageKey}:`;
  }

  /**
   * True for a full `localStorage` key that holds this form's session (its id or progress), as
   * opposed to another form's key or one of this form's unsubmitted answers.
   */
  isSessionKey(fullKey: string): boolean {
    return fullKey.startsWith(this.prefix) && !fullKey.startsWith(`${this.prefix}car:input:`);
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(this.prefix + key, value);
    } catch {
      // Swallow storage errors silently.
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // Swallow storage errors silently.
    }
  }

  key(index: number): string | null {
    try {
      // Walk localStorage keys and return those belonging to this instance.
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.prefix)) {
          if (count === index) return k.slice(this.prefix.length);
          count++;
        }
      }
    } catch {
      // Swallow storage errors silently.
    }
    return null;
  }

  get length(): number {
    try {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.prefix)) count++;
      }
      return count;
    } catch {
      return 0;
    }
  }
}

/**
 * The `<chat-form>` custom element — the main entry point for the chat-and-react
 * library. Consumes a JSON schema attribute and drives the full conversation flow
 * inside a Shadow DOM using the chat bubble aesthetic.
 */
/** Shown in the chat history when a question was left blank. */
const NO_ANSWER_TEXT = '(no answer)';

/** The in-progress page, set aside while the user edits an earlier one. */
interface SuspendedPage {
  pageQuestions: ChatQuestion[];
  questionIndex: number;
  pageAnswers: AnswerMap;
  pageTitleLogged: boolean;
  pendingRouteIndex: number;
}

export class ChatFormElement extends HTMLElement {
  private controller: ChatController | null = null;
  private session: SessionStore | null = null;
  private storage: FormStorage | null = null;
  private renderer: Renderer | null = null;
  private readonly registry = new AdapterRegistry();
  /** The parsed `schema` attribute, kept so the form can be restarted by `resync()`. */
  private schema: unknown = null;
  private resyncing: Promise<boolean> | null = null;

  /** Visible questions of the current page, asked one at a time. */
  private pageQuestions: ChatQuestion[] = [];
  private questionIndex = 0;
  private pageAnswers: AnswerMap = {};
  private pageTitleLogged = false;

  /** Position the page being asked will take in the controller's route once submitted. */
  private pendingRouteIndex = 0;
  /** Route index of an earlier page being edited, or null when answering normally. */
  private editingRouteIndex: number | null = null;
  /** The page the user was on, saved while they edit an earlier page. */
  private suspendedPage: SuspendedPage | null = null;

  private allowEdit = false;
  private autoHideMs = 0;
  private autoHideAnswersMs = 0;
  private hideAnimation: HideAnimation = 'fade';
  private typingSpeed = 0;
  private thinkingDelay = 0;
  private thinkingText = '';
  private showContinueIcon = true;
  private readonly hideTimers = new Set<number>();

  /**
   * Saves progress through a `StorageAdapter` instead of the built-in storage, for
   * example `localStorageAdapter()` or one that talks to your server. Call it before the
   * element is added to the page; the saved session is loaded when it connects.
   */
  setStorageAdapter(adapter: StorageAdapter | null): void {
    this.registry.setStorageAdapter(adapter);
  }

  /**
   * Converts the `schema` attribute with `adapter` before the form is built. The attribute is
   * parsed as JSON first, so the adapter receives the parsed value. Call it before the element is
   * added to the page.
   */
  setInputAdapter(adapter: InputAdapter): void {
    this.registry.setInputAdapter(adapter);
  }

  /**
   * Sends page-submit and form-complete events to `adapter` (a webhook, a WebSocket, ...) instead
   * of dispatching browser events only. Call it before the element is added to the page.
   */
  setOutputAdapter(adapter: OutputAdapter): void {
    this.registry.setOutputAdapter(adapter);
  }

  /**
   * Sends errors to `adapter` instead of the console. Call it before the element is added to the
   * page.
   */
  setErrorAdapter(adapter: ErrorLogAdapter): void {
    this.registry.setErrorAdapter(adapter);
  }

  /**
   * Deletes this form's saved progress and drafts from storage, so the next page load starts on
   * the first page. What is on screen is not reset; to start over right away, remove the element
   * and add it again.
   *
   * Returns `true` when the saved data was removed. Returns `false` when there was nothing to
   * clear it from: the element has no `schema` yet, or it uses a storage adapter that is still
   * loading. Once an adapter-backed form has loaded, this clears it too.
   */
  clearProgress(): boolean {
    if (this.session) {
      this.session.clearAll();
      return true;
    }
    if (this.registry.getStorageAdapter()) return false;
    const schemaAttr = this.getAttribute('schema');
    if (!schemaAttr) return false;
    const storage = new FormStorage(this.storageKey(schemaAttr));
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key !== null) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
    return true;
  }

  /**
   * Reloads the form from what is saved and restarts it on the saved page, dropping the chat
   * history on screen. Use it after a `chat-external-change` event when the host wants this tab to
   * follow the change. If the form was finished or cleared in another tab, it starts again from the
   * first page.
   *
   * Resolves to `true` once the form has restarted. Resolves to `false` when there is nothing to
   * restart: the element is not on the page, has no valid `schema`, or was removed meanwhile.
   * Calls made while a resync is already running share its result.
   */
  resync(): Promise<boolean> {
    if (this.resyncing) return this.resyncing;
    if (!this.controller || !this.renderer || this.schema === null) return Promise.resolve(false);
    const resyncing: Promise<boolean> = this.performResync(this.schema).finally(() => {
      this.resyncing = null;
    });
    this.resyncing = resyncing;
    return resyncing;
  }

  private async performResync(schema: unknown): Promise<boolean> {
    // Let this tab's own unsaved changes reach storage first, so they are loaded back, not lost.
    if (this.session instanceof AdapterSessionManager) await this.session.flush();
    if (!this.controller || !this.renderer) return false;

    const adapter: StorageAdapter | null = this.registry.getStorageAdapter();
    let next: SessionStore;
    if (adapter) {
      next = await this.createAdapterSession(adapter);
      if (!this.controller || !this.renderer) {
        // The element was removed while the saved session was loading.
        next.dispose?.();
        return false;
      }
    } else if (this.storage) {
      next = new SessionManager(this.storage);
    } else {
      return false;
    }

    this.resetFormState();
    this.startController(schema, next);
    return true;
  }

  /** Clears the chat, the timers and the page state so a new controller starts clean. */
  private resetFormState(): void {
    this.hideTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    this.hideTimers.clear();
    this.renderer?.reset();
    this.controller?.destroy();
    this.controller = null;
    this.pageQuestions = [];
    this.questionIndex = 0;
    this.pageAnswers = {};
    this.pageTitleLogged = false;
    this.pendingRouteIndex = 0;
    this.editingRouteIndex = null;
    this.suspendedPage = null;
  }

  /** Tells the page that another tab changed this form's saved progress. */
  private dispatchExternalChange(progress: SessionProgress | null): void {
    this.dispatchEvent(
      new CustomEvent('chat-external-change', { detail: { progress }, bubbles: true }),
    );
  }

  /**
   * With the built-in storage, the browser sends a `storage` event when another tab changes
   * `localStorage`. Only changes to this form's own session are passed on.
   */
  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (!this.storage || !this.session) return;
    try {
      if (event.storageArea !== null && event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    if (event.key !== null && !this.storage.isSessionKey(event.key)) return;
    this.dispatchExternalChange(this.session.loadProgress());
  };

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });

    const style = shadow.ownerDocument.createElement('style');
    style.textContent = getStyles();
    shadow.appendChild(style);

    this.renderer = new Renderer(shadow);
    this.initController();
  }

  disconnectedCallback(): void {
    this.hideTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    this.hideTimers.clear();
    this.renderer?.cancelAnimations();
    window.removeEventListener('storage', this.handleStorageEvent);
    this.controller?.destroy();
    this.controller = null;
    this.session = null;
    this.storage = null;
    this.renderer = null;
    this.schema = null;
  }

  /** Parses the schema attribute and wires up the ChatController. */
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

    this.schema = schema;
    const storageAdapter: StorageAdapter | null = this.registry.getStorageAdapter();
    if (storageAdapter) {
      void this.initWithStorageAdapter(schema, storageAdapter);
      return;
    }

    removeOrphanedKeys();
    this.storage = new FormStorage(this.storageKey(schemaAttr));
    window.addEventListener('storage', this.handleStorageEvent);
    this.startController(schema, new SessionManager(this.storage));
  }

  /**
   * The name this form saves its progress under. It is the `storage-key` attribute when there is
   * one, and otherwise a hash of the schema, so the same form is found again on the next page load
   * and different forms on one page stay apart. Two forms with identical schemas share progress
   * unless they are given different `storage-key`s.
   */
  private storageKey(schemaText: string): string {
    const explicitKey = this.getAttribute('storage-key')?.trim();
    return explicitKey ? explicitKey : hashString(schemaText);
  }

  /**
   * Loads the saved session from the storage adapter, then starts the controller. Nothing
   * is shown until the saved session has been read, so a resumed form opens on the right page.
   */
  private async initWithStorageAdapter(schema: unknown, adapter: StorageAdapter): Promise<void> {
    const session: AdapterSessionManager = await this.createAdapterSession(adapter);
    if (!this.renderer) {
      // The element was removed while the saved session was loading.
      session.dispose();
      return;
    }
    this.startController(schema, session);
  }

  /** Loads the saved session from `adapter`, reporting failures and changes from other tabs. */
  private createAdapterSession(adapter: StorageAdapter): Promise<AdapterSessionManager> {
    return AdapterSessionManager.create(adapter, {
      onError: (error: ChatError) => this.logError(error),
      onExternalChange: (progress: SessionProgress | null) => this.dispatchExternalChange(progress),
    });
  }

  /** Sends an error to the registered error adapter; a failure there goes to the console. */
  private logError(error: ChatError): void {
    const reportFailure = (reason: unknown): void => {
      console.error('[chat-and-react] ErrorLogAdapter failed to record an error:', reason, error);
    };
    try {
      void Promise.resolve(this.registry.getErrorAdapter().log(error)).then((result) => {
        if (result?.ok === false) reportFailure(result.error);
      }, reportFailure);
    } catch (cause) {
      reportFailure(cause);
    }
  }

  /** Creates the controller for `session`, starts it, and renders the first page. */
  private startController(schema: unknown, session: SessionStore): void {
    this.session = session;

    this.controller = new ChatController(
      {
        schema,
        inputAdapter: this.registry.getInputAdapter(),
        outputAdapter: this.registry.getOutputAdapter(),
        errorAdapter: this.registry.getErrorAdapter(),
        options: this.readOptionOverrides(),
      },
      this.session,
    );

    this.controller.on('page:submit', (e: ChatEvent) => {
      this.dispatchEvent(new CustomEvent('chat-page-submit', { detail: e, bubbles: true }));
    });

    this.controller.on('form:complete', (e: ChatEvent) => {
      // Answers are final once the form is complete.
      this.renderer?.removeEditButtons();
      this.dispatchEvent(new CustomEvent('chat-form-complete', { detail: e, bubbles: true }));
    });

    try {
      this.controller.start();
    } catch (e) {
      this.dispatchEvent(new CustomEvent('chat-error', { detail: e, bubbles: true }));
      return;
    }

    this.resolveOptions();
    this.renderer?.setEditable(this.allowEdit, (routeIndex, questionId) =>
      this.handleEdit(routeIndex, questionId),
    );
    this.renderCurrentPage();
  }

  /**
   * Reads option overrides from the element's attributes. An attribute wins over
   * the same option in the schema. Attributes are read once, when the element is
   * connected.
   */
  private readOptionOverrides(): Partial<ChatOptions> {
    const overrides: Partial<ChatOptions> = {};

    const flag = (name: string): boolean | undefined => {
      const value = this.getAttribute(name);
      if (value === null) return undefined;
      return !['false', '0', 'off', 'no'].includes(value.trim().toLowerCase());
    };
    const milliseconds = (name: string): number | undefined => {
      const value = this.getAttribute(name);
      if (value === null || value.trim() === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    };

    const set = <K extends keyof ChatOptions>(key: K, value: ChatOptions[K] | undefined): void => {
      if (value !== undefined) overrides[key] = value;
    };

    set('userResumable', flag('user-resumable'));
    set('localStorage', flag('local-storage'));
    set('autoComplete', flag('auto-complete'));
    set('allowEdit', flag('allow-edit'));
    set('showContinueIcon', flag('show-continue-icon'));
    set('autoHideQuestions', milliseconds('auto-hide-questions'));
    set('autoHideAnswers', milliseconds('auto-hide-answers'));
    const animationAttr = this.getAttribute('hide-animation')?.trim().toLowerCase();
    if (animationAttr === 'fade' || animationAttr === 'pop' || animationAttr === 'none') {
      set('hideAnimation', animationAttr);
    }
    set('typingSpeed', milliseconds('typing-speed'));
    set('thinkingDelay', milliseconds('thinking-delay'));
    set('thinkingText', this.getAttribute('thinking-text') ?? undefined);
    return overrides;
  }

  /** Copies the resolved options (schema, defaults, then attributes) the element itself uses. */
  private resolveOptions(): void {
    if (!this.controller) return;
    const options = this.controller.getOptions();
    this.allowEdit = options.allowEdit;
    this.autoHideMs = options.autoHideQuestions;
    this.autoHideAnswersMs = options.autoHideAnswers;
    this.hideAnimation = options.hideAnimation;
    this.typingSpeed = options.typingSpeed;
    this.thinkingDelay = options.thinkingDelay;
    this.thinkingText = options.thinkingText;
    this.showContinueIcon = options.showContinueIcon;
  }

  /**
   * Works out the thinking bubble for a question. A question's own
   * `x-chat-thinking` wins over the `thinkingDelay` / `thinkingText` options.
   */
  private resolveThinking(question: ChatQuestion | undefined): ThinkingConfig | null {
    const own = question?.['x-chat-thinking'];
    let delay = this.thinkingDelay;
    let text = this.thinkingText || undefined;

    if (typeof own === 'number') {
      delay = own;
    } else if (own && typeof own === 'object') {
      if (own.delay !== undefined) delay = own.delay;
      if (own.text !== undefined) text = own.text || undefined;
    }
    return delay > 0 ? { delay, text } : null;
  }

  /**
   * Starts the current page. Its visible questions are asked one at a time,
   * each with its own Continue button; the page is submitted once the last
   * one is answered.
   */
  private renderCurrentPage(autofocus = false): void {
    if (!this.controller || !this.renderer) return;
    if (!this.controller.getCurrentPage()) return;

    this.pageQuestions = this.controller.getVisibleQuestions();
    this.questionIndex = 0;
    this.pageAnswers = {};
    this.pageTitleLogged = false;
    this.pendingRouteIndex = this.controller.getRoute().length;
    this.renderQuestionStep(autofocus);
  }

  /** Route index the answers on screen belong to: the edited page, or the page being asked. */
  private get activeRouteIndex(): number {
    return this.editingRouteIndex ?? this.pendingRouteIndex;
  }

  /** The question being asked now, as a list (empty for a page with no questions). */
  private getStepQuestions(): ChatQuestion[] {
    const question = this.pageQuestions[this.questionIndex];
    return question ? [question] : [];
  }

  /** Renders the current step of the current page: one question and its Continue button. */
  private renderQuestionStep(autofocus: boolean, animate = true): void {
    if (!this.controller || !this.renderer) return;
    const page = this.controller.getCurrentPage();
    if (!page) return;

    const stepQuestions = this.getStepQuestions();
    this.renderer.renderPage(page, stepQuestions, {
      showTitle: this.questionIndex === 0,
      values: this.withDrafts(stepQuestions),
      showContinueIcon: this.showContinueIcon,
      // Revisited questions (edits) appear straight away; only new ones are
      // "thought about" and "typed".
      typingSpeed: animate ? this.typingSpeed : 0,
      thinking: animate ? this.resolveThinking(stepQuestions[0]) : null,
      onReady: () => this.focusCurrentQuestion(autofocus),
    });

    const inputArea = this.renderer.getInputArea();
    if (!inputArea) return;

    // Wire up the Continue button.
    const btn = inputArea.querySelector<HTMLButtonElement>('.car-btn-submit');
    if (btn) {
      btn.addEventListener('click', () => this.handleContinue());
    }

    // Keyboard shortcuts. Enter acts like Continue (Shift+Enter adds a line in a textarea), and
    // the number keys pick the numbered radio / checkbox options. Buttons already
    // act on Enter.
    inputArea.addEventListener('keydown', (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      const target = keyEvent.target;

      // Enter continues from a single-line input, a dropdown, or a textarea.
      // Shift+Enter in a textarea still adds a new line, and Enter while an
      // input method editor is composing text is left alone.
      const isEnterTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement;
      if (keyEvent.key === 'Enter' && isEnterTarget && !keyEvent.isComposing) {
        if (target instanceof HTMLTextAreaElement && keyEvent.shiftKey) return;
        keyEvent.preventDefault();
        this.handleContinue();
        return;
      }

      const hasModifier = keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey;
      if (/^[1-9]$/.test(keyEvent.key) && !hasModifier && !this.isTextEntry(target)) {
        if (this.selectOptionByNumber(inputArea, Number(keyEvent.key))) {
          keyEvent.preventDefault();
        }
      }
    });

    // Apply autocomplete="off" when the option is disabled.
    if (this.controller && !this.controller.getOptions().autoComplete) {
      inputArea.querySelectorAll<HTMLElement>('input, textarea, select').forEach((el) => {
        (el as HTMLInputElement).setAttribute('autocomplete', 'off');
      });
    }

    // Save what is typed or picked, so a reload brings it back before it is submitted. Answers
    // given while editing an earlier page are not drafts, so they are left out.
    if (this.controller?.getOptions().localStorage && this.session) {
      const saveDraft = (): void => {
        if (!this.session || this.editingRouteIndex !== null) return;
        const stepQuestions = this.getStepQuestions();
        const drafts: AnswerMap = this.collectAnswers(stepQuestions, inputArea);
        for (const question of stepQuestions) {
          const draft = drafts[question.id];
          if (draft !== undefined) this.session.saveInput(question.id, draft);
        }
      };
      inputArea.addEventListener('input', saveDraft);
      inputArea.addEventListener('change', saveDraft);
    }

    // Keep the new question on screen while it is thought about and typed.
    if (autofocus) {
      inputArea.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /**
   * Moves the cursor to the question on screen and keeps its Continue button in
   * view. Skipped for the very first render so the form does not grab focus (and
   * scroll the page) when it loads.
   */
  private focusCurrentQuestion(autofocus: boolean): void {
    if (!autofocus) return;
    const inputArea = this.renderer?.getInputArea();
    if (!inputArea) return;
    inputArea.querySelector<HTMLElement>('input, select, textarea')?.focus();
    // Optional call: some DOM environments do not implement scrollIntoView.
    inputArea.querySelector<HTMLElement>('.car-btn-submit')?.scrollIntoView?.({ block: 'nearest' });
  }

  /** True for controls where typing a character should be left alone. */
  private isTextEntry(target: EventTarget | null): boolean {
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
    return (
      target instanceof HTMLInputElement && target.type !== 'radio' && target.type !== 'checkbox'
    );
  }

  /**
   * Picks the nth radio option, or toggles the nth checkbox, on the question on
   * screen. Returns false when there is no such option.
   */
  private selectOptionByNumber(inputArea: HTMLElement, number: number): boolean {
    const options = Array.from(
      inputArea.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
    );
    const option = options[number - 1];
    if (!option) return false;

    option.checked = option.type === 'radio' ? true : !option.checked;
    option.focus();
    option.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /**
   * Records the answer to the current question, then either asks the next
   * question of the page or, after the last one, submits the whole page.
   */
  private handleContinue(): void {
    if (!this.controller || !this.renderer) return;

    const inputArea = this.renderer.getInputArea();
    if (!inputArea) return;

    const page = this.controller.getCurrentPage();
    const stepQuestions = this.getStepQuestions();
    const stepAnswers: AnswerMap = this.collectAnswers(stepQuestions, inputArea);
    Object.assign(this.pageAnswers, stepAnswers);

    const hasMoreQuestions = this.questionIndex + 1 < this.pageQuestions.length;
    const routeIndex = this.activeRouteIndex;

    // Keep the page title in the history once its first question is answered,
    // because the title bubble is only shown on the first step.
    if (
      hasMoreQuestions &&
      !this.pageTitleLogged &&
      this.editingRouteIndex === null &&
      page?.title
    ) {
      const titleBubble = this.renderer.appendBotBubble(page.title, routeIndex);
      this.scheduleHide(titleBubble, this.autoHideMs);
      this.pageTitleLogged = true;
    }

    // Move the answered question into the chat history as a question / answer
    // pair, or update the answer in place if it was already recorded (an edit).
    for (const q of stepQuestions) {
      const value = stepAnswers[q.id];
      if (value === undefined) continue;
      const joined = Array.isArray(value) ? value.join(', ') : value;
      const display = joined === '' ? NO_ANSWER_TEXT : joined;
      const { question, answer } = this.renderer.recordAnswer(routeIndex, q.id, q.title, display);
      if (question) this.scheduleHide(question, this.autoHideMs);
      if (answer) this.scheduleHide(answer, this.autoHideAnswersMs);
    }

    // Remove the input area before moving on (so form:complete listeners
    // see the DOM without an input area).
    this.renderer.clearInputArea();

    if (hasMoreQuestions) {
      this.questionIndex += 1;
      // Questions asked again while editing appear straight away.
      this.renderQuestionStep(true, this.editingRouteIndex === null);
      return;
    }

    if (this.editingRouteIndex !== null) {
      this.finishEdit();
      return;
    }

    const submittedQuestions: ChatQuestion[] = this.pageQuestions;
    this.controller.submitPage(this.pageAnswers);
    this.clearDrafts(submittedQuestions);

    // Advance to the next page if the form is not complete.
    if (this.controller.getCurrentPage()) {
      this.renderCurrentPage(true);
    }
  }

  /** Hides a bubble after the given delay in milliseconds. A delay of 0 or less keeps it. */
  private scheduleHide(bubble: HTMLElement, delayMs: number): void {
    if (delayMs <= 0) return;
    const timerId = window.setTimeout(() => {
      this.hideTimers.delete(timerId);
      this.renderer?.hideBubble(bubble, this.hideAnimation);
    }, delayMs);
    this.hideTimers.add(timerId);
  }

  /**
   * Handles a click on an Edit icon. An answer on the page being asked simply
   * goes back to that question. An answer on an earlier, already submitted page
   * re-opens that page; the page the user was on is set aside until the edit is
   * finished.
   */
  private handleEdit(routeIndex: number, questionId: string): void {
    if (!this.controller || !this.renderer) return;

    if (routeIndex === this.activeRouteIndex) {
      const index = this.pageQuestions.findIndex((q) => q.id === questionId);
      if (index < 0) return;
      this.renderer.clearInputArea();
      this.questionIndex = index;
      this.renderQuestionStep(true, false);
      return;
    }

    // Answers on the set-aside page cannot be edited until the current edit is done.
    if (routeIndex >= this.controller.getRoute().length) return;

    if (!this.suspendedPage) {
      this.suspendedPage = {
        pageQuestions: this.pageQuestions,
        questionIndex: this.questionIndex,
        pageAnswers: this.pageAnswers,
        pageTitleLogged: this.pageTitleLogged,
        pendingRouteIndex: this.pendingRouteIndex,
      };
    }
    if (!this.controller.reopenPage(routeIndex)) {
      this.suspendedPage = null;
      return;
    }

    this.renderer.clearInputArea();
    this.editingRouteIndex = routeIndex;
    this.pageQuestions = this.controller.getVisibleQuestions();
    this.pageAnswers = { ...this.controller.getRoute()[routeIndex].answers };
    this.pageTitleLogged = true;
    this.questionIndex = Math.max(
      0,
      this.pageQuestions.findIndex((q) => q.id === questionId),
    );
    this.renderQuestionStep(true, false);
  }

  /**
   * Saves an edited earlier page. If its branching still leads to the same next
   * page, the user goes back to where they were. If not, the pages that followed
   * are dropped from the chat and the form carries on from the new page.
   */
  private finishEdit(): void {
    if (!this.controller || !this.renderer || this.editingRouteIndex === null) return;

    const editedIndex = this.editingRouteIndex;
    const outcome = this.controller.submitPage(this.pageAnswers);
    this.editingRouteIndex = null;

    const suspended = this.suspendedPage;
    this.suspendedPage = null;

    if (outcome === 'edit-resumed' && suspended) {
      // Questions on the page being asked may now be shown or hidden.
      this.pageQuestions = this.controller.getVisibleQuestions();
      this.questionIndex = Math.min(
        suspended.questionIndex,
        Math.max(0, this.pageQuestions.length - 1),
      );
      this.pageAnswers = suspended.pageAnswers;
      this.pageTitleLogged = suspended.pageTitleLogged;
      this.pendingRouteIndex = suspended.pendingRouteIndex;
      this.renderQuestionStep(true, false);
      return;
    }

    this.renderer.removeHistoryAfter(editedIndex);
    if (this.controller.getCurrentPage()) {
      this.renderCurrentPage(true);
    }
  }

  /**
   * The answers already given on this page, plus the saved draft of each of `questions` that has
   * none yet. A draft is what was typed or picked before a reload and never submitted.
   */
  private withDrafts(questions: ChatQuestion[]): AnswerMap {
    const values: AnswerMap = { ...this.pageAnswers };
    if (!this.session || !this.controller?.getOptions().localStorage) return values;
    if (this.editingRouteIndex !== null) return values;

    for (const question of questions) {
      if (values[question.id] !== undefined) continue;
      const draft = this.session.loadInput(question.id);
      const expectsList = question['x-chat-input'] === 'checkbox';
      if (draft !== null && Array.isArray(draft) === expectsList) values[question.id] = draft;
    }
    return values;
  }

  /** Forgets the drafts of a page that has just been submitted. */
  private clearDrafts(questions: ChatQuestion[]): void {
    for (const question of questions) this.session?.clearInput(question.id);
  }

  /** Reads current values from all input widgets in the given input area. */
  private collectAnswers(questions: ChatQuestion[], inputArea: HTMLElement): AnswerMap {
    const answers: AnswerMap = {};

    for (const q of questions) {
      const type = q['x-chat-input'];

      if (type === 'checkbox') {
        const checked = Array.from(
          inputArea.querySelectorAll<HTMLInputElement>(
            `input[type="checkbox"][name="${q.id}"]:checked`,
          ),
        ).map((el) => el.value);
        answers[q.id] = checked;
      } else if (type === 'radio') {
        const checked = inputArea.querySelector<HTMLInputElement>(
          `input[type="radio"][name="${q.id}"]:checked`,
        );
        answers[q.id] = checked?.value ?? '';
      } else if (type === 'dropdown') {
        const select = inputArea.querySelector<HTMLSelectElement>(
          `select[data-question-id="${q.id}"]`,
        );
        answers[q.id] = select?.value ?? '';
      } else {
        // text / textarea
        const input = inputArea.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[data-question-id="${q.id}"]`,
        );
        answers[q.id] = input?.value ?? '';
      }
    }

    return answers;
  }
}

customElements.define('chat-form', ChatFormElement);
