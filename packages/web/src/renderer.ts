import type {
  AnswerMap,
  ChatPage,
  ChatQuestion,
  HideAnimation,
} from '@richardmcquiston01/chat-and-react-core';

/** Called when the user clicks the Edit icon on an answered question. */
export type EditHandler = (routeIndex: number, questionId: string) => void;

/** Options choices are numbered 1-9 so they can be picked with the number keys. */
const MAX_NUMBERED_OPTIONS = 9;

/** Time each hide animation lasts before the bubble is removed from the layout. */
const HIDE_FADE_MS = 300;
const HIDE_POP_MS = 200;

/** What to show in place of a question while the "bot" is thinking. */
export interface ThinkingConfig {
  /** How long the thinking bubble stays, in milliseconds. */
  delay: number;
  /** Text to show instead of the animated dots. */
  text?: string;
}

export interface RenderPageOptions {
  showTitle?: boolean;
  /** Answers to pre-fill into the inputs. */
  values?: AnswerMap;
  /** Milliseconds per character for the typing effect. 0 or missing shows the question at once. */
  typingSpeed?: number;
  /** Shows a thinking bubble for this long before the first question appears. */
  thinking?: ThinkingConfig | null;
  /** Show the icon on the Continue button. Defaults to true. */
  showContinueIcon?: boolean;
  /**
   * Called once the question is fully shown and its input is ready. Runs straight
   * away when there is no thinking or typing, otherwise after they finish.
   */
  onReady?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Renders chat pages and bubbles into a Shadow DOM root. */
export class Renderer {
  private root: ShadowRoot;
  private chat: HTMLElement;
  private messageList: HTMLElement;
  private inputArea: HTMLElement | null = null;
  private editable = false;
  private editHandler: EditHandler | null = null;
  private animationTimers = new Set<number>();
  private editIconCount = 0;

  constructor(root: ShadowRoot) {
    this.root = root;

    this.chat = root.ownerDocument.createElement('div');
    this.chat.className = 'car-chat';
    this.chat.setAttribute('part', 'container');

    this.messageList = root.ownerDocument.createElement('div');
    this.messageList.className = 'car-messages';
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
    this.messageList.querySelectorAll('.car-edit').forEach((button) => {
      button.remove();
    });
    this.pruneEditIconCopies();
  }

  /**
   * Builds the icon inside an Edit button. Pages can supply their own by putting
   * an element (or a <template>) with `slot="edit-icon"` inside <chat-form>. Every
   * Edit button needs its own slot, because one slot can only show one thing, so
   * each button gets a uniquely named slot and a copy of the page's icon, placed
   * in the page (not the shadow DOM) so icon fonts and the page's CSS still apply.
   * The pencil is the fallback when the page supplies nothing.
   */
  private buildEditIcon(): HTMLElement {
    const doc = this.root.ownerDocument;
    const icon = doc.createElement('span');
    icon.className = 'car-edit-icon';
    icon.setAttribute('part', 'edit-icon');
    icon.setAttribute('aria-hidden', 'true');

    const slotName = `edit-icon-${this.editIconCount++}`;
    const slot = doc.createElement('slot');
    slot.setAttribute('name', slotName);
    slot.appendChild(doc.createTextNode('\u270E'));
    icon.appendChild(slot);

    this.addEditIconCopy(slotName);
    return icon;
  }

  /** Puts a copy of the page's `edit-icon` element in the page, assigned to the given slot. */
  private addEditIconCopy(slotName: string): void {
    const host = this.root.host;
    const source = Array.from(host.children).find(
      (child) => child.getAttribute('slot') === 'edit-icon',
    );
    if (!source) return;

    const doc = this.root.ownerDocument;
    let copy: HTMLElement;
    if (source instanceof HTMLTemplateElement) {
      copy = doc.createElement('span');
      copy.appendChild(source.content.cloneNode(true));
    } else {
      copy = source.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
    }
    copy.setAttribute('slot', slotName);
    copy.setAttribute('data-car-edit-icon', '');
    host.appendChild(copy);
  }

