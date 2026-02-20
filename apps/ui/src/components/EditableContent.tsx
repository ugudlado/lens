import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { CodeEditor } from './CodeEditor';

interface Props {
  content: string;
  filePath: string;
  scope: ConfigScope;
  surface: string;
  onRescan: () => void;
  language?: 'json' | 'markdown';
  readOnly?: boolean;
}

export function EditableContent({ content, filePath, scope, surface, onRescan, language, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const { update, saving, error } = useConfigUpdate(() => {
    setOpen(false);
    onRescan();
  });

  if (scope === ConfigScope.Managed) return null;

  // Auto-detect language from file extension
  const lang = language ?? (filePath.endsWith('.json') ? 'json' : 'markdown');

  function startEdit() {
    setEditValue(content);
    setOpen(true);
  }

  function save() {
    update({
      surface,
      scope,
      filePath,
      value: editValue,
    });
  }

  if (!open) {
    return (
      <button
        onClick={startEdit}
        className="mt-2 px-3 py-1 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        {readOnly ? 'View' : 'Edit'}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <CodeEditor
        value={editValue}
        onChange={readOnly ? () => {} : setEditValue}
        language={lang}
        height="300px"
        readOnly={readOnly}
      />
      {!readOnly && error && (
        <div className="mt-1 text-xs text-red-400">{error}</div>
      )}
      <div className="flex gap-2 mt-2">
        {!readOnly && (
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          disabled={saving}
          className="px-3 py-1 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
        >
          {readOnly ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
