import type { ChatQuestion, ChatInputType } from '@chat-and-react/core';
import type { BuilderAction } from '../reducer.js';

const INPUT_TYPES: ChatInputType[] = ['text', 'textarea', 'dropdown', 'radio', 'checkbox'];
const OPTION_TYPES: ChatInputType[] = ['dropdown', 'radio', 'checkbox'];

interface Props {
  question: ChatQuestion;
  pageIndex: number;
  questionIndex: number;
  questionCount: number;
  ruleNames: string[];
  dispatch: React.Dispatch<BuilderAction>;
}

export function QuestionCard({
  question,
  pageIndex,
  questionIndex,
  questionCount,
  ruleNames,
  dispatch,
}: Props) {
  function update(patch: Partial<ChatQuestion>) {
    dispatch({ type: 'UPDATE_QUESTION', pageIndex, questionIndex, patch });
  }

  function handleInputTypeChange(inputType: ChatInputType) {
    const type = inputType === 'checkbox' ? 'array' : 'string';
    const patch: Partial<ChatQuestion> = { 'x-chat-input': inputType, type };
    if (!OPTION_TYPES.includes(inputType)) {
      patch.enum = undefined;
      patch.items = undefined;
    }
    if (inputType !== 'text' && inputType !== 'textarea') {
      patch['x-chat-placeholder'] = undefined;
    }
    update(patch);
  }

  function handleConditionMode(mode: 'none' | 'ref') {
    if (mode === 'none') {
      update({ 'x-chat-condition': undefined });
    } else {
      update({ 'x-chat-condition': { ref: '' } });
    }
  }

  const conditionMode =
    !question['x-chat-condition']
      ? 'none'
      : 'ref' in (question['x-chat-condition'] as object)
        ? 'ref'
        : 'none';

  const optionValues: string[] =
    question['x-chat-input'] === 'checkbox'
      ? (question.items?.enum ?? [])
      : (question.enum ?? []);

  function setOptions(values: string[]) {
    if (question['x-chat-input'] === 'checkbox') {
      update({ items: { enum: values }, enum: undefined });
    } else {
      update({ enum: values, items: undefined });
    }
  }

  function addOption() { setOptions([...optionValues, '']); }
  function removeOption(i: number) { setOptions(optionValues.filter((_, idx) => idx !== i)); }
  function updateOption(i: number, val: string) {
    setOptions(optionValues.map((v, idx) => (idx === i ? val : v)));
  }

  const isOptionType = OPTION_TYPES.includes(question['x-chat-input']);
  const isTextType = question['x-chat-input'] === 'text' || question['x-chat-input'] === 'textarea';

  return (
    <div className="card question-card">
      <div className="card-row">
        <div className="field">
          <label className="field-label">ID</label>
          <input
            className="field-input"
            value={question.id}
            onChange={(e) => update({ id: e.target.value })}
            placeholder="question-id"
          />
        </div>
        <div className="field">
          <label className="field-label">Input type</label>
          <select
            className="field-input"
            value={question['x-chat-input']}
            onChange={(e) => handleInputTypeChange(e.target.value as ChatInputType)}
          >
            {INPUT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="card-actions">
          <button
            className="btn-icon"
            title="Move up"
            disabled={questionIndex === 0}
            onClick={() =>
              dispatch({ type: 'MOVE_QUESTION', pageIndex, from: questionIndex, to: questionIndex - 1 })
            }
          >↑</button>
          <button
            className="btn-icon"
            title="Move down"
            disabled={questionIndex === questionCount - 1}
            onClick={() =>
              dispatch({ type: 'MOVE_QUESTION', pageIndex, from: questionIndex, to: questionIndex + 1 })
            }
          >↓</button>
          <button
            className="btn-icon btn-icon--danger"
            title="Remove question"
            onClick={() => dispatch({ type: 'REMOVE_QUESTION', pageIndex, questionIndex })}
          >×</button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Title</label>
        <input
          className="field-input"
          value={question.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Question text shown to the user"
        />
      </div>

      {isTextType && (
        <div className="field">
          <label className="field-label">Placeholder</label>
          <input
            className="field-input"
            value={question['x-chat-placeholder'] ?? ''}
            onChange={(e) => update({ 'x-chat-placeholder': e.target.value || undefined })}
            placeholder="Optional placeholder text"
          />
        </div>
      )}

      {isOptionType && (
        <div className="field">
          <label className="field-label">Options</label>
          {optionValues.map((val, i) => (
            <div key={i} className="option-row">
              <input
                className="field-input"
                value={val}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button className="btn-icon btn-icon--danger" onClick={() => removeOption(i)}>×</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addOption}>+ Add option</button>
        </div>
      )}

      <div className="field">
        <label className="field-label">Condition</label>
        <select
          className="field-input field-input--sm"
          value={conditionMode}
          onChange={(e) => handleConditionMode(e.target.value as 'none' | 'ref')}
        >
          <option value="none">Always show</option>
          <option value="ref">Named rule ref</option>
        </select>
        {conditionMode === 'ref' && (
          <select
            className="field-input field-input--sm"
            value={(question['x-chat-condition'] as { ref: string })?.ref ?? ''}
            onChange={(e) => update({ 'x-chat-condition': { ref: e.target.value } })}
          >
            <option value="">— select rule —</option>
            {ruleNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
