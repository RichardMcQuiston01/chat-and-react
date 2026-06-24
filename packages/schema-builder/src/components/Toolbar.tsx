import { useRef } from 'react';
import type { BuilderState, BuilderAction } from '../reducer.js';
import { parseSchema } from '@chat-and-react/core';
import type { ChatSchema, JsonLogicRule } from '@chat-and-react/core';

interface Props {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function Toolbar({ state, dispatch }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleNew() {
    const hasContent = state.schema['x-chat-pages'].some(
      (p) => p.title || p.questions.length > 0,
    );
    if (hasContent && !window.confirm('Start a new schema? Unsaved changes will be lost.')) return;
    dispatch({ type: 'NEW_SCHEMA' });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ChatSchema;
        const rulesJson = JSON.stringify(parsed['x-chat-rules'] ?? {}, null, 2);
        dispatch({ type: 'SET_SCHEMA', schema: parsed, rulesJson });
      } catch {
        dispatch({ type: 'SET_VALIDATION_ERROR', error: 'Could not parse file as JSON.' });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function buildExportSchema(): ChatSchema {
    let rules: Record<string, JsonLogicRule> = {};
    try {
      rules = JSON.parse(state.rulesJson) as Record<string, JsonLogicRule>;
    } catch {
      /* use empty rules */
    }
    return { ...state.schema, 'x-chat-rules': Object.keys(rules).length ? rules : undefined };
  }

  function handleValidate() {
    try {
      parseSchema(buildExportSchema());
      dispatch({ type: 'SET_VALIDATION_SUCCESS', success: true });
    } catch (e) {
      const err = e as { message?: string };
      dispatch({ type: 'SET_VALIDATION_ERROR', error: err.message ?? 'Validation failed.' });
    }
  }

  function handleExport() {
    let schema: ChatSchema;
    try {
      schema = buildExportSchema();
      parseSchema(schema);
    } catch (e) {
      const err = e as { message?: string };
      dispatch({ type: 'SET_VALIDATION_ERROR', error: `Cannot export: ${err.message ?? 'invalid schema'}` });
      return;
    }
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="toolbar">
      <span className="toolbar-brand">chat-and-react <span className="toolbar-sub">Schema Builder</span></span>
      <div className="toolbar-actions">
        <button onClick={handleNew} className="btn btn-ghost">New</button>
        <button onClick={() => fileRef.current?.click()} className="btn btn-ghost">Import</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button onClick={handleValidate} className="btn btn-ghost">Validate</button>
        <button onClick={handleExport} className="btn btn-primary">Export JSON</button>
      </div>
    </div>
  );
}
