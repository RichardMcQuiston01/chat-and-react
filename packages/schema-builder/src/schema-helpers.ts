import type { ChatSchema, ChatPage, ChatQuestion } from '@chat-and-react/core';

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
