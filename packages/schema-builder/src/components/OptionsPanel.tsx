import type { ChatSchema } from '@richardmcquiston01/chat-and-react-core';
import type { BuilderAction } from '../reducer.js';

interface Props {
  schema: ChatSchema;
  dispatch: React.Dispatch<BuilderAction>;
}

export function OptionsPanel({ schema, dispatch }: Props) {
  const opts = schema['x-chat-options'] ?? {};

  function toggle(key: 'userResumable' | 'localStorage' | 'autoComplete' | 'allowEdit') {
    dispatch({ type: 'UPDATE_OPTIONS', patch: { [key]: !opts[key] } });
  }

  return (
    <div className="options-panel">
      <div className="section-label">Schema Options</div>
      {(
        [
          { key: 'userResumable', label: 'User resumable', defaultVal: true },
          { key: 'localStorage', label: 'Save to localStorage', defaultVal: false },
          { key: 'autoComplete', label: 'Autocomplete', defaultVal: true },
          { key: 'allowEdit', label: 'Allow editing answers', defaultVal: false },
        ] as const
      ).map(({ key, label, defaultVal }) => {
        const checked = opts[key] ?? defaultVal;
        return (
          <label key={key} className="checkbox-row">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(key)}
            />
            {label}
          </label>
        );
      })}
      <label className="checkbox-row">
        <input
          type="number"
          min={0}
          step={1}
          value={(opts.autoHideQuestions ?? 0) / 1000}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: { autoHideQuestions: Math.max(0, Math.round(Number(event.target.value) * 1000)) },
            })
          }
          aria-label="Hide answered questions after this many seconds (0 keeps them)"
        />
        Hide answered questions after (seconds, 0 = never)
      </label>
    </div>
  );
}
