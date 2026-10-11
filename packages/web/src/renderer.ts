import type { AnswerMap, ChatPage, ChatQuestion } from '@richardmcquiston01/chat-and-react-core';

/** Called when the user clicks the Edit icon on an answered question. */
export type EditHandler = (routeIndex: number, questionId: string) => void;

/** Options choices are numbered 1-9 so they can be picked with the number keys. */
const MAX_NUMBERED_OPTIONS = 9;

/** Time the fade-out lasts before a hidden bubble is removed from the layout. */
const HIDE_FADE_MS = 300;

/** Renders chat pages and bubbles into a Shadow DOM root. */
export class Renderer {
  private root: ShadowRoot;
  private chat: HTMLElement;
  private messageList: HTMLElement;
  private inputArea: HTMLElement | null = null;
  private editable = false;
  private editHandler: EditHandler | null = null;

  constructor(root: ShadowRoot) {
    this.root = root;

    this.chat = root.ownerDocument.createElement('div');
    this.chat.className = 'car-chat';
    this.chat.setAttribute('part', 'container');

    this.messageList = root.ownerDocument.createElement('div');
    this.messageList.setAttribute('part', 'message-list');

    this.chat.appendChild(this.messageList);
    this.root.appendChild(this.chat);

    // One listener handles every Edit icon, including ones added later.
    this.messageList.addEventListener('click', (event: Event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('.car-edit');
      if (!button || !this.editHandler) return;
      const bubble = button.closest<HTMLElement>('[data-route-index]');
      const routeIndex = Number(bubble?.dataset['routeIndex']);
      const questionId = bubble?.dataset['questionId'];
      if (Number.isNaN(routeIndex) || !questionId) return;
      this.editHandler(routeIndex, questionId);
    });
  }

  /** Turns the Edit icon on or off for answers recorded from now on. */
  setEditable(editable: boolean, handler?: EditHandler): void {
    this.editable = editable;
    if (handler) this.editHandler = handler;
    if (!editable) this.removeEditButtons();
  }

  /** Removes every Edit icon, for example once the form is complete. */
  removeEditButtons(): void {
    this.editable = false;
    this.messageList.querySelectorAll('.car-edit').forEach((button) => button.remove());
  }

  /**
   * Render a page's questions as bot bubbles + input widgets.
   *
   * Creates a `.car-page` container holding the page title bubble, the input
   * wrap (one `.car-bubble` label followed by its input for each visible
   * question), and the submit button.
   * Pass `showTitle: false` to leave the title bubble out, for the later steps
   * of a page whose questions are asked one at a time. Pass `values` to
   * pre-fill inputs, for example when the user edits an earlier answer.
   * The page container is tracked as the active input area and is removed by
   * the next call to `clearInputArea` or `renderPage`.
   */
  renderPage(
    page: ChatPage,
    visibleQuestions: ChatQuestion[],
    options: { showTitle?: boolean; values?: AnswerMap } = {},
  ): void {
    this.clearInputArea();
    const doc = this.root.ownerDocument;

    const pageDiv = doc.createElement('div');
    pageDiv.className = 'car-page';
    pageDiv.setAttribute('part', 'input-area');

    if (page.title && options.showTitle !== false) {
      const titleBubble = doc.createElement('div');
      titleBubble.className = 'car-bubble';
      titleBubble.textContent = page.title;
      pageDiv.appendChild(titleBubble);
    }

    const inputWrap = doc.createElement('div');
    inputWrap.className = 'car-input-wrap';
    inputWrap.setAttribute('part', 'input-wrap');

    for (const q of visibleQuestions) {
      // Label bubble sits directly above its own input. It carries no `part`
      // attribute: [part="bubble-bot"] is reserved for the persistent bubbles
      // appended via appendBotBubble once a page has been answered.
      const label = doc.createElement('div');
      label.className = 'car-bubble';
      label.textContent = q.title;
      inputWrap.appendChild(label);

      const el = this.buildInput(q, options.values?.[q.id]);
      el.dataset['questionId'] = q.id;
      inputWrap.appendChild(el);
    }

    pageDiv.appendChild(inputWrap);

    const submit = doc.createElement('button');
    submit.className = 'car-btn-submit';
    submit.setAttribute('part', 'submit-btn');
    submit.textContent = 'Continue';
    pageDiv.appendChild(submit);

    this.messageList.appendChild(pageDiv);
    this.inputArea = pageDiv;
  }

  /**
   * Append a persistent bot-side chat bubble to the message list.
   * Unlike the label bubbles inside an active page, this bubble survives
   * calls to `clearInputArea` / `renderPage`.
   */
  appendBotBubble(text: string, routeIndex?: number): HTMLElement {
    const div = this.root.ownerDocument.createElement('div');
    div.className = 'car-bubble';
    div.setAttribute('part', 'bubble-bot');
    div.textContent = text;
    if (routeIndex !== undefined) div.dataset['routeIndex'] = String(routeIndex);
    this.messageList.appendChild(div);
    return div;
  }

  /** Append a user-reply bubble to the message list. */
  appendUserBubble(text: string): void {
    const div = this.root.ownerDocument.createElement('div');
    div.className = 'car-bubble car-bubble--user';
    div.setAttribute('part', 'bubble-user');
    div.textContent = text;
    this.messageList.appendChild(div);
  }