  /** Removes the page's icon copies whose Edit button is gone. */
  private pruneEditIconCopies(): void {
    const host = this.root.host;
    Array.from(host.children)
      .filter((child) => child.hasAttribute('data-car-edit-icon'))
      .forEach((copy) => {
        const slotName = copy.getAttribute('slot') ?? '';
        const stillUsed = Array.from(this.root.querySelectorAll('slot')).some(
          (slot) => slot.getAttribute('name') === slotName,
        );
        if (!stillUsed) copy.remove();
      });
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
    options: RenderPageOptions = {},
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

    let firstLabel: HTMLElement | null = null;
    let firstTitle = '';
    const hiddenUntilReady: HTMLElement[] = [];

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

      if (!firstLabel) {
        firstLabel = label;
        firstTitle = q.title;
      }
      hiddenUntilReady.push(el);
    }

    pageDiv.appendChild(inputWrap);

    const submit = this.buildSubmitButton(options.showContinueIcon !== false);
    pageDiv.appendChild(submit);
    hiddenUntilReady.push(submit);

    this.messageList.appendChild(pageDiv);
    this.inputArea = pageDiv;

    const typingSpeed = this.prefersReducedMotion() ? 0 : (options.typingSpeed ?? 0);
    const thinking = options.thinking && options.thinking.delay > 0 ? options.thinking : null;
    const shouldAnimate = firstLabel !== null && (typingSpeed > 0 || thinking !== null);

    if (!shouldAnimate || !firstLabel) {
      options.onReady?.();
      return;
    }

    // Keep the input and Continue button out of sight until the question has
    // been "thought about" and "typed".
    hiddenUntilReady.forEach((el) => {
      el.hidden = true;
    });
    this.animateQuestion(firstLabel, firstTitle, typingSpeed, thinking, () => {
      hiddenUntilReady.forEach((el) => {
        el.hidden = false;
      });
      options.onReady?.();
    });
  }

  /** Builds the Continue button: its label plus an icon the page can replace or hide. */
  private buildSubmitButton(showIcon: boolean): HTMLButtonElement {
    const doc = this.root.ownerDocument;
    const submit = doc.createElement('button');
    submit.className = 'car-btn-submit';
    submit.setAttribute('part', 'submit-btn');

    const labelEl = doc.createElement('span');
    labelEl.className = 'car-btn-label';
    labelEl.textContent = 'Continue';
    submit.appendChild(labelEl);

    if (showIcon) {
      // Pages can swap the icon by putting an element in the `continue-icon`
      // slot (for example an icon-font <i>), or restyle it through ::part(btn-icon).
      // The arrow below is the fallback shown when nothing is slotted in.
      const iconWrap = doc.createElement('span');
      iconWrap.className = 'car-btn-icon';
      iconWrap.setAttribute('part', 'btn-icon');
      iconWrap.setAttribute('aria-hidden', 'true');

      const slot = doc.createElement('slot');
      slot.setAttribute('name', 'continue-icon');
      slot.appendChild(this.buildDefaultContinueIcon());
      iconWrap.appendChild(slot);
      submit.appendChild(iconWrap);
    }
    return submit;
  }

  private buildDefaultContinueIcon(): SVGElement {
    const doc = this.root.ownerDocument;
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M3 8h9M8.5 4l4 4-4 4');
    svg.appendChild(path);
    return svg;
  }

