import type { ChatSchema, ChatPage } from '@chat-and-react/core';
import type { BuilderAction } from '../reducer.js';
import { QuestionCard } from './QuestionCard.js';
import { BranchingCard } from './BranchingCard.js';

interface Props {
  page: ChatPage;
  pageIndex: number;
  schema: ChatSchema;
  ruleNames: string[];
  dispatch: React.Dispatch<BuilderAction>;
}

export function PageEditor({ page, pageIndex, schema, ruleNames, dispatch }: Props) {
  const allPageIds = schema['x-chat-pages'].map((p) => p.id);
  const allQuestionIds = schema['x-chat-pages'].flatMap((p) => p.questions.map((q) => q.id));

  return (
    <div className="page-editor">
      <div className="page-editor-meta">
        <div className="field">
          <label className="field-label">Page ID</label>
          <input
            className="field-input"
            value={page.id}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_PAGE', index: pageIndex, patch: { id: e.target.value } })
            }
            placeholder="unique-page-id"
          />
        </div>
        <div className="field">
          <label className="field-label">Title</label>
          <input
            className="field-input"
            value={page.title}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_PAGE', index: pageIndex, patch: { title: e.target.value } })
            }
            placeholder="Page title shown to the user"
          />
        </div>
      </div>

      <div className="section-label">Questions</div>
      <div className="question-list">
        {page.questions.map((q, qi) => (
          <QuestionCard
            key={q.id + qi}
            question={q}
            pageIndex={pageIndex}
            questionIndex={qi}
            questionCount={page.questions.length}
            ruleNames={ruleNames}
            dispatch={dispatch}
          />
        ))}
        <button
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'ADD_QUESTION', pageIndex })}
        >
          + Add question
        </button>
      </div>

      <div className="section-label">Branching</div>
      <div className="branching-list">
        {page.branching.map((rule, ri) => (
          <BranchingCard
            key={ri}
            rule={rule}
            ruleIndex={ri}
            isLast={ri === page.branching.length - 1}
            pageIndex={pageIndex}
            pageIds={allPageIds}
            questionIds={allQuestionIds}
            dispatch={dispatch}
          />
        ))}
        <button
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'ADD_BRANCHING_RULE', pageIndex })}
        >
          + Add condition
        </button>
      </div>
    </div>
  );
}
