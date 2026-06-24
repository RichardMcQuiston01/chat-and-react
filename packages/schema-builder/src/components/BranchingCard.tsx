import type { BranchingRule } from '@chat-and-react/core';
import type { BuilderAction } from '../reducer.js';

interface Props {
  rule: BranchingRule;
  ruleIndex: number;
  isLast: boolean;
  pageIndex: number;
  pageIds: string[];
  questionIds: string[];
  dispatch: React.Dispatch<BuilderAction>;
}

export function BranchingCard({
  rule,
  ruleIndex,
  isLast,
  pageIndex,
  pageIds,
  questionIds,
  dispatch,
}: Props) {
  function update(patch: Partial<BranchingRule>) {
    dispatch({ type: 'UPDATE_BRANCHING_RULE', pageIndex, ruleIndex, patch });
  }

  const destinations = [...pageIds, '**FORM_COMPLETED**'];

  return (
    <div className={`card branching-card${isLast ? ' branching-card--terminal' : ''}`}>
      <div className="card-row">
        <div className="field field--sm">
          <label className="field-label">Type</label>
          <select
            className="field-input"
            value={rule.type}
            disabled={isLast}
            onChange={(e) => {
              if (e.target.value === 'always') {
                update({ type: 'always', destination_id: rule.destination_id } as Partial<BranchingRule>);
              } else {
                update({ type: 'if', form_element: '', value: '', destination_id: rule.destination_id } as Partial<BranchingRule>);
              }
            }}
          >
            <option value="always">always</option>
            <option value="if">if</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label">Go to</label>
          <select
            className="field-input"
            value={rule.destination_id}
            onChange={(e) => update({ destination_id: e.target.value } as Partial<BranchingRule>)}
          >
            {destinations.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>

        {!isLast && (
          <button
            className="btn-icon btn-icon--danger"
            style={{ alignSelf: 'flex-end', marginBottom: '2px' }}
            title="Remove rule"
            onClick={() => dispatch({ type: 'REMOVE_BRANCHING_RULE', pageIndex, ruleIndex })}
          >×</button>
        )}
      </div>

      {rule.type === 'if' && (
        <div className="card-row">
          <div className="field">
            <label className="field-label">Question</label>
            <select
              className="field-input"
              value={rule.form_element}
              onChange={(e) => update({ form_element: e.target.value } as Partial<BranchingRule>)}
            >
              <option value="">— select question —</option>
              {questionIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Equals</label>
            <input
              className="field-input"
              value={rule.type === 'if' ? rule.value : ''}
              onChange={(e) => update({ value: e.target.value } as Partial<BranchingRule>)}
              placeholder="answer value"
            />
          </div>
        </div>
      )}
    </div>
  );
}
