import type { ChatQuestion } from '@chat-and-react/core';

/**
 * Appends a bot message bubble to the given container element.
 *
 * @param container - The parent element to append the bubble to.
 * @param text - The text content of the bot message.
 */
export function appendBotBubble(container: Element, text: string): void {
  const div = document.createElement('div');
  div.setAttribute('part', 'bubble-bot');
  div.textContent = text;
  container.appendChild(div);
}

/**
 * Appends a user response bubble to the given container element.
 *
 * @param container - The parent element to append the bubble to.
 * @param text - The text content of the user response.
 */
export function appendUserBubble(container: Element, text: string): void {
  const div = document.createElement('div');
  div.setAttribute('part', 'bubble-user');
  div.textContent = text;
  container.appendChild(div);
}

/**
 * Removes the current input widget (input-area) from the container.
 *
 * @param container - The parent element containing the input widget.
 */
export function removeInputWidget(container: Element): void {
  container.querySelector('[part="input-area"]')?.remove();
}

/**
 * Renders an input widget for the given question and appends it to the container.
 *
 * @param container - The parent element to append the input widget to.
 * @param question - The chat question defining the input type and options.
 * @param autoComplete - Whether to enable browser autocomplete on inputs.
 * @param onSubmit - Callback invoked with the collected value(s) when the user submits.
 */
export function renderInputWidget(
  container: Element,
  question: ChatQuestion,
  autoComplete: boolean,
  onSubmit: (value: string | string[]) => void,
): void {
  const area = document.createElement('div');
  area.setAttribute('part', 'input-area');

  const inputEl = buildInputElement(question, autoComplete);
  area.appendChild(inputEl);

  const btn = document.createElement('button');
  btn.setAttribute('part', 'submit-btn');
  btn.textContent = 'Send';
  btn.addEventListener('click', () => {
    const value = extractValue(inputEl, question['x-chat-input']);
    onSubmit(value);
  });
  area.appendChild(btn);

  container.appendChild(area);
}

/**
 * Builds the appropriate input element for the given question type.
 *
 * @param question - The chat question.
 * @param autoComplete - Whether autocomplete is enabled.
 * @returns The constructed input element or wrapper.
 */
function buildInputElement(question: ChatQuestion, autoComplete: boolean): Element {
  const acAttr = autoComplete ? 'on' : 'off';

  switch (question['x-chat-input']) {
    case 'text': {
      const el = document.createElement('input');
      el.type = 'text';
      el.autocomplete = acAttr;
      if (question['x-chat-placeholder']) el.placeholder = question['x-chat-placeholder'];
      return el;
    }
    case 'textarea': {
      const el = document.createElement('textarea');
      el.autocomplete = acAttr;
      if (question['x-chat-placeholder']) el.placeholder = question['x-chat-placeholder'];
      return el;
    }
    case 'dropdown': {
      const el = document.createElement('select');
      el.autocomplete = acAttr;
      for (const opt of question.enum ?? []) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        el.appendChild(option);
      }
      return el;
    }
    case 'radio':
    case 'checkbox': {
      const wrap = document.createElement('div');
      const type = question['x-chat-input'];
      const opts =
        type === 'checkbox'
          ? (question.items?.enum ?? question.enum ?? [])
          : (question.enum ?? []);
      for (const opt of opts) {
        const label = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = type;
        inp.name = question.id;
        inp.value = opt;
        label.appendChild(inp);
        label.append(` ${opt}`);
        wrap.appendChild(label);
      }
      return wrap;
    }
  }
}

/**
 * Extracts the current value(s) from the input element based on the input type.
 *
 * @param inputEl - The input element or wrapper to read from.
 * @param type - The chat input type.
 * @returns A string for single-value inputs, or string array for checkbox.
 */
function extractValue(
  inputEl: Element,
  type: ChatQuestion['x-chat-input'],
): string | string[] {
  switch (type) {
    case 'text':
      return (inputEl as HTMLInputElement).value;
    case 'textarea':
      return (inputEl as HTMLTextAreaElement).value;
    case 'dropdown':
      return (inputEl as HTMLSelectElement).value;
    case 'radio': {
      const checked = inputEl.querySelector(
        'input[type="radio"]:checked',
      ) as HTMLInputElement | null;
      return checked?.value ?? '';
    }
    case 'checkbox': {
      const checked = inputEl.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]:checked',
      );
      return Array.from(checked).map((el) => el.value);
    }
  }
}
