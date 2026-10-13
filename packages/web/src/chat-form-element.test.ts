import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.js'; // registers <chat-form>

const minimalSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [
    {
      id: 'p1',
      title: 'Page One',
      questions: [
        { id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'What is your name?' },
      ],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    },
  ],
});

const twoPageSchema = JSON.stringify({
  'x-chat-version': '1',
  'x-chat-pages': [
    {
      id: 'p1',
      title: 'P1',
      questions: [
        { id: 'q1', type: 'string', 'x-chat-input': 'radio', title: 'Pick?', enum: ['A', 'B'] },
      ],
      branching: [
        { type: 'if', form_element: 'q1', value: 'A', destination_id: 'p2' },
        { type: 'always', destination_id: '**FORM_COMPLETED**' },
      ],
    },
    {
      id: 'p2',
      title: 'P2',
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
  if (!el.shadowRoot) {
    throw new Error('Expected <chat-form> to have an open shadow root, but it has none');
  }
  return el.shadowRoot;
}

/** Finds an element the test depends on, and fails with the selector if it is missing. */
function requireElement<T extends Element = Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Expected an element matching "${selector}", but none was found`);
  return found;
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'P1',
          questions: [
            {
              id: 'q1',
              type: 'string',
              'x-chat-input': 'dropdown',
              title: 'Where?',
              enum: ['UK', 'US'],
            },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
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
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'Page One',
          questions: [
            { id: 'q1', type: 'string', 'x-chat-input': 'text', title: 'First?' },
            { id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    });

    function activeLabels(shadow: ShadowRoot): (string | null)[] {
      return Array.from(shadow.querySelectorAll('.car-page .car-bubble')).map((b) => b.textContent);
    }

    function press(shadow: ShadowRoot, key: 'click' | 'Enter'): void {
      if (key === 'click') {
        requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
    expect(pageEvents).toHaveLength(1);
    expect(pageEvents[0].detail.pageId).toBe('p1');
  });

  it('renders next page question after navigating', () => {
    el = mount(twoPageSchema);
    const shadow = getShadow(el);
    const radio = shadow.querySelector('input[value="A"]') as HTMLInputElement;
    radio.checked = true;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
    'x-chat-pages': [
      {
        id: 'p1',
        title: 'P1',
        questions: [
          {
            id: 'topics',
            type: 'array',
            'x-chat-input': 'checkbox',
            title: 'Topics?',
            items: { enum: ['Tech', 'Art', 'Sport'] },
          },
        ],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
  }

  const twoStepSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-pages': [
      {
        id: 'p1',
        title: 'P1',
        questions: [
          { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
          { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
        ],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
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
        id: 'p1',
        title: 'P1',
        questions: [
          {
            id: 'choice',
            type: 'string',
            'x-chat-input': 'radio',
            title: 'Pick?',
            enum: ['A', 'B'],
          },
        ],
        branching: [
          { type: 'if', form_element: 'choice', value: 'A', destination_id: 'p2' },
          { type: 'always', destination_id: 'p4' },
        ],
      },
      {
        id: 'p2',
        title: 'P2',
        questions: [{ id: 'q2', type: 'string', 'x-chat-input': 'text', title: 'Q2?' }],
        branching: [{ type: 'always', destination_id: 'p3' }],
      },
      {
        id: 'p3',
        title: 'P3',
        questions: [{ id: 'q3', type: 'string', 'x-chat-input': 'text', title: 'Q3?' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
      {
        id: 'p4',
        title: 'P4',
        questions: [{ id: 'q4', type: 'string', 'x-chat-input': 'text', title: 'Q4?' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
  });

  const twoQuestionPage = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-options': { allowEdit: true },
    'x-chat-pages': [
      {
        id: 'p1',
        title: 'P1',
        questions: [
          { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
          { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
        ],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
  });

  function pickAndContinue(shadow: ShadowRoot, value: string): void {
    (shadow.querySelector(`input[value="${value}"]`) as HTMLInputElement).checked = true;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
  }

  function typeAndContinue(shadow: ShadowRoot, value: string): void {
    (shadow.querySelector('input') as HTMLInputElement).value = value;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
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

describe('<chat-form> attribute overrides', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  function mountWith(schema: string, attributes: Record<string, string>): HTMLElement {
    const element = document.createElement('chat-form');
    element.setAttribute('schema', schema);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    document.body.appendChild(element);
    return element;
  }

  it('user-resumable="false" stops chat-page-submit events', () => {
    el = mountWith(twoPageSchema, { 'user-resumable': 'false' });
    const shadow = getShadow(el);
    const submits: CustomEvent[] = [];
    el.addEventListener('chat-page-submit', (e) => submits.push(e as CustomEvent));

    (shadow.querySelector('input[value="A"]') as HTMLInputElement).checked = true;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
    expect(submits).toHaveLength(0);
  });

  it('beats the schema when both set user-resumable', () => {
    el = mountWith(schemaWithOptions(twoPageSchema, { userResumable: false }), {
      'user-resumable': 'true',
    });
    const shadow = getShadow(el);
    const submits: CustomEvent[] = [];
    el.addEventListener('chat-page-submit', (e) => submits.push(e as CustomEvent));

    (shadow.querySelector('input[value="A"]') as HTMLInputElement).checked = true;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
    expect(submits).toHaveLength(1);
  });

  it('auto-complete="false" turns autocomplete off on every input', () => {
    el = mountWith(minimalSchema, { 'auto-complete': 'false' });
    const input = getShadow(el).querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('leaves autocomplete alone by default', () => {
    el = mount(minimalSchema);
    const input = getShadow(el).querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBeNull();
  });

  it('local-storage="true" saves what is typed', () => {
    el = mountWith(minimalSchema, { 'local-storage': 'true' });
    const input = getShadow(el).querySelector('input') as HTMLInputElement;
    const before = window.localStorage.length;
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.localStorage.length).toBe(before + 1);
  });

  it('local-storage="false" saves nothing while typing', () => {
    el = mountWith(minimalSchema, { 'local-storage': 'false' });
    const input = getShadow(el).querySelector('input') as HTMLInputElement;
    const before = window.localStorage.length;
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.localStorage.length).toBe(before);
  });
});

describe('<chat-form> Enter in a textarea', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  const textareaSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-pages': [
      {
        id: 'p1',
        title: 'P1',
        questions: [{ id: 'notes', type: 'string', 'x-chat-input': 'textarea', title: 'Notes?' }],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
  });

  it('continues on Enter', () => {
    el = mount(textareaSchema);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));
    const box = shadow.querySelector('textarea') as HTMLTextAreaElement;
    box.value = 'Great';

    const event = key(box, 'Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(completed[0].detail.allAnswers).toEqual({ notes: 'Great' });
  });

  it('keeps Shift+Enter for a new line', () => {
    el = mount(textareaSchema);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));
    const box = shadow.querySelector('textarea') as HTMLTextAreaElement;

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    box.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(completed).toHaveLength(0);
  });

  it('ignores Enter while an input method is composing text', () => {
    el = mount(textareaSchema);
    const shadow = getShadow(el);
    const completed: CustomEvent[] = [];
    el.addEventListener('chat-form-complete', (e) => completed.push(e as CustomEvent));
    const box = shadow.querySelector('textarea') as HTMLTextAreaElement;

    box.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(completed).toHaveLength(0);
  });
});

describe('<chat-form> Continue icon', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  it('shows a default icon inside a slot the page can fill', () => {
    el = mount(minimalSchema);
    const button = getShadow(el).querySelector('[part="submit-btn"]') as HTMLElement;
    const slot = button.querySelector('slot[name="continue-icon"]');
    expect(slot).not.toBeNull();
    expect(slot?.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('[part="btn-icon"]')).not.toBeNull();
    expect(button.textContent).toBe('Continue');
  });

  it('leaves the icon out when showContinueIcon is false', () => {
    el = mount(schemaWithOptions(minimalSchema, { showContinueIcon: false }));
    const button = getShadow(el).querySelector('[part="submit-btn"]') as HTMLElement;
    expect(button.querySelector('slot')).toBeNull();
    expect(button.querySelector('svg')).toBeNull();
  });

  it('can be switched off with the show-continue-icon attribute', () => {
    el = document.createElement('chat-form');
    el.setAttribute('schema', minimalSchema);
    el.setAttribute('show-continue-icon', 'false');
    document.body.appendChild(el);
    const button = getShadow(el).querySelector('[part="submit-btn"]') as HTMLElement;
    expect(button.querySelector('[part="btn-icon"]')).toBeNull();
  });
});

describe('<chat-form> typing and thinking', () => {
  let el: HTMLElement;

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    el?.remove();
  });

  /** The bubble holding the question (not the page title). */
  function label(shadow: ShadowRoot): HTMLElement {
    return shadow.querySelector('.car-page .car-input-wrap > .car-bubble') as HTMLElement;
  }

  function typedText(shadow: ShadowRoot): string {
    return (
      label(shadow).querySelector('span[aria-hidden="true"] > span:first-child')?.textContent ?? ''
    );
  }

  function inputHidden(shadow: ShadowRoot): boolean {
    return (shadow.querySelector('.car-page input') as HTMLInputElement).hidden;
  }

  it('shows the question straight away by default', () => {
    el = mount(minimalSchema);
    const shadow = getShadow(el);
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('types the question a character at a time, then shows the input', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { typingSpeed: 50 }));
    const shadow = getShadow(el);

    expect(inputHidden(shadow)).toBe(true);
    expect(typedText(shadow)).toBe('');

    vi.advanceTimersByTime(150);
    expect(typedText(shadow)).toBe('Wha');
    expect(inputHidden(shadow)).toBe(true);

    vi.advanceTimersByTime(50 * 'What is your name?'.length);
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('keeps the whole question available to screen readers while it types', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { typingSpeed: 50 }));
    const shadow = getShadow(el);
    vi.advanceTimersByTime(100);
    expect(label(shadow).querySelector('.car-sr-only')?.textContent).toBe('What is your name?');
  });

  it('finishes at once when the question is clicked', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { typingSpeed: 50 }));
    const shadow = getShadow(el);
    vi.advanceTimersByTime(100);

    label(shadow).click();
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('shows the question straight away when the user prefers reduced motion', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: true }),
      configurable: true,
    });
    el = mount(schemaWithOptions(minimalSchema, { typingSpeed: 50 }));
    const shadow = getShadow(el);
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('shows animated dots for the thinking delay, then the question', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { thinkingDelay: 800 }));
    const shadow = getShadow(el);

    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(true);
    expect(label(shadow).querySelectorAll('.car-dots span')).toHaveLength(3);
    expect(inputHidden(shadow)).toBe(true);

    vi.advanceTimersByTime(799);
    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(true);

    vi.advanceTimersByTime(1);
    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(false);
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('shows thinkingText instead of dots when it is set', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { thinkingDelay: 500, thinkingText: '...' }));
    const shadow = getShadow(el);
    expect(label(shadow).textContent).toBe('...');
    expect(label(shadow).querySelector('.car-dots')).toBeNull();
  });

  it('thinks first and then types', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { thinkingDelay: 400, typingSpeed: 20 }));
    const shadow = getShadow(el);

    vi.advanceTimersByTime(400);
    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(false);
    expect(inputHidden(shadow)).toBe(true);

    vi.advanceTimersByTime(20 * 'What is your name?'.length);
    expect(label(shadow).textContent).toBe('What is your name?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it("lets a question's x-chat-thinking override the options", () => {
    vi.useFakeTimers();
    const schema = JSON.stringify({
      'x-chat-version': '1',
      'x-chat-options': { thinkingDelay: 5000 },
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'P1',
          questions: [
            {
              id: 'q1',
              type: 'string',
              'x-chat-input': 'text',
              title: 'Quick one?',
              'x-chat-thinking': 100,
            },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    });
    el = mount(schema);
    const shadow = getShadow(el);
    vi.advanceTimersByTime(100);
    expect(label(shadow).textContent).toBe('Quick one?');
  });

  it('turns thinking off for one question with x-chat-thinking: 0', () => {
    const schema = JSON.stringify({
      'x-chat-version': '1',
      'x-chat-options': { thinkingDelay: 5000 },
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'P1',
          questions: [
            {
              id: 'q1',
              type: 'string',
              'x-chat-input': 'text',
              title: 'Right away?',
              'x-chat-thinking': 0,
            },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    });
    el = mount(schema);
    const shadow = getShadow(el);
    expect(label(shadow).textContent).toBe('Right away?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('accepts a per-question delay and text', () => {
    vi.useFakeTimers();
    const schema = JSON.stringify({
      'x-chat-version': '1',
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'P1',
          questions: [
            {
              id: 'q1',
              type: 'string',
              'x-chat-input': 'text',
              title: 'Hmm?',
              'x-chat-thinking': { delay: 300, text: 'Let me think...' },
            },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    });
    el = mount(schema);
    const shadow = getShadow(el);
    expect(label(shadow).textContent).toBe('Let me think...');
    vi.advanceTimersByTime(300);
    expect(label(shadow).textContent).toBe('Hmm?');
  });

  it('thinks again before each new question, but not when an answer is edited', () => {
    vi.useFakeTimers();
    el = mount(
      schemaWithOptions(
        JSON.stringify({
          'x-chat-version': '1',
          'x-chat-pages': [
            {
              id: 'p1',
              title: 'P1',
              questions: [
                { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
                { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
              ],
              branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
            },
          ],
        }),
        { thinkingDelay: 200, allowEdit: true },
      ),
    );
    const shadow = getShadow(el);
    vi.advanceTimersByTime(200);

    (shadow.querySelector('input') as HTMLInputElement).value = 'one';
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(label(shadow).textContent).toBe('Second?');

    (shadow.querySelector('.car-edit') as HTMLElement).click();
    expect(label(shadow).classList.contains('car-bubble--thinking')).toBe(false);
    expect(label(shadow).textContent).toBe('First?');
    expect(inputHidden(shadow)).toBe(false);
  });

  it('lets the typing-speed and thinking-delay attributes override the schema', () => {
    vi.useFakeTimers();
    el = document.createElement('chat-form');
    el.setAttribute('schema', schemaWithOptions(minimalSchema, { thinkingDelay: 60_000 }));
    el.setAttribute('thinking-delay', '100');
    el.setAttribute('typing-speed', '0');
    document.body.appendChild(el);
    const shadow = getShadow(el);
    vi.advanceTimersByTime(100);
    expect(label(shadow).textContent).toBe('What is your name?');
  });

  it('stops animating when the form is removed', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(minimalSchema, { typingSpeed: 50 }));
    const shadow = getShadow(el);
    el.remove();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(shadow.querySelector('.car-page')).not.toBeNull();
  });
});

describe('<chat-form> hiding answered questions and answers', () => {
  let el: HTMLElement;

  afterEach(() => {
    vi.useRealTimers();
    el?.remove();
  });

  const twoQuestionSchema = JSON.stringify({
    'x-chat-version': '1',
    'x-chat-pages': [
      {
        id: 'p1',
        title: 'P1',
        questions: [
          { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
          { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
        ],
        branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
      },
    ],
  });

  function answerFirst(shadow: ShadowRoot): { question: HTMLElement; answer: HTMLElement } {
    (shadow.querySelector('input') as HTMLInputElement).value = 'one';
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
    const question = Array.from(shadow.querySelectorAll('[part="bubble-bot"]')).find(
      (b) => b.textContent === 'First?',
    ) as HTMLElement;
    const answer = shadow.querySelector('[part="bubble-user"]') as HTMLElement;
    return { question, answer };
  }

  it('keeps answers on screen when only questions are set to hide', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(twoQuestionSchema, { autoHideQuestions: 500 }));
    const { question, answer } = answerFirst(getShadow(el));
    vi.advanceTimersByTime(2000);
    expect(question.hidden).toBe(true);
    expect(answer.hidden).toBe(false);
  });

  it('hides the answer after autoHideAnswers, so the finished pair disappears', () => {
    vi.useFakeTimers();
    el = mount(
      schemaWithOptions(twoQuestionSchema, { autoHideQuestions: 500, autoHideAnswers: 1500 }),
    );
    const { question, answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(900);
    expect(question.hidden).toBe(true);
    expect(answer.hidden).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(answer.hidden).toBe(true);
    expect(answer.getAttribute('aria-hidden')).toBe('true');
  });

  it('fades by default: fading class first, then hidden', () => {
    vi.useFakeTimers();
    el = mount(schemaWithOptions(twoQuestionSchema, { autoHideAnswers: 100 }));
    const { answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(100);
    expect(answer.classList.contains('car-bubble--fading')).toBe(true);
    expect(answer.classList.contains('car-bubble--collapsing')).toBe(true);
    expect(answer.hidden).toBe(false);

    vi.advanceTimersByTime(300);
    expect(answer.hidden).toBe(true);
  });

  it('pops off with hideAnimation "pop", a little faster than a fade', () => {
    vi.useFakeTimers();
    el = mount(
      schemaWithOptions(twoQuestionSchema, { autoHideAnswers: 100, hideAnimation: 'pop' }),
    );
    const { answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(100);
    expect(answer.classList.contains('car-bubble--pop')).toBe(true);
    expect(answer.classList.contains('car-bubble--fading')).toBe(false);

    vi.advanceTimersByTime(200);
    expect(answer.hidden).toBe(true);
  });

  it('hides at once with hideAnimation "none"', () => {
    vi.useFakeTimers();
    el = mount(
      schemaWithOptions(twoQuestionSchema, { autoHideAnswers: 100, hideAnimation: 'none' }),
    );
    const { answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(100);
    expect(answer.hidden).toBe(true);
    expect(answer.classList.contains('car-bubble--fading')).toBe(false);
  });

  it('lets the auto-hide-answers and hide-animation attributes override the schema', () => {
    vi.useFakeTimers();
    el = document.createElement('chat-form');
    el.setAttribute(
      'schema',
      schemaWithOptions(twoQuestionSchema, { autoHideAnswers: 60_000, hideAnimation: 'fade' }),
    );
    el.setAttribute('auto-hide-answers', '100');
    el.setAttribute('hide-animation', 'none');
    document.body.appendChild(el);
    const { answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(100);
    expect(answer.hidden).toBe(true);
  });

  it('ignores a hide-animation value it does not know', () => {
    vi.useFakeTimers();
    el = document.createElement('chat-form');
    el.setAttribute('schema', schemaWithOptions(twoQuestionSchema, { autoHideAnswers: 100 }));
    el.setAttribute('hide-animation', 'explode');
    document.body.appendChild(el);
    const { answer } = answerFirst(getShadow(el));

    vi.advanceTimersByTime(100);
    expect(answer.classList.contains('car-bubble--fading')).toBe(true);
  });

  it('marks the history list so completed pairs can be spaced apart', () => {
    el = mount(twoQuestionSchema);
    expect(
      getShadow(el).querySelector('[part="message-list"]')?.classList.contains('car-messages'),
    ).toBe(true);
  });
});

describe('<chat-form> Edit icon slot', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  const editablePage = schemaWithOptions(
    JSON.stringify({
      'x-chat-version': '1',
      'x-chat-pages': [
        {
          id: 'p1',
          title: 'P1',
          questions: [
            { id: 'a', type: 'string', 'x-chat-input': 'text', title: 'First?' },
            { id: 'b', type: 'string', 'x-chat-input': 'text', title: 'Second?' },
            { id: 'c', type: 'string', 'x-chat-input': 'text', title: 'Third?' },
          ],
          branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
        },
      ],
    }),
    { allowEdit: true },
  );

  function mountWithIcon(iconHtml: string): HTMLElement {
    const element = document.createElement('chat-form');
    element.setAttribute('schema', editablePage);
    element.insertAdjacentHTML('beforeend', iconHtml);
    document.body.appendChild(element);
    return element;
  }

  function answer(shadow: ShadowRoot, value: string): void {
    (shadow.querySelector('input') as HTMLInputElement).value = value;
    requireElement(shadow, '[part="submit-btn"]').dispatchEvent(new Event('click'));
  }

  /** Direct children of the element that have the given attribute. */
  function childrenWith(element: HTMLElement, attribute: string): Element[] {
    return Array.from(element.children).filter((child) => child.hasAttribute(attribute));
  }

  function slottedText(button: Element): string | undefined {
    const slot = button.querySelector('slot') as HTMLSlotElement;
    return slot
      .assignedNodes()
      .map((node) => node.textContent)
      .join('');
  }

  it('shows a pencil when the page supplies no icon', () => {
    el = mount(editablePage);
    const shadow = getShadow(el);
    answer(shadow, 'one');
    expect(shadow.querySelector('.car-edit')?.textContent).toBe('✎');
  });

  it('gives every Edit button its own copy of the page icon', () => {
    el = mountWithIcon('<i slot="edit-icon" class="fa-pen" id="proto">E</i>');
    const shadow = getShadow(el);
    answer(shadow, 'one');
    answer(shadow, 'two');

    const buttons = Array.from(shadow.querySelectorAll('.car-edit'));
    expect(buttons).toHaveLength(2);
    expect(buttons.map(slottedText)).toEqual(['E', 'E']);

    const slotNames = buttons.map((b) => requireElement(b, 'slot').getAttribute('name'));
    expect(new Set(slotNames).size).toBe(2);
  });

  it('keeps the page icon in the page, so its own styles still apply', () => {
    el = mountWithIcon('<i slot="edit-icon" class="fa-pen">E</i>');
    answer(getShadow(el), 'one');
    const copies = childrenWith(el, 'data-car-edit-icon');
    expect(copies).toHaveLength(1);
    expect(copies[0].classList.contains('fa-pen')).toBe(true);
    expect(copies[0].hasAttribute('id')).toBe(false);
  });

  it('copies the contents of a <template> icon', () => {
    el = mountWithIcon('<template slot="edit-icon"><b>T</b></template>');
    const shadow = getShadow(el);
    answer(shadow, 'one');
    expect(slottedText(shadow.querySelector('.car-edit') as Element)).toBe('T');
  });

  it('does not show the original icon element or count it as a copy', () => {
    el = mountWithIcon('<i slot="edit-icon">E</i>');
    const shadow = getShadow(el);
    answer(shadow, 'one');
    answer(shadow, 'two');
    // The original stays put and is never assigned to a slot.
    const original = Array.from(el.children).find(
      (child) => child.getAttribute('slot') === 'edit-icon',
    ) as HTMLElement;
    expect(original).not.toBeNull();
    expect(shadow.querySelector('slot[name="edit-icon"]')).toBeNull();
    const assigned = Array.from(shadow.querySelectorAll('slot')).flatMap((slot) =>
      (slot as HTMLSlotElement).assignedNodes(),
    );
    expect(assigned).not.toContain(original);
    expect(childrenWith(el, 'data-car-edit-icon')).toHaveLength(2);
  });

  it('removes the copies when the Edit buttons go away at the end of the form', () => {
    el = mountWithIcon('<i slot="edit-icon">E</i>');
    const shadow = getShadow(el);
    answer(shadow, 'one');
    answer(shadow, 'two');
    expect(childrenWith(el, 'data-car-edit-icon')).toHaveLength(2);

    answer(shadow, 'three');
    expect(childrenWith(el, 'data-car-edit-icon')).toHaveLength(0);
    expect(childrenWith(el, 'slot')).toHaveLength(1);
  });
});
