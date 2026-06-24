import type { BuilderAction } from '../reducer.js';

interface Props {
  rulesJson: string;
  rulesJsonError: string | null;
  dispatch: React.Dispatch<BuilderAction>;
}

export function RulesPanel({ rulesJson, rulesJsonError, dispatch }: Props) {
  return (
    <div className="rules-panel">
      <div className="section-label">
        Named Rules
        <span className="section-hint">
          Define JsonLogic rules here, then reference them in questions via a condition ref.
          Format: <code>{'{ "rule-name": { "!!": [{ "var": "question_id" }] } }'}</code>
        </span>
      </div>
      <textarea
        className={`rules-textarea${rulesJsonError ? ' rules-textarea--error' : ''}`}
        value={rulesJson}
        onChange={(e) => dispatch({ type: 'SET_RULES_JSON', value: e.target.value })}
        rows={10}
        spellCheck={false}
      />
      {rulesJsonError && <div className="rules-error">{rulesJsonError}</div>}
    </div>
  );
}
