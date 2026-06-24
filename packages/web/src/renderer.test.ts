import { describe, it, expect, vi } from 'vitest';
import type { ChatQuestion } from '@chat-and-react/core';
import {
  appendBotBubble,
  appendUserBubble,
  removeInputWidget,
  renderInputWidget,
} from './renderer.js';

/** Creates a fresh div container for each test. */
function makeContainer(): HTMLDivElement {
  return document.createElement('div');
}

/** Constructs a minimal ChatQuestion for a given input type. */
function makeQuestion(
  overrides: Partial<ChatQuestion> & { 'x-chat-input': ChatQuestion['x-chat-input'] },
): ChatQuestion {
  return {
    id: 'q1',
    type: 'string',
    title: 'Test question',
    ...overrides,
  };
}

describe('appendBotBubble', () => {
  it('appends a div with part="bubble-bot" and the given text', () => {
    const container = makeContainer();
    appendBotBubble(container, 'Hello!');

    const bubble = container.querySelector('[part="bubble-bot"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toBe('Hello!');
  });

  it('appends multiple bot bubbles independently', () => {
    const container = makeContainer();
    appendBotBubble(container, 'First');
    appendBotBubble(container, 'Second');

    const bubbles = container.querySelectorAll('[part="bubble-bot"]');
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].textContent).toBe('First');
    expect(bubbles[1].textContent).toBe('Second');
  });
});

describe('appendUserBubble', () => {
  it('appends a div with part="bubble-user" and the given text', () => {
    const container = makeContainer();
    appendUserBubble(container, 'My answer');

    const bubble = container.querySelector('[part="bubble-user"]');
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toBe('My answer');
  });

  it('does not interfere with bot bubbles', () => {
    const container = makeContainer();
    appendBotBubble(container, 'Bot says hi');
    appendUserBubble(container, 'User replies');

    expect(container.querySelectorAll('[part="bubble-bot"]')).toHaveLength(1);
    expect(container.querySelectorAll('[part="bubble-user"]')).toHaveLength(1);
  });
});

describe('removeInputWidget', () => {
  it('removes the [part="input-area"] element when present', () => {
    const container = makeContainer();
    const area = document.createElement('div');
    area.setAttribute('part', 'input-area');
    container.appendChild(area);

    removeInputWidget(container);

    expect(container.querySelector('[part="input-area"]')).toBeNull();
  });

  it('does nothing when no input widget is present', () => {
    const container = makeContainer();
    expect(() => removeInputWidget(container)).not.toThrow();
  });
});

describe('renderInputWidget — text', () => {
  it('renders an input[type="text"] inside the input area', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, true, vi.fn());

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
  });

  it('sets autocomplete="off" when autoComplete is false', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, false, vi.fn());

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.getAttribute('autocomplete')).toBe('off');
  });

  it('sets autocomplete="on" when autoComplete is true', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, true, vi.fn());

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.getAttribute('autocomplete')).toBe('on');
  });

  it('sets placeholder from x-chat-placeholder', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'text',
      'x-chat-placeholder': 'Type here…',
    });
    renderInputWidget(container, question, true, vi.fn());

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.placeholder).toBe('Type here…');
  });

  it('calls onSubmit with the input value when Send is clicked', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    input.value = 'hello world';

    const btn = container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!;
    btn.click();

    expect(onSubmit).toHaveBeenCalledWith('hello world');
  });

  it('renders a submit button with part="submit-btn"', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, true, vi.fn());

    const btn = container.querySelector('[part="submit-btn"]');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('Send');
  });
});

describe('renderInputWidget — textarea', () => {
  it('renders a <textarea> inside the input area', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'textarea' });
    renderInputWidget(container, question, true, vi.fn());

    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('sets autocomplete="off" on textarea when autoComplete is false', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'textarea' });
    renderInputWidget(container, question, false, vi.fn());

    const ta = container.querySelector<HTMLTextAreaElement>('textarea');
    expect(ta?.getAttribute('autocomplete')).toBe('off');
  });

  it('calls onSubmit with textarea value on click', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'textarea' });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    const ta = container.querySelector<HTMLTextAreaElement>('textarea')!;
    ta.value = 'multi\nline';

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith('multi\nline');
  });
});