  /**
   * Records an answered question in the chat history as a question bubble and an
   * answer bubble. If the same question was already recorded for this page, its
   * answer is updated in place instead, so an edited answer keeps its position.
   *
   * @param routeIndex - Position of the page in the controller's route.
   * @returns The question bubble when a new pair was added, otherwise null.
   */
  recordAnswer(
    routeIndex: number,
    questionId: string,
    questionTitle: string,
    answerText: string,
  ): HTMLElement | null {
    const existing = this.findUserBubble(routeIndex, questionId);
    if (existing) {
      const textEl = existing.querySelector('.car-bubble-text');
      if (textEl) textEl.textContent = answerText;
      return null;
    }

    const doc = this.root.ownerDocument;
    const questionBubble = this.appendBotBubble(questionTitle, routeIndex);
    questionBubble.dataset['questionId'] = questionId;

    const answerBubble = doc.createElement('div');
    answerBubble.className = 'car-bubble car-bubble--user';
    answerBubble.setAttribute('part', 'bubble-user');
    answerBubble.dataset['routeIndex'] = String(routeIndex);
    answerBubble.dataset['questionId'] = questionId;

    const textEl = doc.createElement('span');
    textEl.className = 'car-bubble-text';
    textEl.textContent = answerText;
    answerBubble.appendChild(textEl);

    if (this.editable) {
      const editButton = doc.createElement('button');
      editButton.type = 'button';
      editButton.className = 'car-edit';
      editButton.setAttribute('part', 'edit-btn');
      editButton.setAttribute('aria-label', `Edit your answer to: ${questionTitle}`);
      editButton.title = 'Edit answer';
      editButton.textContent = '\u270E';
      answerBubble.appendChild(editButton);
    }

    this.messageList.appendChild(answerBubble);
    return questionBubble;
  }

  /** Removes every history bubble that belongs to a page after the given route index. */
  removeHistoryAfter(routeIndex: number): void {
    this.messageList.querySelectorAll<HTMLElement>('[data-route-index]').forEach((bubble) => {
      if (Number(bubble.dataset['routeIndex']) > routeIndex) bubble.remove();
    });
  }

  /**
   * Fades a bubble out and then takes it out of the layout. The bubble stays in
   * the DOM, hidden, so screen readers and the page structure stay consistent.
   */
  hideBubble(bubble: HTMLElement): void {
    bubble.classList.add('car-bubble--fading');
    bubble.setAttribute('aria-hidden', 'true');
    this.root.ownerDocument.defaultView?.setTimeout(() => {
      bubble.hidden = true;
    }, HIDE_FADE_MS);
  }

  private findUserBubble(routeIndex: number, questionId: string): HTMLElement | null {
    return (
      Array.from(
        this.messageList.querySelectorAll<HTMLElement>('.car-bubble--user[data-route-index]'),
      ).find(
        (bubble) =>
          bubble.dataset['routeIndex'] === String(routeIndex) &&
          bubble.dataset['questionId'] === questionId,
      ) ?? null
    );
  }

  /** Remove the active input area (.car-page) from the chat. */
  clearInputArea(): void {
    if (this.inputArea) {
      this.inputArea.remove();
      this.inputArea = null;
    }
  }

  /** Returns the active input area element, or null if none is rendered. */
  getInputArea(): HTMLElement | null {
    return this.inputArea;
  }

  private buildInput(q: ChatQuestion, value?: string | string[]): HTMLElement {
    const doc = this.root.ownerDocument;
    const type = q['x-chat-input'];
    const placeholder = (q['x-chat-placeholder'] as string | undefined) ?? '';
    // Array questions (checkbox) declare their choices under `items.enum`.
    const options = q.enum ?? q.items?.enum ?? [];

    if (type === 'textarea') {
      const el = doc.createElement('textarea');
      el.className = 'car-input';
      el.setAttribute('part', 'input');
      el.placeholder = placeholder;
      if (typeof value === 'string') el.value = value;
      return el;
    }

    if (type === 'dropdown') {
      const el = doc.createElement('select');
      el.className = 'car-input';
      el.setAttribute('part', 'input');
      for (const opt of options) {
        const o = doc.createElement('option');
        o.value = opt;
        o.textContent = opt;
        el.appendChild(o);
      }
      if (typeof value === 'string' && options.includes(value)) el.value = value;
      return el;
    }

    if (type === 'radio' || type === 'checkbox') {
      const wrap = doc.createElement('div');
      wrap.className = 'car-input-wrap';
      wrap.setAttribute('part', 'input-wrap');
      const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
      options.forEach((opt, index) => {
        const lbl = doc.createElement('label');
        lbl.className = 'car-option';
        const inp = doc.createElement('input');
        inp.type = type === 'radio' ? 'radio' : 'checkbox';
        inp.name = q.id;
        inp.value = opt;
        inp.className = 'car-input';
        inp.setAttribute('part', 'input');
        inp.checked = selected.includes(opt);
        lbl.appendChild(inp);

        // The first nine options show their number; pressing it picks the option.
        if (index < MAX_NUMBERED_OPTIONS) {
          const number = doc.createElement('span');
          number.className = 'car-option-number';
          number.setAttribute('aria-hidden', 'true');
          number.textContent = String(index + 1);
          inp.setAttribute('aria-keyshortcuts', String(index + 1));
          lbl.appendChild(number);
        }

        lbl.appendChild(doc.createTextNode(opt));
        wrap.appendChild(lbl);
      });
      return wrap;
    }

    // default: text
    const el = doc.createElement('input');
    el.type = 'text';
    el.className = 'car-input';
    el.setAttribute('part', 'input');
    el.placeholder = placeholder;
    if (typeof value === 'string') el.value = value;
    return el;
  }
}
