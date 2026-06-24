import { ChatController, SessionManager } from '@chat-and-react/core';
import type { ChatQuestion, ChatEvent, AnswerMap } from '@chat-and-react/core';
import { AdapterRegistry } from './adapter-registry.js';
import { Renderer } from './renderer.js';
import { getStyles } from './styles.js';

/**
 * A localStorage-backed storage that prefixes every key with a per-element
 * instance UUID, ensuring different `<chat-form>` elements cannot share or
 * clobber each other's session state.
 */
class InstanceStorage {
  private readonly prefix: string;

  constructor() {
    this.prefix = `car:inst:${crypto.randomUUID()}:`;
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
export class ChatFormElement extends HTMLElement {
  private controller: ChatController | null = null;
  private session: SessionManager | null = null;
  private storage: InstanceStorage | null = null;
  private renderer: Renderer | null = null;
  private shadow: ShadowRoot | null = null;
  private readonly registry = new AdapterRegistry();

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });
    this.shadow = shadow;

    const style = shadow.ownerDocument.createElement('style');
    style.textContent = getStyles();
    shadow.appendChild(style);

    this.renderer = new Renderer(shadow);
    this.initController();
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
    this.controller = null;
    this.session = null;
    this.storage = null;
    this.renderer = null;
    this.shadow = null;
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

    this.storage = new InstanceStorage();
    this.session = new SessionManager(this.storage);

    this.controller = new ChatController(
      {
        schema,
        inputAdapter: this.registry.getInputAdapter(),
        outputAdapter: this.registry.getOutputAdapter(),
        errorAdapter: this.registry.getErrorAdapter(),
      },
      this.session,
    );

    this.controller.on('page:submit', (e: ChatEvent) => {
      this.dispatchEvent(
        new CustomEvent('chat-page-submit', { detail: e, bubbles: true }),
      );
    });

    this.controller.on('form:complete', (e: ChatEvent) => {
      this.dispatchEvent(
        new CustomEvent('chat-form-complete', { detail: e, bubbles: true }),
      );
    });

    try {
      this.controller.start();
    } catch (e) {
      this.dispatchEvent(
        new CustomEvent('chat-error', { detail: e, bubbles: true }),
      );
      return;
    }

    this.renderCurrentPage();
  }

  /** Renders the visible questions for the current page. */
  private renderCurrentPage(): void {
    if (!this.controller || !this.renderer) return;
    const page = this.controller.getCurrentPage();
    if (!page) return;

    const questions = this.controller.getVisibleQuestions();

    // Append persistent bot bubbles for each question label so they survive
    // page transitions (renderer.renderPage also creates label bubbles inside
    // .car-page, but those are removed when the page is cleared).
    for (const q of questions) {
      this.renderer.appendBotBubble(q.title);
    }

    this.renderer.renderPage(page, questions);

    const inputArea = this.renderer.getInputArea();
    if (!inputArea) return;

    // Wire up the submit button.
    const btn = inputArea.querySelector<HTMLButtonElement>('.car-btn-submit');
    if (btn) {
      btn.addEventListener('click', () => this.handleSubmit(questions));
    }

    // Apply autocomplete="off" when the option is disabled.
    if (this.controller && !this.controller.getOptions().autoComplete) {
      inputArea.querySelectorAll<HTMLElement>('input, textarea, select').forEach((el) => {
        (el as HTMLInputElement).setAttribute('autocomplete', 'off');
      });
    }

    // Wire up per-keystroke localStorage saves when the option is enabled.
    if (this.controller?.getOptions().localStorage && this.session && this.storage) {
      const sessionId = this.session.getSessionId();
      const storage = this.storage;
      inputArea.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="radio"]):not([type="checkbox"]), textarea',
      ).forEach((el) => {
        const questionId = (el as HTMLElement).dataset['questionId'] ?? '';
        el.addEventListener('input', () => {
          storage.setItem(
            `car:input:${sessionId}:${questionId}`,
            (el as HTMLInputElement).value,
          );
        });
      });
    }
  }

  /** Collects answers from the input area and advances the controller. */
  private handleSubmit(questions: ChatQuestion[]): void {
    if (!this.controller || !this.renderer) return;

    const inputArea = this.renderer.getInputArea();
    if (!inputArea) return;

    const answers: AnswerMap = this.collectAnswers(questions, inputArea);

    // Show user bubbles summarising each answer.
    for (const q of questions) {
      const value = answers[q.id];
      if (value !== undefined) {
        const display = Array.isArray(value) ? value.join(', ') : value;
        this.renderer.appendUserBubble(display);
      }
    }

    // Remove the input area before submitting (so form:complete listeners
    // see the DOM without an input area).
    this.renderer.clearInputArea();

    this.controller.submitPage(answers);

    // Advance to the next page if the form is not complete.
    if (this.controller.getCurrentPage()) {
      this.renderCurrentPage();
    }
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
        const input = inputArea.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(`[data-question-id="${q.id}"]`);
        answers[q.id] = input?.value ?? '';
      }
    }

    return answers;
  }
}

customElements.define('chat-form', ChatFormElement);
