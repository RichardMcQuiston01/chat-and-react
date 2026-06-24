import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer } from './renderer.js';
import type { ChatPage, ChatQuestion } from '@chat-and-react/core';

/** Creates a fresh ShadowRoot attached to a div in the document body. */
function makeRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

/** Constructs a minimal ChatPage with the given questions. */
function makePage(questions: ChatQuestion[]): ChatPage {
  return {
    id: 'p1',
    title: 'Test page',
    questions,
    branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
  };
}

/**
 * Constructs a minimal ChatQuestion with defaults, applying any overrides.
 * The `id` and `x-chat-input` fields are required via the Pick constraint.
 */
function makeQuestion(
  overrides: Partial<ChatQuestion> & Pick<ChatQuestion, 'id' | 'x-chat-input'>,
): ChatQuestion {
  return {
    title: overrides.id,
    type: 'string',
    ...overrides,
  } as ChatQuestion;
}

describe('Renderer — appendUserBubble', () => {
  it('appends a .car-bubble.car-bubble--user element with the given text', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    renderer.appendUserBubble('Hello user');

    const bubble = root.querySelector('.car-bubble--user');
    expect(bubble).not.toBeNull();
    expect(bubble?.textContent).toBe('Hello user');
    expect(bubble?.classList.contains('car-bubble')).toBe(true);
  });

  it('appends multiple user bubbles independently', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    renderer.appendUserBubble('First');
    renderer.appendUserBubble('Second');

    const bubbles = root.querySelectorAll('.car-bubble--user');
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].textContent).toBe('First');
    expect(bubbles[1].textContent).toBe('Second');
  });
});

describe('Renderer — renderPage title bubble', () => {
  it('creates a .car-page div containing a title .car-bubble', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const page = makePage([]);
    renderer.renderPage(page, []);

    const pageDiv = root.querySelector('.car-page');
    expect(pageDiv).not.toBeNull();

    const titleBubble = pageDiv?.querySelector('.car-bubble');
    expect(titleBubble).not.toBeNull();
    expect(titleBubble?.textContent).toBe('Test page');
  });

  it('renders question label bubbles inside .car-page', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({ id: 'q1', 'x-chat-input': 'text' });
    const page = makePage([q]);
    renderer.renderPage(page, [q]);

    const pageDiv = root.querySelector('.car-page');
    const bubbles = pageDiv?.querySelectorAll('.car-bubble');
    // first bubble = page title, second = question label
    expect(bubbles?.length).toBeGreaterThanOrEqual(2);
    const labels = Array.from(bubbles ?? []).map((b) => b.textContent);
    expect(labels).toContain('q1');
  });
});

describe('Renderer — renderPage text input', () => {
  it('renders an input[type="text"] with class car-input', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({ id: 'q-text', 'x-chat-input': 'text' });
    renderer.renderPage(makePage([q]), [q]);

    const input = root.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.classList.contains('car-input')).toBe(true);
  });

  it('sets placeholder from x-chat-placeholder', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-text',
      'x-chat-input': 'text',
      'x-chat-placeholder': 'Enter name',
    });
    renderer.renderPage(makePage([q]), [q]);

    const input = root.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.placeholder).toBe('Enter name');
  });
});

describe('Renderer — renderPage textarea', () => {
  it('renders a textarea with class car-input', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({ id: 'q-ta', 'x-chat-input': 'textarea' });
    renderer.renderPage(makePage([q]), [q]);

    const ta = root.querySelector<HTMLTextAreaElement>('textarea');
    expect(ta).not.toBeNull();
    expect(ta?.classList.contains('car-input')).toBe(true);
  });
});

describe('Renderer — renderPage dropdown', () => {
  it('renders a select with class car-input and the correct options', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-dd',
      'x-chat-input': 'dropdown',
      enum: ['Alpha', 'Beta', 'Gamma'],
    });
    renderer.renderPage(makePage([q]), [q]);

    const select = root.querySelector<HTMLSelectElement>('select');
    expect(select).not.toBeNull();
    expect(select?.classList.contains('car-input')).toBe(true);
    expect(select?.options).toHaveLength(3);
    expect(select?.options[0].value).toBe('Alpha');
    expect(select?.options[2].value).toBe('Gamma');
  });
});

describe('Renderer — renderPage radio', () => {
  it('renders one radio input per enum option', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-radio',
      'x-chat-input': 'radio',
      enum: ['Yes', 'No', 'Maybe'],
    });
    renderer.renderPage(makePage([q]), [q]);

    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(3);
    expect(radios[0].value).toBe('Yes');
    expect(radios[2].value).toBe('Maybe');
  });

  it('wraps each radio in a label', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-radio',
      'x-chat-input': 'radio',
      enum: ['A', 'B'],
    });
    renderer.renderPage(makePage([q]), [q]);

    const labels = root.querySelectorAll('label');
    expect(labels).toHaveLength(2);
  });
});

describe('Renderer — renderPage checkbox', () => {
  it('renders one checkbox input per enum option', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-chk',
      'x-chat-input': 'checkbox',
      enum: ['Red', 'Green', 'Blue'],
    });
    renderer.renderPage(makePage([q]), [q]);

    const checkboxes = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].value).toBe('Red');
  });

  it('wraps each checkbox in a label', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    const q = makeQuestion({
      id: 'q-chk',
      'x-chat-input': 'checkbox',
      enum: ['One', 'Two'],
    });
    renderer.renderPage(makePage([q]), [q]);

    const labels = root.querySelectorAll('label');
    expect(labels).toHaveLength(2);
  });
});

describe('Renderer — clearInputArea', () => {
  it('removes the current .car-page div', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    renderer.renderPage(makePage([]), []);
    expect(root.querySelector('.car-page')).not.toBeNull();

    renderer.clearInputArea();
    expect(root.querySelector('.car-page')).toBeNull();
  });

  it('does nothing when no page has been rendered', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);
    expect(() => renderer.clearInputArea()).not.toThrow();
  });
});

describe('Renderer — second renderPage clears first', () => {
  it('replaces the first page with the second on a second call', () => {
    const root = makeRoot();
    const renderer = new Renderer(root);

    const page1: ChatPage = {
      id: 'p1',
      title: 'Page One',
      questions: [],
      branching: [{ type: 'always', destination_id: 'p2' }],
    };
    const page2: ChatPage = {
      id: 'p2',
      title: 'Page Two',
      questions: [],
      branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
    };

    renderer.renderPage(page1, []);
    renderer.renderPage(page2, []);

    const pages = root.querySelectorAll('.car-page');
    expect(pages).toHaveLength(1);

    const titleBubble = root.querySelector('.car-page .car-bubble');
    expect(titleBubble?.textContent).toBe('Page Two');
  });
});
