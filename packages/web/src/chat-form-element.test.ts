import { describe, it, expect, afterEach, vi } from 'vitest';
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

  it('submits the page when Enter is pressed on a dropdown', () => {
    const dropdownSchema = JSON.stringify({
      'x-chat-version': '1',
      'x-chat-pages': [{
        id: 'p1', title: 'P1',
        questions: [{ id: 'q1', type: 'string', 'x-chat-input': 'dropdown', title: 'Where?', enum: ['UK', 'US'] }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      }],
    });
    el = mount(dropdownSchema);
    const shadow = getShadow(el);
    const events: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => events.push(e as CustomEvent));
    const select = shadow.querySelector('select') as HTMLSelectElement;
    select.value = 'US';
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(events).toHaveLength(1);
    expect(events[0].detail.allAnswers).toEqual({ q1: 'US' });
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

function schemaWithOptions(schema: string, options: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(schema), 'x-chat-options': options });
}

function key(target: Element, pressed: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: pressed, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('<chat-form> number keys', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  const checkboxSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-pages': [{
      id: 'p1',
      title: 'P1',
      questions: [{
        id: 'topics', type: 'array', 'x-chat-input': 'checkbox', title: 'Topics?',
        items: { enum: ['Tech', 'Art', 'Sport'] },
      }],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    }],
  });

  it('shows a number next to each radio option', () => {
    el = mount(twoPageSchema);
    const numbers = Array.from(getShadow(el).querySelectorAll('.car-option-number')).map(
      (n) => n.textContent,
    );
    expect(numbers).toEqual(['1', '2']);
  });

  it('selects the matching radio option when its number is pressed', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const radios = Array.from(shadow.querySelectorAll('input')) as HTMLInputElement[];

    const event = key(radios[0], '2');
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it('toggles the matching checkbox each time its number is pressed', () => {
    el = mount(checkboxSchema);
    const shadow = getShadow(el);
    const boxes = Array.from(shadow.querySelectorAll('input')) as HTMLInputElement[];

    key(boxes[0], '3');
    expect(boxes[2].checked).toBe(true);
    key(boxes[2], '3');
    expect(boxes[2].checked).toBe(false);
  });

  it('submits the numbered choices like clicked ones', () => {
    el = mount(checkboxSchema);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));
    const boxes = Array.from(shadow.querySelectorAll('input')) as HTMLInputElement[];

    key(boxes[0], '1');
    key(boxes[0], '3');
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
    expect(completed[0].detail.allAnswers).toEqual({ topics: ['Tech', 'Sport'] });
  });

  it('ignores a number with no matching option', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const radios = Array.from(shadow.querySelectorAll('input')) as HTMLInputElement[];

    const event = key(radios[0], '7');
    expect(radios.some((radio) => radio.checked)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('leaves numbers alone in a text input so they can be typed', () => {
    el = mount(minimalSchema);
    const input = getShadow(el).querySelector('input') as HTMLInputElement;
    const event = key(input, '1');
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('<chat-form> auto-hide questions', () => {
  let el: HTMLElement;

  afterEach(() => {
    vi.useRealTimers();
    el?.remove();
  });

  function answerFirst(shadow: ShadowRoot): void {
    (shadow.querySelector('input') as HTMLInputElement).value = 'Alice';
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
  }

  const twoStepSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-pages': [{
      id: 'p1', title: 'P1',
      questions: [
        { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
        { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
      ],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    }],
  });

  it('hides an answered question after the delay but keeps the answer', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(twoStepSchema, { autoHideQuestions: 1000 }));
    const shadow = getShadow(el);
    answerFirst(shadow);

    const question = Array.from(shadow.querySelectorAll('[part="bubble-bot"]')).find(
      (b) => b.textContent === 'First?',
    ) as HTMLElement;
    expect(question.hidden).toBe(false);

    vi.advanceTimersByTime(999);
    expect(question.classList.contains('car-bubble--fading')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(question.classList.contains('car-bubble--fading')).toBe(true);

    vi.advanceTimersByTime(300);
    expect(question.hidden).toBe(true);
    expect(shadow.querySelector('[part="bubble-user"]')?.textContent).toBe('Alice');
  });

  it('does nothing by default', () => {
    vi.useFakeTimers();
    el = mount(twoStepSchema);
    const shadow = getShadow(el);
    answerFirst(shadow);

    vi.advanceTimersByTime(60_000);
    const hidden = Array.from(shadow.querySelectorAll('[part="bubble-bot"]')).filter(
      (b) => (b as HTMLElement).hidden,
    );
    expect(hidden).toHaveLength(0);
  });

  it('lets the auto-hide-questions attribute override the schema', () => {
    vi.useFakeTimers();
    el = document.createElement('chat-form');
    el.setAttribute('schema', schemaWithOptions(twoStepSchema, { autoHideQuestions: 60_000 }));
    el.setAttribute('auto-hide-questions', '500');
    document.body.appendChild(el);
    const shadow = getShadow(el);
    answerFirst(shadow);

    vi.advanceTimersByTime(800);
    const question = Array.from(shadow.querySelectorAll('[part="bubble-bot"]')).find(
      (b) => b.textContent === 'First?',
    ) as HTMLElement;
    expect(question.hidden).toBe(true);
  });
});

describe('<chat-form> editing answers', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  const routeSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-options': { allowEdit: true },
    'x-chat-pages': [
      {
        id: 'p1', title: 'P1',
        questions: [{ id: 'choice', type: 'string', 'x-chat-input': 'radio', title: 'Pick?', enum: ['A', 'B'] }],
        branching: [
          { type: 'if', form_element: 'choice', value: 'A', destination_id: 'p2' },
          { type: 'always', destination_id: 'p4' },
        ],
      },
      {
        id: 'p2', title: 'P2',
        questions: [{ id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Q2?' }],
        branching: [{ type: 'always', destination_id: 'p3' }],
      },
      {
        id: 'p3', title: 'P3',
        questions: [{ id: 'q3', type: 'string', 'x-chat-input': 'text', title: 'Q3?' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
      {
        id: 'p4', title: 'P4',
        questions: [{ id: 'q4', type: 'string', 'x-chat-input': 'text', title: 'Q4?' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
  });

  const twoQuestionPage = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-options': { allowEdit: true },
    'x-chat-pages': [{
      id: 'p1', title: 'P1',
      questions: [
        { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
        { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
      ],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    }],
  });

  function pickAndContinue(shadow: ShadowRoot, value: string): void {
    (shadow.querySelector(`input[value="${value}"]`) as HTMLInputElement).checked = true;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
  }

  function typeAndContinue(shadow: ShadowRoot, value: string): void {
    (shadow.querySelector('input') as HTMLInputElement).value = value;
    shadow.querySelector('[part="submit-btn"]')!.dispatchEvent(new Event('click'));
  }

  function activeLabels(shadow: ShadowRoot): (string | null)[] {
    return Array.from(shadow.querySelectorAll('.car-page .car-bubble')).map((b) => b.textContent);
  }

  function historyTexts(shadow: ShadowRoot): (string | null)[] {
    return Array.from(shadow.querySelectorAll('[part="bubble-bot"], [part="bubble-user"]')).map(
      (b) => b.querySelector('.car-bubble-text')?.textContent ?? b.textContent,
    );
  }

  it('shows no Edit icon unless allowEdit is on', () => {
    el = mount(JSON.stringify({ ...JSON.parse(routeSchema), 'x-chat-options': {} }));
    const shadow = getShadow(el);
    pickAndContinue(shadow, 'A');
    expect(shadow.querySelectorAll('.car-edit')).toHaveLength(0);
  });

  it('shows an Edit icon on each answer when allowEdit is on', () => {
    el = mount(routeSchema);
    const shadow = getShadow(el);
    pickAndContinue(shadow, 'A');
    expect(shadow.querySelectorAll('.car-edit')).toHaveLength(1);
  });

  it('lets the allow-edit attribute override the schema', () => {
    el = document.createElement('chat-form');
    el.setAttribute('schema', routeSchema);
    el.setAttribute('allow-edit', 'false');
    document.body.appendChild(el);
    const shadow = getShadow(el);
    pickAndContinue(shadow, 'A');
    expect(shadow.querySelectorAll('.car-edit')).toHaveLength(0);
  });

  it('re-opens an earlier question with the old answer filled in', () => {
    el = mount(routeSchema);
    const shadow = getShadow(el);
    pickAndContinue(shadow, 'A');
    (shadow.querySelector('.car-edit') as HTMLElement).click();

    expect(activeLabels(shadow)).toContain('Pick?');
    expect((shadow.querySelector('input[value="A"]') as HTMLInputElement).checked).toBe(true);
  });

  it('returns to the page the user was on when the route is unchanged', () => {
    el = mount(routeSchema);
    const shadow = getShadow(el);
    const submits: CustomEvent[] = [];
    el.addEventListener('chat-page-submit', (e) => submits.push(e as CustomEvent));

    pickAndContinue(shadow, 'A');
    typeAndContinue(shadow, 'two');
    expect(activeLabels(shadow)).toContain('Q3?');

    (shadow.querySelector('.car-edit') as HTMLElement).click();
    pickAndContinue(shadow, 'A');

    expect(activeLabels(shadow)).toContain('Q3?');
    expect(submits).toHaveLength(3);
    expect(submits[2].detail).toMatchObject({ pageId: 'p1', edited: true });
    // The earlier page's history is still there.
    expect(historyTexts(shadow)).toEqual(['Pick?', 'A', 'Q2?', 'two']);
  });

  it('drops the abandoned pages from the chat when the answer changes the route', () => {
    el = mount(routeSchema);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));

    pickAndContinue(shadow, 'A');
    typeAndContinue(shadow, 'two');
    (shadow.querySelector('.car-edit') as HTMLElement).click();
    pickAndContinue(shadow, 'B');

    expect(activeLabels(shadow)).toContain('Q4?');
    expect(historyTexts(shadow)).toEqual(['Pick?', 'B']);

    typeAndContinue(shadow, 'four');
    expect(completed[0].detail.allAnswers).toEqual({ choice: 'B', q4: 'four' });
  });

  it('edits a question on the page being asked and updates its answer in place', () => {
    el = mount(twoQuestionPage);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));

    typeAndContinue(shadow, 'one');
    expect(activeLabels(shadow)).toContain('Second?');

    (shadow.querySelector('.car-edit') as HTMLElement).click();
    expect((shadow.querySelector('input') as HTMLInputElement).value).toBe('one');
    typeAndContinue(shadow, 'uno');
    expect(activeLabels(shadow)).toContain('Second?');
    typeAndContinue(shadow, 'dos');

    expect(completed[0].detail.allAnswers).toEqual({ a: 'uno', b: 'dos' });
    expect(historyTexts(shadow)).toEqual(['P1', 'First?', 'uno', 'Second?', 'dos']);
  });

  it('shows (no answer) for a question that was left blank', () => {
    el = mount(twoQuestionPage);
    const shadow = getShadow(el);
    typeAndContinue(shadow, '');
    expect(historyTexts(shadow)).toEqual(['P1', 'First?', '(no answer)']);
  });

  it('removes the Edit icons once the form is complete', () => {
    el = mount(twoQuestionPage);
    const shadow = getShadow(el);
    typeAndContinue(shadow, 'one');
    typeAndContinue(shadow, 'two');
    expect(shadow.querySelectorAll('.car-edit')).toHaveLength(0);
  });
});
