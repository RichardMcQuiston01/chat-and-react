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

  it('renders a bot bubble for the first question on connect', () => {
    el = mount(minimalSchema);
    const bubble = getShadow(el).querySelector('[part="bubble-bot"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toBe('What is your name?');
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
    const bubbles = shadow.querySelectorAll('[part="bubble-bot"]');
    expect(bubbles.length).toBeGreaterThanOrEqual(2);
    expect(bubbles[1].textContent).toBe('Tell us more');
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
    expect(shadow.querySelector('[part="bubble-bot"]')).not.toBeNull();
    expect(shadow.querySelector('[part="input-area"]')).not.toBeNull();
  });
});
