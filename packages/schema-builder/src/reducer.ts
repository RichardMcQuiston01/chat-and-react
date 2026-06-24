import type { ChatSchema, ChatOptions, ChatPage, ChatQuestion, BranchingRule } from '@chat-and-react/core';
import { emptySchema, emptyPage, emptyQuestion } from './schema-helpers.js';

export interface BuilderState {
  schema: ChatSchema;
  selectedPageIndex: number;
  rulesJson: string;
  rulesJsonError: string | null;
  validationError: string | null;
  validationSuccess: boolean;
}

export type BuilderAction =
  | { type: 'NEW_SCHEMA' }
  | { type: 'SET_SCHEMA'; schema: ChatSchema; rulesJson: string }
  | { type: 'SET_SELECTED_PAGE'; index: number }
  | { type: 'ADD_PAGE' }
  | { type: 'REMOVE_PAGE'; index: number }
  | { type: 'UPDATE_PAGE'; index: number; patch: Partial<Pick<ChatPage, 'id' | 'title'>> }
  | { type: 'ADD_QUESTION'; pageIndex: number }
  | { type: 'REMOVE_QUESTION'; pageIndex: number; questionIndex: number }
  | { type: 'UPDATE_QUESTION'; pageIndex: number; questionIndex: number; patch: Partial<ChatQuestion> }
  | { type: 'MOVE_QUESTION'; pageIndex: number; from: number; to: number }
  | { type: 'ADD_BRANCHING_RULE'; pageIndex: number }
  | { type: 'REMOVE_BRANCHING_RULE'; pageIndex: number; ruleIndex: number }
  | { type: 'UPDATE_BRANCHING_RULE'; pageIndex: number; ruleIndex: number; patch: Partial<BranchingRule> }
  | { type: 'UPDATE_OPTIONS'; patch: Partial<ChatOptions> }
  | { type: 'SET_RULES_JSON'; value: string }
  | { type: 'SET_VALIDATION_ERROR'; error: string | null }
  | { type: 'SET_VALIDATION_SUCCESS'; success: boolean };

function allQuestionIds(schema: ChatSchema): string[] {
  return schema['x-chat-pages'].flatMap((p) => p.questions.map((q) => q.id));
}

function allPageIds(schema: ChatSchema): string[] {
  return schema['x-chat-pages'].map((p) => p.id);
}

function updatePage(pages: ChatPage[], index: number, fn: (p: ChatPage) => ChatPage): ChatPage[] {
  return pages.map((p, i) => (i === index ? fn(p) : p));
}

export function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'NEW_SCHEMA': {
      const schema = emptySchema();
      return {
        ...state,
        schema,
        selectedPageIndex: 0,
        rulesJson: '{}',
        rulesJsonError: null,
        validationError: null,
        validationSuccess: false,
      };
    }

    case 'SET_SCHEMA':
      return {
        ...state,
        schema: action.schema,
        selectedPageIndex: 0,
        rulesJson: action.rulesJson,
        rulesJsonError: null,
        validationError: null,
        validationSuccess: false,
      };

    case 'SET_SELECTED_PAGE':
      return { ...state, selectedPageIndex: action.index, validationError: null, validationSuccess: false };

    case 'ADD_PAGE': {
      const page = emptyPage(allPageIds(state.schema));
      const pages = [...state.schema['x-chat-pages'], page];
      return {
        ...state,
        schema: { ...state.schema, 'x-chat-pages': pages },
        selectedPageIndex: pages.length - 1,
      };
    }

    case 'REMOVE_PAGE': {
      const pages = state.schema['x-chat-pages'].filter((_, i) => i !== action.index);
      const next = Math.min(state.selectedPageIndex, pages.length - 1);
      return {
        ...state,
        schema: { ...state.schema, 'x-chat-pages': pages },
        selectedPageIndex: Math.max(0, next),
      };
    }

    case 'UPDATE_PAGE': {
      const pages = updatePage(state.schema['x-chat-pages'], action.index, (p) => ({
        ...p,
        ...action.patch,
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'ADD_QUESTION': {
      const qId = allQuestionIds(state.schema);
      const q = emptyQuestion(qId);
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => ({
        ...p,
        questions: [...p.questions, q],
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'REMOVE_QUESTION': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => ({
        ...p,
        questions: p.questions.filter((_, i) => i !== action.questionIndex),
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'UPDATE_QUESTION': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => ({
        ...p,
        questions: p.questions.map((q, i) =>
          i === action.questionIndex ? { ...q, ...action.patch } : q,
        ),
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'MOVE_QUESTION': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => {
        const qs = [...p.questions];
        const [removed] = qs.splice(action.from, 1);
        qs.splice(action.to, 0, removed);
        return { ...p, questions: qs };
      });
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'ADD_BRANCHING_RULE': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => {
        const rules = [...p.branching];
        const terminal = rules.pop()!;
        rules.push(
          { type: 'if', form_element: '', value: '', destination_id: '**FORM_COMPLETED**' },
          terminal,
        );
        return { ...p, branching: rules };
      });
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'REMOVE_BRANCHING_RULE': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => ({
        ...p,
        branching: p.branching.filter((_, i) => i !== action.ruleIndex),
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'UPDATE_BRANCHING_RULE': {
      const pages = updatePage(state.schema['x-chat-pages'], action.pageIndex, (p) => ({
        ...p,
        branching: p.branching.map((r, i) =>
          i === action.ruleIndex ? ({ ...r, ...action.patch } as BranchingRule) : r,
        ),
      }));
      return { ...state, schema: { ...state.schema, 'x-chat-pages': pages } };
    }

    case 'UPDATE_OPTIONS': {
      return {
        ...state,
        schema: {
          ...state.schema,
          'x-chat-options': { ...state.schema['x-chat-options'], ...action.patch },
        },
      };
    }

    case 'SET_RULES_JSON': {
      let error: string | null = null;
      try {
        JSON.parse(action.value);
      } catch {
        error = 'Invalid JSON';
      }
      return { ...state, rulesJson: action.value, rulesJsonError: error };
    }

    case 'SET_VALIDATION_ERROR':
      return { ...state, validationError: action.error, validationSuccess: false };

    case 'SET_VALIDATION_SUCCESS':
      return { ...state, validationSuccess: action.success, validationError: null };

    default:
      return state;
  }
}

export function initialState(): BuilderState {
  const schema = emptySchema();
  return {
    schema,
    selectedPageIndex: 0,
    rulesJson: '{}',
    rulesJsonError: null,
    validationError: null,
    validationSuccess: false,
  };
}
