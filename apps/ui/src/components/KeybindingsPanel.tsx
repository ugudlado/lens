import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, KeybindingEntry } from '@lens/schema';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

interface EditState {
  index: number;
  key: string;
  command: string;
  when: string;
}

interface NewEntry {
  key: string;
  command: string;
  when: string;
}

export function KeybindingsPanel({ config, onRescan }: Props) {
  const { filePath, entries } = config.keybindings;
  const { update, saving, error } = useConfigUpdate(onRescan);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<NewEntry>({ key: '', command: '', when: '' });

  async function writeEntries(updated: KeybindingEntry[]) {
    await update({
      surface: 'keybindings',
      scope: ConfigScope.Global,
      filePath,
      key: undefined,
      value: updated,
      replace: true,
    });
  }

  async function handleDelete(index: number) {
    if (!window.confirm('Delete this keybinding?')) return;
    const updated = entries.filter((_, i) => i !== index);
    await writeEntries(updated);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (!editing.key.trim() || !editing.command.trim()) return;
    const updated = entries.map((e, i) =>
      i === editing.index
        ? { key: editing.key.trim(), command: editing.command.trim(), when: editing.when.trim() || undefined }
        : e
    );
    await writeEntries(updated);
    setEditing(null);
  }

  async function handleAdd() {
    if (!newEntry.key.trim() || !newEntry.command.trim()) return;
    const entry: KeybindingEntry = {
      key: newEntry.key.trim(),
      command: newEntry.command.trim(),
      when: newEntry.when.trim() || undefined,
    };
    await writeEntries([...entries, entry]);
    setNewEntry({ key: '', command: '', when: '' });
    setAdding(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Keybindings</h2>
          <p className="text-sm text-gray-500 mt-1">{entries.length} keybinding{entries.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          disabled={saving || adding}
          className="px-3 py-1.5 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Keybinding
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {entries.length === 0 && !adding ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-gray-500">
          No keybindings configured
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {entries.map((entry, i) => {
            const isEditing = editing !== null && editing.index === i;
            return (
              <div key={entry.key || i} id={`keybinding-${slug(entry.key)}`} className="px-4 py-3">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-20 shrink-0">Key</label>
                      <input
                        type="text"
                        value={editing.key}
                        onChange={e => setEditing(prev => prev ? { ...prev, key: e.target.value } : null)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape' && !saving) setEditing(null); }}
                        autoFocus
                        disabled={saving}
                        placeholder="e.g. ctrl+shift+p"
                        className="flex-1 bg-bg border border-accent rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-20 shrink-0">Command</label>
                      <input
                        type="text"
                        value={editing.command}
                        onChange={e => setEditing(prev => prev ? { ...prev, command: e.target.value } : null)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape' && !saving) setEditing(null); }}
                        disabled={saving}
                        placeholder="e.g. workbench.action.showCommands"
                        className="flex-1 bg-bg border border-border rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none focus:border-accent disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-20 shrink-0">When</label>
                      <input
                        type="text"
                        value={editing.when}
                        onChange={e => setEditing(prev => prev ? { ...prev, when: e.target.value } : null)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape' && !saving) setEditing(null); }}
                        disabled={saving}
                        placeholder="optional condition"
                        className="flex-1 bg-bg border border-border rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none focus:border-accent disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editing.key.trim() || !editing.command.trim()}
                        className="px-2.5 py-1 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        disabled={saving}
                        className="px-2.5 py-1 bg-gray-700/40 text-gray-400 rounded text-xs font-medium hover:text-gray-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="text-sm font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{entry.key}</code>
                        <span className="text-gray-400 text-xs">→</span>
                        <code className="text-sm font-mono text-gray-200 truncate">{entry.command}</code>
                      </div>
                      {entry.when && (
                        <div className="mt-1 text-xs text-gray-500 font-mono">
                          when: {entry.when}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditing({ index: i, key: entry.key, command: entry.command, when: entry.when ?? '' }); setAdding(false); }}
                      disabled={saving}
                      className="text-gray-600 hover:text-accent transition-colors text-sm px-1 disabled:opacity-50 shrink-0"
                      title="Edit keybinding"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      disabled={saving}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1 disabled:opacity-50 shrink-0"
                      title="Delete keybinding"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {adding && (
            <div className="px-4 py-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20 shrink-0">Key</label>
                  <input
                    type="text"
                    value={newEntry.key}
                    onChange={e => setNewEntry(prev => ({ ...prev, key: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape' && !saving) setAdding(false); }}
                    autoFocus
                    disabled={saving}
                    placeholder="e.g. ctrl+shift+p"
                    className="flex-1 bg-bg border border-accent rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20 shrink-0">Command</label>
                  <input
                    type="text"
                    value={newEntry.command}
                    onChange={e => setNewEntry(prev => ({ ...prev, command: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape' && !saving) setAdding(false); }}
                    disabled={saving}
                    placeholder="e.g. workbench.action.showCommands"
                    className="flex-1 bg-bg border border-border rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20 shrink-0">When</label>
                  <input
                    type="text"
                    value={newEntry.when}
                    onChange={e => setNewEntry(prev => ({ ...prev, when: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape' && !saving) setAdding(false); }}
                    disabled={saving}
                    placeholder="optional condition"
                    className="flex-1 bg-bg border border-border rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleAdd}
                    disabled={saving || !newEntry.key.trim() || !newEntry.command.trim()}
                    className="px-2.5 py-1 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    disabled={saving}
                    className="px-2.5 py-1 bg-gray-700/40 text-gray-400 rounded text-xs font-medium hover:text-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 font-mono truncate" title={filePath}>
        {filePath}
      </div>
    </div>
  );
}
