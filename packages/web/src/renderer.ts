import type { ChatPage, ChatQuestion } from '@chat-and-react/core';

/** Renders chat pages and bubbles into a Shadow DOM root. */
export class Renderer {
  private root: ShadowRoot;
  private chat: HTMLElement;
  private messageList: HTMLElement;
  private inputArea: HTMLElement | null = null;

  constructor(root: ShadowRoot) {
    this.root = root;

    this.chat = root.ownerDocument.createElement('div');
    this.chat.className = 'car-chat';
    this.chat.setAttribute('part', 'container');

    this.messageList = root.ownerDocument.createElement('div');
    this.messageList.setAttribute('part', 'message-list');

    this.chat.appendChild(this.messageList);
    this.root.appendChild(this.chat);
  }

  /**
   * Render a page's questions as bot bubbles + input widgets.
   *
   * Creates a `.car-page` container holding the page title bubble, one
   * `.car-bubble` per visible question, the input wrap, and the submit button.
   * The page container is tracked as the active input area and is removed by
   * the next call to `clearInputArea` or `renderPage`.
   */
  renderPage(page: ChatPage, visibleQuestions: ChatQuestion[]): void {
    this.clearInputArea();
    const doc = this.root.ownerDocument;

    const pageDiv = doc.createElement('div');
    pageDiv.className = 'car-page';
    pageDiv.setAttribute('part', 'input-area');

    if (page.title) {
      const titleBubble = doc.createElement('div');
      titleBubble.className = 'car-bubble';
      titleBubble.textContent = page.title;
      pageDiv.appendChild(titleBubble);
    }

    const inputWrap = doc.createElement('div');
    inputWrap.className = 'car-input-wrap';
    inputWrap.setAttribute('part', 'input-wrap');

    for (const q of visibleQuestions) {
      // Label bubble inside the page (carries class, no part attribute so that
      // persistent bubbles appended via appendBotBubble are the canonical
      // source for [part="bubble-bot"] queries).
      const label = doc.createElement('div');
      label.className = 'car-bubble';
      label.textContent = q.title;
      pageDiv.appendChild(label);

      const el = this.buildInput(q);
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
   * Unlike the label bubbles inside a page, this bubble survives
   * calls to `clearInputArea` / `renderPage`.
   */
  appendBotBubble(text: string): void {
    const div = this.root.ownerDocument.createElement('div');
    div.className = 'car-bubble';
    div.setAttribute('part', 'bubble-bot');
    div.textContent = text;
    this.messageList.appendChild(div);
  }

  /** Append a user-reply bubble to the message list. */
  appendUserBubble(text: string): void {
    const div = this.root.ownerDocument.createElement('div');
    div.className = 'car-bubble car-bubble--user';
    div.setAttribute('part', 'bubble-user');
    div.textContent = text;
    this.messageList.appendChild(div);
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

  private buildInput(q: ChatQuestion): HTMLElement {
    const doc = this.root.ownerDocument;
    const type = q['x-chat-input'];
    const placeholder = (q['x-chat-placeholder'] as string | undefined) ?? '';
    const options = (q.enum as string[] | undefined) ?? [];

    if (type === 'textarea') {
      const el = doc.createElement('textarea');
      el.className = 'car-input';
      el.setAttribute('part', 'input');
      el.placeholder = placeholder;
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
      return el;
    }

    if (type === 'radio' || type === 'checkbox') {
      const wrap = doc.createElement('div');
      wrap.className = 'car-input-wrap';
      wrap.setAttribute('part', 'input-wrap');
      for (const opt of options) {
        const lbl = doc.createElement('label');
        const inp = doc.createElement('input');
        inp.type = type === 'radio' ? 'radio' : 'checkbox';
        inp.name = q.id;
        inp.value = opt;
        inp.className = 'car-input';
        inp.setAttribute('part', 'input');
        lbl.appendChild(inp);
        lbl.appendChild(doc.createTextNode(opt));
        wrap.appendChild(lbl);
      }
      return wrap;
    }

    // default: text
    const el = doc.createElement('input');
    el.type = 'text';
    el.className = 'car-input';
    el.setAttribute('part', 'input');
    el.placeholder = placeholder;
    return el;
  }
}
