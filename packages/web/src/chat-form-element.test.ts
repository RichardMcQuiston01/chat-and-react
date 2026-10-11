import { describe, it, expect, afterEach } from 'vitest';
import './index.js'; // registers <chat-form>

const minimalSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [{
    id: 'p1',
    title: 'Page One',
    questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'What is your name?' }],
    branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
  }],
});

const twoPageSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [
    {
      id: 'p1', title: 'P1',
      questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Pick?', enum: ['A', 'B'] }],
      branching: [
        { type: 'if', form_element: 'q1', value: 'A', destination_id: 'p2' },
        { type: 'always', destination_id: '**FORM_COMPLETED**' },
      ],
    },
    {
      id: 'p2', title: 'P2',
      questions: [{ id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Tell us more' }],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    },
  ],
});

function mount(schema: string): HTMLElement {
  const el = document.createElement('chat-form');
  el.setAttribute('schema', schema);
  document.body.appendChild(el);
  return el;
}

function getShadow(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

describe('<chat-form>', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  it('renders the first question once, inside the input area, on connect', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const labels = Array.from(shadow.querySelectorAll('.car-bubble')).filter(
      (b) => b.textContent === 'What is your name?',
    );
    expect(labels).toHaveLength(1);
    expect(shadow.querySelector('[part="input-area"]')?.contains(labels[0])).toBe(true);
    expect(shadow.querySelector('[part="bubble-bot"]')).toBeNull();
  });

  it('renders an input-area with a submit button', () => {
    el = mount(minimalSchema);
    const btn = getShadow(el).querySelector('[part="submit-btn"]');
    expect(btn).not.toBeNull();
  });

  it('renders a user bubble after submit and removes input-area', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const input = shadow.querySelector('input') as HTMLInputElement;
    input.value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    const userBubble = shadow.querySelector('[part="bubble-user"]');
    expect(userBubble?.textContent).toBe('Alice');
    expect(shadow.querySelector('[part="input-area"]')).toBeNull();
  });

  it('submits the page when Enter is pressed in a text input', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const events: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => events.push(e as CustomEvent));
    const input = shadow.querySelector('input') as HTMLInputElement;
    input.value = 'Alice';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(events).toHaveLength(1);
    expect(events[0].detail.allAnswers).toEqual({ q1: 'Alice' });
  });

  describe('a page with several questions', () => {
    const twoQuestionSchema = JSON.stringify({
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1',
        title: 'Page One',
        questions: [
          { id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'First?' },
          { id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
        ],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      }],
    });

    function activeLabels(shadow: ShadowRoot): (string | null)[] {
      return Array.from(shadow.querySelectorAll('.car-page .car-bubble')).map((b) => b.textContent);
    }

    function press(shadow: ShadowRoot, key: 'click' | 'Enter'): void {
      if (key === 'click') {
        shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
        return;
      }
      (shadow.querySelector('input') as HTMLInputElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    }

    it('asks one question at a time, each with its own Continue button', () => {
      el = mount(twoQuestionSchema);
      const shadow = getShadow(el);
      expect(activeLabels(shadow)).toEqual(['Page One', 'First?']);
      expect(shadow.querySelectorAll('[part="submit-btn"]')).toHaveLength(1);

      (shadow.querySelector('input') as HTMLInputElement).value = 'one';
      press(shadow, 'click');

      expect(activeLabels(shadow)).toEqual(['Second?']);
      expect(shadow.querySelectorAll('[part="submit-btn"]')).toHaveLength(1);
    });

    it('fires chat-page-submit once, after the last question, with every answer', () => {
      el = mount(twoQuestionSchema);
      const shadow = getShadow(el);
      const pageEvents: CustomEvent[] = [];
      const completeEvents: CustomEvent[] = [];
      el.addEventListener('chat-page-submit', (e) => pageEvents.push(e as CustomEvent));
      el.addEventListener('chat-form-complete', (e) => completeEvents.push(e as CustomEvent));

      (shadow.querySelector('input') as HTMLInputElement).value = 'one';
      press(shadow, 'click');
      expect(pageEvents).toHaveLength(0);

      (shadow.querySelector('input') as HTMLInputElement).value = 'two';
      press(shadow, 'click');
      expect(pageEvents).toHaveLength(1);
      expect(pageEvents[0].detail.answers).toEqual({ q1: 'one', q2: 'two' });
      expect(completeEvents).toHaveLength(1);
    });

    it('treats Enter like Continue on each question', () => {
      el = mount(twoQuestionSchema);
      const shadow = getShadow(el);
      const completeEvents: CustomEvent[] = [];
      el.addEventListener('chat-form-complete', (e) => completeEvents.push(e as CustomEvent));

      (shadow.querySelector('input') as HTMLInputElement).value = 'one';
      press(shadow, 'Enter');
      expect(activeLabels(shadow)).toEqual(['Second?']);
      expect(completeEvents).toHaveLength(0);

      (shadow.querySelector('input') as HTMLInputElement).value = 'two';
      press(shadow, 'Enter');
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0].detail.allAnswers).toEqual({ q1: 'one', q2: 'two' });
    });

    it('keeps the page title and each answered question in the history, in order', () => {
      el = mount(twoQuestionSchema);
      const shadow = getShadow(el);
      (shadow.querySelector('input') as HTMLInputElement).value = 'one';
      press(shadow, 'click');
      (shadow.querySelector('input') as HTMLInputElement).value = 'two';
      press(shadow, 'click');

      const history = Array.from(
        shadow.querySelectorAll('[part="bubble-bot"], [part="bubble-user"]'),
      ).map((b) => b.textContent);
      expect(history).toEqual(['Page One', 'First?', 'one', 'Second?', 'two']);
    });

    it('moves focus to the new question after Continue', () => {
      el = mount(twoQuestionSchema);
      const shadow = getShadow(el);
      (shadow.querySelector('input') as HTMLInputElement).value = 'one';
      press(shadow, 'click');
      expect(shadow.activeElement).toBe(shadow.querySelector('input'));
    });
  });

  it('keeps each answered question and its answer in the history, in order', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    (shadow.querySelector('input') as HTMLInputElement).value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    const history = Array.from(
      shadow.querySelectorAll('[part="bubble-bot"], [part="bubble-user"]'),
    ).map((b) => b.textContent);
    expect(history).toEqual(['What is your name?', 'Alice']);
  });

  it('fires chat-form-complete after final answer on single-page form', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    const events: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => events.push(e as CustomEvent));
    (shadow.querySelector('input') as HTMLInputElement).value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    expect(events).toHaveLength(1);
    expect(events[0].detail.allAnswers).toEqual({ q1: 'Alice' });
  });

  it('fires chat-page-submit before navigating to next page', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const pageEvents: CustomEvent[] = [];
    el.addEventListener('chat-page-submit', (e) => pageEvents.push(e as CustomEvent));
    const radio = shadow.querySelector('input[value="A"]') as HTMLInputElement;
    radio.checked = true;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    expect(pageEvents).toHaveLength(1);
    expect(pageEvents[0].detail.pageId).toBe('p1');
  });

  it('renders next page question after navigating', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const radio = shadow.querySelector('input[value="A"]') as HTMLInputElement;
    radio.checked = true;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    const history = Array.from(
      shadow.querySelectorAll('[part="bubble-bot"], [part="bubble-user"]'),
    ).map((b) => b.textContent);
    expect(history).toEqual(['Pick?', 'A']);
    const labels = Array.from(shadow.querySelectorAll('.car-page .car-bubble')).map(
      (b) => b.textContent,
    );
    expect(labels).toContain('Tell us more');
  });

  it('dispatches chat-error for invalid schema JSON', () => {
    el = document.createElement('chat-form');
    el.setAttribute('schema', 'not-json');
    const errors: CustomEvent[] = [];
    el.addEventListener('chat-error', (e) => errors.push(e as CustomEvent));
    document.body.appendChild(el);
    expect(errors).toHaveLength(1);
    expect(errors[0].detail.code).toBe('SCHEMA_INVALID');
  });

  it('exposes CSS parts on shadow DOM elements', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    expect(shadow.querySelector('[part="container"]')).not.toBeNull();
    expect(shadow.querySelector('[part="message-list"]')).not.toBeNull();
    expect(shadow.querySelector('[part="input-area"]')).not.toBeNull();
  });
});
