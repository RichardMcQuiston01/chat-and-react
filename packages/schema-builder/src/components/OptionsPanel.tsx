import type { ChatSchema } from '@richardmcquiston01/chat-and-react-core';
import type { BuilderAction } from '../reducer.js';

interface Props {
  schema: ChatSchema;
  dispatch: React.Dispatch<BuilderAction>;
}

export function OptionsPanel({ schema, dispatch }: Props) {
  const opts = schema['x-chat-options'] ?? {};

  function toggle(
    key: 'userResumable' | 'localStorage' | 'autoComplete' | 'allowEdit' | 'showContinueIcon',
  ) {
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
          { key: 'showContinueIcon', label: 'Icon on Continue button', defaultVal: true },
        ] as const
      ).map(({ key, label, defaultVal }) => {
        const checked = opts[key] ?? defaultVal;
        return (
          <label key={key} className="checkbox-row">
            <input type="checkbox" checked={checked} onChange={() => toggle(key)} />
            {label}
          </label>
        );
      })}
      <label className="option-field">
        <span>Hide answered questions after (seconds, 0 = never)</span>
        <input
          type="number"
          min={0}
          step={1}
          value={(opts.autoHideQuestions ?? 0) / 1000}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: {
                autoHideQuestions: Math.max(0, Math.round(Number(event.target.value) * 1000)),
              },
            })
          }
          aria-label="Hide answered questions after this many seconds (0 keeps them)"
        />
      </label>
      <label className="option-field">
        <span>Hide answers after (seconds, 0 = never)</span>
        <input
          type="number"
          min={0}
          step={1}
          value={(opts.autoHideAnswers ?? 0) / 1000}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: {
                autoHideAnswers: Math.max(0, Math.round(Number(event.target.value) * 1000)),
              },
            })
          }
          aria-label="Hide answers this many seconds after they are given (0 keeps them)"
        />
      </label>
      <label className="option-field">
        <span>Hide animation</span>
        <select
          value={opts.hideAnimation ?? 'fade'}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: { hideAnimation: event.target.value as 'fade' | 'pop' | 'none' },
            })
          }
          aria-label="How hidden questions and answers leave the screen"
        >
          <option value="fade">Fade out</option>
          <option value="pop">Pop off</option>
          <option value="none">Disappear at once</option>
        </select>
      </label>
      <label className="option-field">
        <span>Typing speed (ms per character, 0 = off)</span>
        <input
          type="number"
          min={0}
          step={5}
          value={opts.typingSpeed ?? 0}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: { typingSpeed: Math.max(0, Math.round(Number(event.target.value))) },
            })
          }
          aria-label="Typing speed in milliseconds per character (0 shows questions at once)"
        />
      </label>
      <label className="option-field">
        <span>Thinking time before each question (seconds, 0 = off)</span>
        <input
          type="number"
          min={0}
          step={0.1}
          value={(opts.thinkingDelay ?? 0) / 1000}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_OPTIONS',
              patch: { thinkingDelay: Math.max(0, Math.round(Number(event.target.value) * 1000)) },
            })
          }
          aria-label="Show a thinking bubble for this many seconds before each question (0 turns it off)"
        />
      </label>
      <label className="option-field">
        <span>Thinking text</span>
        <input
          type="text"
          value={opts.thinkingText ?? ''}
          placeholder="animated dots"
          onChange={(event) =>
            dispatch({ type: 'UPDATE_OPTIONS', patch: { thinkingText: event.target.value } })
          }
          aria-label="Text for the thinking bubble. Leave empty for animated dots"
        />
      </label>
    </div>
  );
}
