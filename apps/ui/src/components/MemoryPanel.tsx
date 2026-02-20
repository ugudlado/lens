import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot } from '@lens/schema';
import { EditableContent } from './EditableContent';
import { RawJsonView } from './RawJsonView';
import { ScopeIndicator } from './ScopeIndicator.js';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { useFileDelete } from '../hooks/useFileDelete';
import { PanelShell, PanelRow, PanelEmpty, DeleteButton, AddButton } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

export function MemoryPanel({ config, onRescan }: Props) {
  const { memoryDir, files } = config.memory;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const { update, saving: creating, error: createError } = useConfigUpdate(onRescan);
  const { deleteFile, deleting, error: deleteError } = useFileDelete(onRescan);

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setView('json');
  }

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  async function handleCreate() {
    if (!memoryDir || !newFileName.trim()) return;
    const name = newFileName.trim().endsWith('.md')
      ? newFileName.trim()
      : `${newFileName.trim()}.md`;
    // Strip path separators and traversal sequences
    const safeName = name.replace(/[/\\]/g, '-').replace(/\.\./g, '');
    const filePath = `${memoryDir}/${safeName}`;
    const baseName = safeName.replace(/\.md$/, '');
    const content = `# ${baseName}\n\nTODO: Add memory content here.\n`;
    await update({ surface: 'memory', scope: ConfigScope.Global, filePath, value: content });
    setNewFileName('');
    setShowNewForm(false);
  }

  async function handleDelete(filePath: string, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    await deleteFile(filePath);
  }

  // Sort MEMORY.md first
  const sorted = [...files].sort((a, b) => {
    if (a.name === 'MEMORY.md') return -1;
    if (b.name === 'MEMORY.md') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <PanelShell
      title="Memory"
      subtitle={`${files.length} file${files.length !== 1 ? 's' : ''}`}
      actions={
        memoryDir ? (
          <AddButton variant="header" onClick={() => setShowNewForm(v => !v)}>+ New File</AddButton>
        ) : (
          <AddButton variant="header" onClick={() => {}} disabled>+ New File</AddButton>
        )
      }
      view={view}
      onViewChange={(v) => { setView(v as 'effective' | 'json'); if (v === 'effective') setJumpTarget(null); }}
      viewOptions={[{ value: 'effective', label: 'Effective' }, { value: 'json', label: 'Files' }]}
    >
      {memoryDir && (
        <p className="text-xs text-gray-600 font-mono mb-6">{memoryDir}</p>
      )}

      {showNewForm && memoryDir && (
        <div className="mb-4 bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300">New memory file</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNewForm(false); setNewFileName(''); } }}
              placeholder="filename (e.g. work-context)"
              className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newFileName.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-accent/20 text-accent hover:bg-accent/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewFileName(''); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
          {createError && <p className="text-xs text-red-400">{createError}</p>}
        </div>
      )}

      {deleteError && (
        <div className="mb-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
          {deleteError}
        </div>
      )}

      {view === 'json' ? (
        <RawJsonView files={files.map(f => ({ scope: ConfigScope.Project, filePath: f.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : files.length === 0 ? (
        <PanelEmpty>No memory files found</PanelEmpty>
      ) : (
        <div className="space-y-3">
          {sorted.map((file, i) => {
            const isExpanded = expanded.has(i);
            const isMemoryMd = file.name === 'MEMORY.md';
            return (
              <PanelRow
                key={i}
                label={file.name}
                expanded={isExpanded}
                onToggle={() => toggle(i)}
                actions={
                  <DeleteButton
                    onClick={() => handleDelete(file.filePath, file.name)}
                    disabled={deleting}
                    title={`Delete ${file.name}`}
                  />
                }
                trigger={
                  <>
                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      {'\u25B6'}
                    </span>
                    <span className={`font-medium ${isMemoryMd ? 'text-accent' : 'text-gray-200'}`}>
                      {file.name}
                    </span>
                    <ScopeIndicator scope={ConfigScope.Global} />
                    <span className="text-xs text-gray-500 bg-bg px-2 py-0.5 rounded">
                      {file.lineCount} lines
                    </span>
                    {isMemoryMd && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                        System prompt
                      </span>
                    )}
                  </>
                }
              >
                <div id={`memory-${slug(file.name)}`} className="border-t border-border px-4 py-3">
                  {isMemoryMd && (
                    <div className="text-xs text-gray-500 mb-2">
                      First 200 lines are loaded into the system prompt
                    </div>
                  )}
                  <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                    {file.content}
                  </pre>
                  <button
                    onClick={() => jumpToFile(file.name, file.filePath)}
                    className="mt-3 text-xs text-gray-600 font-mono truncate hover:text-accent transition-colors block"
                    title={file.filePath}
                  >
                    {file.filePath} ↗
                  </button>
                  <EditableContent
                    content={file.content}
                    filePath={file.filePath}
                    scope={ConfigScope.Project}
                    surface="memory"
                    onRescan={onRescan}
                  />
                </div>
              </PanelRow>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
