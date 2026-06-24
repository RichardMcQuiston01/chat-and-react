import type { ChatSchema } from '@chat-and-react/core';
import type { BuilderAction } from '../reducer.js';

interface Props {
  schema: ChatSchema;
  selectedIndex: number;
  dispatch: React.Dispatch<BuilderAction>;
}

export function PageList({ schema, selectedIndex, dispatch }: Props) {
  const pages = schema['x-chat-pages'];

  return (
    <div className="page-list">
      <div className="page-list-header">Pages</div>
      <ul className="page-list-items">
        {pages.map((page, i) => (
          <li
            key={page.id + i}
            className={`page-list-item${i === selectedIndex ? ' page-list-item--active' : ''}`}
          >
            <button
              className="page-list-label"
              onClick={() => dispatch({ type: 'SET_SELECTED_PAGE', index: i })}
            >
              <span className="page-list-index">{i + 1}</span>
              <span className="page-list-title">{page.title || page.id || '(untitled)'}</span>
            </button>
            <button
              className="page-list-remove"
              title="Remove page"
              disabled={pages.length <= 1}
              onClick={() => dispatch({ type: 'REMOVE_PAGE', index: i })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        className="btn btn-ghost page-list-add"
        onClick={() => dispatch({ type: 'ADD_PAGE' })}
      >
        + Add page
      </button>
    </div>
  );
}
