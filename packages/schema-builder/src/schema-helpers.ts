import type { ChatSchema, ChatPage, ChatQuestion } from '@richardmcquiston01/chat-and-react-core';

function uniqueId(prefix: string, existing: string[]): string {
  let n = 1;
  while (existing.includes(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

export function emptyQuestion(existingQuestionIds: string[]): ChatQuestion {
  return {
    id: uniqueId('question', existingQuestionIds),
    type: 'string',
    'x-chat-input': 'text',
    title: '',
  };
}

export function emptyPage(existingPageIds: string[]): ChatPage {
  return {
    id: uniqueId('page', existingPageIds),
    title: '',
    questions: [],
    branching: [{ type: 'always', destination_id: '**FORM_COMPLETED**' }],
  };
}

export function emptySchema(): ChatSchema {
  return {
    'x-chat-version': '1',
    'x-chat-options': {
      userResumable: true,
      localStorage: false,
      autoComplete: true,
    },
    'x-chat-pages': [emptyPage([])],
  };
}

/** What the question editor shows for a question's `x-chat-thinking` setting. */
export interface ThinkingFields {
  /** Delay in seconds as typed by the user. Empty means "use the form's default". */
  delaySeconds: string;
  /** Text shown instead of the animated dots. Empty means dots. */
  text: string;
}

/** Turns a question's `x-chat-thinking` value into the strings the editor fields show. */
export function readThinking(question: ChatQuestion): ThinkingFields {
  const value = question['x-chat-thinking'];
  if (typeof value === 'number') {
    return { delaySeconds: String(value / 1000), text: '' };
  }
  if (value && typeof value === 'object') {
    return {
      delaySeconds: value.delay === undefined ? '' : String(value.delay / 1000),
      text: value.text ?? '',
    };
  }
  return { delaySeconds: '', text: '' };
}

/**
 * Builds the `x-chat-thinking` value from the editor fields, or undefined when
 * both are empty so the key is left out of the schema. A delay on its own is
 * written as a plain number of milliseconds.
 */
export function buildThinking(
  delaySeconds: string,
  text: string,
): ChatQuestion['x-chat-thinking'] {
  const trimmedDelay = delaySeconds.trim();
  const parsedSeconds = trimmedDelay === '' ? NaN : Number(trimmedDelay);
  const delay = Number.isFinite(parsedSeconds)
    ? Math.max(0, Math.round(parsedSeconds * 1000))
    : undefined;

  if (text !== '') {
    return delay === undefined ? { text } : { delay, text };
  }
  return delay;
}