  private prefersReducedMotion(): boolean {
    const view = this.root.ownerDocument.defaultView;
    return view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /**
   * Plays the "thinking" then "typing" sequence on a question bubble, then calls
   * `done`. Clicking the bubble skips straight to the finished question.
   */
  private animateQuestion(
    bubble: HTMLElement,
    text: string,
    typingSpeed: number,
    thinking: ThinkingConfig | null,
    done: () => void,
  ): void {
    const view = this.root.ownerDocument.defaultView;
    if (!view) {
      done();
      return;
    }
    const doc = this.root.ownerDocument;
    let finished = false;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      this.clearAnimationTimers();
      bubble.classList.remove('car-bubble--thinking');
      bubble.removeAttribute('aria-busy');
      bubble.textContent = text;
      done();
    };

    const startTyping = (): void => {
      bubble.classList.remove('car-bubble--thinking');
      if (typingSpeed <= 0 || text.length === 0) {
        finish();
        return;
      }

      // Screen readers get the whole question at once; the typed and untyped
      // spans below are for sighted users. The untyped part is invisible but
      // still takes up room, so the bubble does not grow as it types.
      bubble.textContent = '';
      const readable = doc.createElement('span');
      readable.className = 'car-sr-only';
      readable.textContent = text;
      const visual = doc.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      const typed = doc.createElement('span');
      const untyped = doc.createElement('span');
      untyped.className = 'car-untyped';
      untyped.textContent = text;
      visual.append(typed, untyped);
      bubble.append(readable, visual);

      let count = 0;
      const timerId = view.setInterval(() => {
        count += 1;
        typed.textContent = text.slice(0, count);
        untyped.textContent = text.slice(count);
        if (count >= text.length) finish();
      }, typingSpeed);
      this.animationTimers.add(timerId);
    };

    bubble.setAttribute('aria-busy', 'true');
    bubble.addEventListener('click', finish, { once: true });

    if (thinking) {
      bubble.classList.add('car-bubble--thinking');
      bubble.textContent = '';
      if (thinking.text) {
        bubble.textContent = thinking.text;
      } else {
        const dots = doc.createElement('span');
        dots.className = 'car-dots';
        dots.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i += 1) dots.appendChild(doc.createElement('span'));
        bubble.appendChild(dots);
      }
      this.animationTimers.add(view.setTimeout(startTyping, thinking.delay));
    } else {
      startTyping();
    }
  }

  private clearAnimationTimers(): void {
    const view = this.root.ownerDocument.defaultView;
    this.animationTimers.forEach((timerId) => {
      view?.clearTimeout(timerId);
      view?.clearInterval(timerId);
    });
    this.animationTimers.clear();
  }

  /** Stops any thinking / typing in progress, for example when the form is removed. */
  cancelAnimations(): void {
    this.clearAnimationTimers();
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
   * @returns The new question and answer bubbles, or nulls when an existing
   * answer was updated.
   */
  recordAnswer(
    routeIndex: number,
    questionId: string,
    questionTitle: string,
    answerText: string,
  ): { question: HTMLElement | null; answer: HTMLElement | null } {
    const existing = this.findUserBubble(routeIndex, questionId);
    if (existing) {
      const textEl = existing.querySelector('.car-bubble-text');
      if (textEl) textEl.textContent = answerText;
      return { question: null, answer: null };
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
      editButton.appendChild(this.buildEditIcon());
      answerBubble.appendChild(editButton);
    }

    this.messageList.appendChild(answerBubble);
    return { question: questionBubble, answer: answerBubble };
  }

  /** Removes every history bubble that belongs to a page after the given route index. */
  removeHistoryAfter(routeIndex: number): void {
    this.messageList.querySelectorAll<HTMLElement>('[data-route-index]').forEach((bubble) => {
      if (Number(bubble.dataset['routeIndex']) > routeIndex) bubble.remove();
    });
    this.pruneEditIconCopies();
  }

  /**
   * Hides a bubble and then takes it out of the layout. The bubble stays in the
   * DOM, marked hidden, so the page structure stays consistent.
   *
   * @param animation - `fade` fades it out, `pop` shrinks it away quickly, and
   * `none` hides it at once. Fade and pop also collapse the space it took up.
   */
  hideBubble(bubble: HTMLElement, animation: HideAnimation = 'fade'): void {
    bubble.setAttribute('aria-hidden', 'true');
    const view = this.root.ownerDocument.defaultView;
    if (animation === 'none' || !view) {
      bubble.hidden = true;
      return;
    }

    // Pin the current height so it can animate down to nothing.
    bubble.style.maxHeight = `${bubble.offsetHeight}px`;
    void bubble.offsetHeight;
    bubble.classList.add(
      'car-bubble--collapsing',
      animation === 'pop' ? 'car-bubble--pop' : 'car-bubble--fading',
    );
    view.setTimeout(
      () => {
        bubble.hidden = true;
      },
      animation === 'pop' ? HIDE_POP_MS : HIDE_FADE_MS,
    );
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
    this.clearAnimationTimers();
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
