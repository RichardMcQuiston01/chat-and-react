import { useState } from 'react';
import type { ChatSchema } from '@chat-and-react/core';

interface Props {
  schema: ChatSchema;
  rulesJson: string;
}

export function JsonPreview({ schema, rulesJson }: Props) {
  const [open, setOpen] = useState(false);

  let rules: Record<string, unknown> = {};
  try { rules = JSON.parse(rulesJson) as Record<string, unknown>; } catch { /* skip */ }

  const preview = JSON.stringify(
    { ...schema, 'x-chat-rules': Object.keys(rules).length ? rules : undefined },
    null,
    2,
  );

  return (
    <div className={`json-preview${open ? ' json-preview--open' : ''}`}>
      <button className="json-preview-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} JSON Preview
      </button>
      {open && <pre className="json-preview-code">{preview}</pre>}
    </div>
  );
}
