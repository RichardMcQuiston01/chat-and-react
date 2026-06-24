import { useReducer } from 'react';
import { reducer, initialState } from './reducer.js';
import { Toolbar } from './components/Toolbar.js';
import { PageList } from './components/PageList.js';
import { OptionsPanel } from './components/OptionsPanel.js';
import { PageEditor } from './components/PageEditor.js';
import { RulesPanel } from './components/RulesPanel.js';
import { JsonPreview } from './components/JsonPreview.js';
import './styles/app.css';

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const pages = state.schema['x-chat-pages'];
  const selectedPage = pages[state.selectedPageIndex] ?? pages[0];

  let ruleNames: string[] = [];
  try {
    ruleNames = Object.keys(JSON.parse(state.rulesJson) as object);
  } catch { /* ignore */ }

  return (
    <div className="app">
      <Toolbar state={state} dispatch={dispatch} />

      {state.validationError && (
        <div className="banner banner--error">
          {state.validationError}
          <button className="banner-close" onClick={() => dispatch({ type: 'SET_VALIDATION_ERROR', error: null })}>×</button>
        </div>
      )}
      {state.validationSuccess && (
        <div className="banner banner--success">
          Schema is valid.
          <button className="banner-close" onClick={() => dispatch({ type: 'SET_VALIDATION_SUCCESS', success: false })}>×</button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <PageList
            schema={state.schema}
            selectedIndex={state.selectedPageIndex}
            dispatch={dispatch}
          />
          <OptionsPanel schema={state.schema} dispatch={dispatch} />
        </aside>

        <main className="main">
          {selectedPage && (
            <PageEditor
              page={selectedPage}
              pageIndex={state.selectedPageIndex}
              schema={state.schema}
              ruleNames={ruleNames}
              dispatch={dispatch}
            />
          )}
          <RulesPanel
            rulesJson={state.rulesJson}
            rulesJsonError={state.rulesJsonError}
            dispatch={dispatch}
          />
        </main>
      </div>

      <JsonPreview schema={state.schema} rulesJson={state.rulesJson} />
    </div>
  );
}
