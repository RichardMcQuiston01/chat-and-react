import type { ChatPage, ChatQuestion } from '@chat-and-react/core';

/** Renders chat pages and bubbles into a Shadow DOM root. */
export class Renderer {
  private root: ShadowRoot;
  private chat: HTMLElement;
  private inputArea: HTMLElement | null = null;

  constructor(root: ShadowRoot) {
    this.root = root;
    this.chat = root.ownerDocument.createElement('div');
    this.chat.className = 'car-chat';
    this.root.appendChild(this.chat);
  }

  /** Render a page's questions as bot bubbles + input widgets. */
  renderPage(page: ChatPage, visibleQuestions: ChatQuestion[]): void {
    this.clearInputArea();
    const pageDiv = this.root.ownerDocument.createElement('div');
    pageDiv.className = 'car-page';

    if (page.title) {
      const titleBubble = this.root.ownerDocument.createElement('div');
      titleBubble.className = 'car-bubble';
      titleBubble.textContent = page.title;
      pageDiv.appendChild(titleBubble);
    }

    const inputWrap = this.root.ownerDocument.createElement('div');
    inputWrap.className = 'car-input-wrap';

    for (const q of visibleQuestions) {
      const label = this.root.ownerDocument.createElement('div');
      label.className = 'car-bubble';
      label.textContent = q.title;
      pageDiv.appendChild(label);

      const el = this.buildInput(q);
      el.dataset['questionId'] = q.id;
      inputWrap.appendChild(el);
    }

    pageDiv.appendChild(inputWrap);

    const submit = this.root.ownerDocument.createElement('button');
    submit.className = 'car-btn-submit';
    submit.textContent = 'Continue';
    pageDiv.appendChild(submit);

    this.chat.appendChild(pageDiv);
    this.inputArea = pageDiv;
  }

  /** Append a user-reply bubble to the chat. */
  appendUserBubble(text: string): void {
    const div = this.root.ownerDocument.createElement('div');
    div.className = 'car-bubble car-bubble--user';
    div.textContent = text;
    this.chat.appendChild(div);
  }

  /** Remove the active input area from the chat. */
  clearInputArea(): void {
    if (this.inputArea) {
      this.inputArea.remove();
      this.inputArea = null;
    }
  }

  private buildInput(q: ChatQuestion): HTMLElement {
    const doc = this.root.ownerDocument;
    const type = q['x-chat-input'];
    const placeholder = (q['x-chat-placeholder'] as string | undefined) ?? '';
    const options = (q.enum as string[] | undefined) ?? [];

    if (type === 'textarea') {
      const el = doc.createElement('textarea');
      el.className = 'car-input';
      el.placeholder = placeholder;
      return el;
    }

    if (type === 'dropdown') {
      const el = doc.createElement('select');
      el.className = 'car-input';
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
      for (const opt of options) {
        const lbl = doc.createElement('label');
        const inp = doc.createElement('input');
        inp.type = type === 'radio' ? 'radio' : 'checkbox';
        inp.name = q.id;
        inp.value = opt;
        inp.className = 'car-input';
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
    el.placeholder = placeholder;
    return el;
  }
}