describe('renderInputWidget — dropdown', () => {
  it('renders a <select> with options from enum', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'dropdown',
      enum: ['Option A', 'Option B', 'Option C'],
    });
    renderInputWidget(container, question, true, vi.fn());

    const select = container.querySelector<HTMLSelectElement>('select');
    expect(select).not.toBeNull();
    expect(select?.options).toHaveLength(3);
    expect(select?.options[0].value).toBe('Option A');
    expect(select?.options[2].value).toBe('Option C');
  });

  it('calls onSubmit with selected value on click', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'dropdown',
      enum: ['Red', 'Green', 'Blue'],
    });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    const select = container.querySelector<HTMLSelectElement>('select')!;
    select.value = 'Green';

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith('Green');
  });

  it('renders an empty select when enum is absent', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'dropdown' });
    renderInputWidget(container, question, true, vi.fn());

    const select = container.querySelector<HTMLSelectElement>('select');
    expect(select?.options).toHaveLength(0);
  });
});

describe('renderInputWidget — radio', () => {
  it('renders one radio input per enum option', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'radio',
      enum: ['Yes', 'No', 'Maybe'],
    });
    renderInputWidget(container, question, true, vi.fn());

    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(3);
  });

  it('sets name attribute to question id on each radio', () => {
    const container = makeContainer();
    const question = makeQuestion({
      id: 'mood',
      'x-chat-input': 'radio',
      enum: ['Happy', 'Sad'],
    });
    renderInputWidget(container, question, true, vi.fn());

    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios.forEach((r) => expect(r.name).toBe('mood'));
  });

  it('wraps each radio in a <label>', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'radio',
      enum: ['A', 'B'],
    });
    renderInputWidget(container, question, true, vi.fn());

    const labels = container.querySelectorAll('label');
    expect(labels).toHaveLength(2);
  });

  it('calls onSubmit with the checked radio value on click', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'radio',
      enum: ['Yes', 'No'],
    });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios[1].checked = true;

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith('No');
  });

  it('calls onSubmit with empty string when no radio is checked', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'radio',
      enum: ['Yes', 'No'],
    });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith('');
  });
});

describe('renderInputWidget — checkbox', () => {
  it('renders one checkbox per items.enum option', () => {
    const container = makeContainer();
    const question = makeQuestion({
      id: 'colors',
      type: 'array',
      'x-chat-input': 'checkbox',
      items: { enum: ['Red', 'Green', 'Blue'] },
    });
    renderInputWidget(container, question, true, vi.fn());

    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(checkboxes).toHaveLength(3);
  });

  it('falls back to enum when items is absent', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'checkbox',
      enum: ['A', 'B'],
    });
    renderInputWidget(container, question, true, vi.fn());

    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(checkboxes).toHaveLength(2);
  });

  it('calls onSubmit with all checked values as an array', () => {
    const container = makeContainer();
    const question = makeQuestion({
      id: 'tags',
      type: 'array',
      'x-chat-input': 'checkbox',
      items: { enum: ['TypeScript', 'React', 'Node'] },
    });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    checkboxes[0].checked = true;
    checkboxes[2].checked = true;

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith(['TypeScript', 'Node']);
  });

  it('calls onSubmit with empty array when no checkbox is checked', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'checkbox',
      items: { enum: ['X', 'Y'] },
    });
    const onSubmit = vi.fn();
    renderInputWidget(container, question, true, onSubmit);

    container.querySelector<HTMLButtonElement>('[part="submit-btn"]')!.click();

    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it('wraps each checkbox in a <label>', () => {
    const container = makeContainer();
    const question = makeQuestion({
      'x-chat-input': 'checkbox',
      items: { enum: ['One', 'Two', 'Three'] },
    });
    renderInputWidget(container, question, true, vi.fn());

    const labels = container.querySelectorAll('label');
    expect(labels).toHaveLength(3);
  });
});

describe('renderInputWidget — input area structure', () => {
  it('wraps everything in a div with part="input-area"', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, true, vi.fn());

    const area = container.querySelector('[part="input-area"]');
    expect(area).not.toBeNull();
  });

  it('removeInputWidget removes the area rendered by renderInputWidget', () => {
    const container = makeContainer();
    const question = makeQuestion({ 'x-chat-input': 'text' });
    renderInputWidget(container, question, true, vi.fn());
    expect(container.querySelector('[part="input-area"]')).not.toBeNull();

    removeInputWidget(container);
    expect(container.querySelector('[part="input-area"]')).toBeNull();
  });
});
