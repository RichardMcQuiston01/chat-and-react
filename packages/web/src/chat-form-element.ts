import { ChatController, SessionManager } from '@chat-and-react/core';
import type { ChatQuestion, ChatEvent, AnswerMap } from '@chat-and-react/core';
import { AdapterRegistry } from './adapter-registry.js';
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
  static observedAttributes = [
    'schema',
    'user-resumable',
    'local-storage',
    'auto-complete',
  ];

  private controller: ChatController | null = null;
  private messageList: HTMLElement | null = null;
  private inputArea: HTMLElement | null = null;
  private readonly registry = new AdapterRegistry();
  /** Per-instance ID used to namespace per-keystroke localStorage saves. */
  private readonly instanceId = crypto.randomUUID();

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${getStyles()}</style>
      <div part="container">
        <div part="message-list"></div>
      </div>
    `;
    this.messageList = shadow.querySelector<HTMLElement>('[part="message-list"]')!;
    this.initController();
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
    this.controller = null;
    this.messageList = null;
    this.inputArea = null;
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

    this.controller = new ChatController(
      {
        schema,
        inputAdapter: this.registry.getInputAdapter(),
        outputAdapter: this.registry.getOutputAdapter(),
        errorAdapter: this.registry.getErrorAdapter(),
      },
      new SessionManager(new InstanceStorage()),
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
    if (!this.controller || !this.messageList) return;
    if (!this.controller.getCurrentPage()) return;

    const questions = this.controller.getVisibleQuestions();
    this.renderInputArea(questions);
  }

  /**
   * Builds the input area for the current set of questions and appends
   * a bot bubble for each question title.
   */
  private renderInputArea(questions: ChatQuestion[]): void {
    if (!this.messageList) return;

    // Remove any previous input area.
    this.removeInputArea();

    // Append a bot bubble for each question.
    for (const q of questions) {
      this.appendBotBubble(q.title);
    }

    // Build the input area element.
    const area = document.createElement('div');
    area.setAttribute('part', 'input-area');
    area.className = 'car-input-area';

    for (const q of questions) {
      const widget = this.buildInputWidget(q);
      area.appendChild(widget);
    }

    // Submit button.
    const btn = document.createElement('button');
    btn.setAttribute('part', 'submit-btn');
    btn.className = 'car-btn-submit';
    btn.textContent = 'Continue';
    btn.addEventListener('click', () => this.handleSubmit(questions));
    area.appendChild(btn);

    this.messageList.appendChild(area);
    this.inputArea = area;

    // Apply autocomplete="off" when the option is disabled.
    if (this.controller && !this.controller.getOptions().autoComplete) {
      area.querySelectorAll<HTMLElement>('input, textarea, select').forEach((el) => {
        (el as HTMLInputElement).setAttribute('autocomplete', 'off');
      });
    }

    // Wire up per-keystroke localStorage saves when the option is enabled.
    if (this.controller?.getOptions().localStorage) {
      const sessionId = this.getSessionId();
      area.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="radio"]):not([type="checkbox"]), textarea',
      ).forEach((el) => {
        const questionId = (el as HTMLElement).dataset['questionId'] ?? '';
        el.addEventListener('input', () => {
          try {
            localStorage.setItem(
              `car:input:${sessionId}:${questionId}`,
              (el as HTMLInputElement).value,
            );
          } catch {
            // Storage may be unavailable — swallow silently.
          }
        });
      });
    }
  }

  /** Collects answers from the input area and advances the controller. */
  private handleSubmit(questions: ChatQuestion[]): void {
    if (!this.controller || !this.messageList) return;

    const answers: AnswerMap = this.collectAnswers(questions);

    // Show user bubbles summarising each answer.
    for (const q of questions) {
      const value = answers[q.id];
      if (value !== undefined) {
        const display = Array.isArray(value) ? value.join(', ') : value;
        this.appendUserBubble(display);
      }
    }

    // Remove the input area before submitting (so form:complete listeners
    // see the DOM without an input area).
    this.removeInputArea();

    this.controller.submitPage(answers);

    // Advance to the next page if the form is not complete.
    if (this.controller.getCurrentPage()) {
      this.renderCurrentPage();
    }
  }

  /** Reads current values from all input widgets in the active input area. */
  private collectAnswers(questions: ChatQuestion[]): AnswerMap {
    const answers: AnswerMap = {};
    if (!this.inputArea) return answers;

    for (const q of questions) {
      const type = q['x-chat-input'];

      if (type === 'checkbox') {
        const checked = Array.from(
          this.inputArea.querySelectorAll<HTMLInputElement>(
            `input[type="checkbox"][name="${q.id}"]:checked`,
          ),
        ).map((el) => el.value);
        answers[q.id] = checked;
      } else if (type === 'radio') {
        const checked = this.inputArea.querySelector<HTMLInputElement>(
          `input[type="radio"][name="${q.id}"]:checked`,
        );
        answers[q.id] = checked?.value ?? '';
      } else if (type === 'dropdown') {
        const select = this.inputArea.querySelector<HTMLSelectElement>(
          `select[data-question-id="${q.id}"]`,
        );
        answers[q.id] = select?.value ?? '';
      } else {
        // text / textarea
        const input = this.inputArea.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(`[data-question-id="${q.id}"]`);
        answers[q.id] = input?.value ?? '';
      }
    }

    return answers;
  }

  /** Appends a bot-side chat bubble with the given text. */
  private appendBotBubble(text: string): void {
    if (!this.messageList) return;
    const div = document.createElement('div');
    div.setAttribute('part', 'bubble-bot');
    div.className = 'car-bubble';
    div.textContent = text;
    this.messageList.appendChild(div);
  }

  /** Appends a user-side chat bubble with the given text. */
  private appendUserBubble(text: string): void {
    if (!this.messageList) return;
    const div = document.createElement('div');
    div.setAttribute('part', 'bubble-user');
    div.className = 'car-bubble car-bubble--user';
    div.textContent = text;
    this.messageList.appendChild(div);
  }

  /** Removes the active input area from the DOM. */
  private removeInputArea(): void {
    if (this.inputArea) {
      this.inputArea.remove();
      this.inputArea = null;
    }
  }

  /**
   * Builds an input widget element for a single question.
   * The element carries `data-question-id` for answer collection.
   */
  private buildInputWidget(q: ChatQuestion): HTMLElement {
    const type = q['x-chat-input'];
    const placeholder = (q['x-chat-placeholder'] as string | undefined) ?? '';
    const options = (q.enum as string[] | undefined) ?? [];

    if (type === 'textarea') {
      const el = document.createElement('textarea');
      el.className = 'car-input';
      el.placeholder = placeholder;
      el.dataset['questionId'] = q.id;
      return el;
    }

    if (type === 'dropdown') {
      const el = document.createElement('select');
      el.className = 'car-input';
      el.dataset['questionId'] = q.id;
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        el.appendChild(o);
      }
      return el;
    }

    if (type === 'radio' || type === 'checkbox') {
      const wrap = document.createElement('div');
      wrap.className = 'car-input-wrap';
      wrap.dataset['questionId'] = q.id;
      const inputType = type === 'radio' ? 'radio' : 'checkbox';
      for (const opt of options) {
        const lbl = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = inputType;
        inp.name = q.id;
        inp.value = opt;
        inp.className = 'car-input';
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(opt));
        wrap.appendChild(lbl);
      }
      return wrap;
    }

    // Default: text input.
    const el = document.createElement('input');
    el.type = 'text';
    el.className = 'car-input';
    el.placeholder = placeholder;
    el.dataset['questionId'] = q.id;
    return el;
  }

  /**
   * Returns the per-element-instance ID used to namespace per-keystroke
   * localStorage saves (prefixed with `car:input:`).
   */
  private getSessionId(): string {
    return this.instanceId;
  }
}

customElements.define('chat-form', ChatFormElement);
