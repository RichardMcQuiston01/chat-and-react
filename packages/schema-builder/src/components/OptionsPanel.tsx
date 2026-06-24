import type { ChatSchema } from '@chat-and-react/core';
import type { BuilderAction } from '../reducer.js';

interface Props {
  schema: ChatSchema;
  dispatch: React.Dispatch<BuilderAction>;
}

export function OptionsPanel({ schema, dispatch }: Props) {
  const opts = schema['x-chat-options'] ?? {};

  function toggle(key: 'userResumable' | 'localStorage' | 'autoComplete') {
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
    </div>
  );
}
