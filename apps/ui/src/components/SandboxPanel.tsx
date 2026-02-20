import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, ScopedItem, SettingsFile } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { RawJsonView } from './RawJsonView';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

function ScopePicker({
  files,
  onPick,
  onCancel,
}: {
  files: SettingsFile[];
  onPick: (scope: ConfigScope, filePath: string) => void;
  onCancel: () => void;
}) {
  const editableFiles = files.filter(f => f.editable);
  const projectFile = editableFiles.find(f => f.scope === ConfigScope.Project);
  const globalFile = editableFiles.find(f => f.scope === ConfigScope.Global);
  const options = [projectFile, globalFile].filter(Boolean) as SettingsFile[];

  if (options.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500">Scope:</span>
      {options.map(f => (
        <button
          key={f.scope}
          onClick={() => onPick(f.scope, f.filePath)}
          className="px-2 py-0.5 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors capitalize"
        >
          {f.scope}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function BooleanCard({
  label,
  item,
  settingsKey,
  onToggle,
  onInitialize,
  settingsFiles,
  saving,
}: {
  label: string;
  item: ScopedItem<boolean> | null;
  settingsKey: string;
  onToggle: (key: string, item: ScopedItem<boolean>) => void;
  onInitialize: (key: string, scope: ConfigScope, filePath: string, value: boolean) => void;
  settingsFiles: SettingsFile[];
  saving: boolean;
}) {
  const [showScopePicker, setShowScopePicker] = useState(false);

  if (!item) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Not configured</span>
          {!showScopePicker && (
            <button
              onClick={() => setShowScopePicker(true)}
              disabled={saving}
              className="px-2 py-0.5 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              Initialize
            </button>
          )}
        </div>
        {showScopePicker && (
          <ScopePicker
            files={settingsFiles}
            onPick={(scope, filePath) => {
              onInitialize(settingsKey, scope, filePath, false);
              setShowScopePicker(false);
            }}
            onCancel={() => setShowScopePicker(false)}
          />
        )}
      </div>
    );
  }
  const canEdit = item.scope !== ConfigScope.Managed;
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <ScopeIndicator scope={item.scope} />
      </div>
      <div className="flex items-center gap-2">
        {canEdit ? (
          <button
            onClick={() => onToggle(settingsKey, item)}
            disabled={saving}
            className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
              item.value ? 'bg-green-500/40' : 'bg-gray-600/40'
            }`}
            title={`Click to ${item.value ? 'disable' : 'enable'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                item.value ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        ) : (
          <span className={`w-2 h-2 rounded-full ${item.value ? 'bg-green-400' : 'bg-gray-600'}`} />
        )}
        <span className={`text-sm font-medium ${item.value ? 'text-green-400' : 'text-gray-500'}`}>
          {item.value ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
}

function ListCard({
  label,
  item,
  settingsKey,
  onAdd,
  onRemove,
  onInitialize,
  settingsFiles,
  saving,
}: {
  label: string;
  item: ScopedItem<string[]> | null;
  settingsKey: string;
  onAdd: (key: string, item: ScopedItem<string[]>, value: string) => void;
  onRemove: (key: string, item: ScopedItem<string[]>, index: number) => void;
  onInitialize: (key: string, scope: ConfigScope, filePath: string, value: string[]) => void;
  settingsFiles: SettingsFile[];
  saving: boolean;
}) {
  const [newValue, setNewValue] = useState('');
  const [showScopePicker, setShowScopePicker] = useState(false);

  if (!item) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Not configured</span>
          {!showScopePicker && (
            <button
              onClick={() => setShowScopePicker(true)}
              disabled={saving}
              className="px-2 py-0.5 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              Initialize
            </button>
          )}
        </div>
        {showScopePicker && (
          <ScopePicker
            files={settingsFiles}
            onPick={(scope, filePath) => {
              onInitialize(settingsKey, scope, filePath, []);
              setShowScopePicker(false);
            }}
            onCancel={() => setShowScopePicker(false)}
          />
        )}
      </div>
    );
  }

  const canEdit = item.scope !== ConfigScope.Managed;

  function handleAdd() {
    if (!newValue.trim()) return;
    onAdd(settingsKey, item!, newValue.trim());
    setNewValue('');
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <ScopeIndicator scope={item.scope} />
      </div>
      {item.value.length === 0 ? (
        <div className="text-gray-600 text-sm mb-2">None</div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {item.value.map((v, i) => (
            <span key={i} className="px-2 py-0.5 bg-bg rounded text-xs font-mono text-gray-400 flex items-center gap-1">
              {v}
              {canEdit && (
                <button
                  onClick={() => onRemove(settingsKey, item!, i)}
                  disabled={saving}
                  className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="flex gap-2">
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Add item..."
            disabled={saving}
            className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newValue.trim()}
            className="px-2 py-1 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export function SandboxPanel({ config, onRescan }: Props) {
  const { enabled, autoAllowBashIfSandboxed } = config.sandbox;
  const { update, saving, error } = useConfigUpdate(onRescan);
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);

  function jumpToFile(key: string, filePath: string) {
    setJumpTarget({ filePath, key });
    setView('json');
  }

  function toggleBoolean(key: string, item: ScopedItem<boolean>) {
    update({
      surface: 'sandbox',
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: !item.value,
    });
  }

  function initializeSetting(key: string, scope: ConfigScope, filePath: string, value: unknown) {
    update({
      surface: 'sandbox',
      scope,
      filePath,
      key,
      value,
    });
  }

  function addListItem(key: string, item: ScopedItem<string[]>, value: string) {
    update({
      surface: 'sandbox',
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: [...item.value, value],
    });
  }

  function removeListItem(key: string, item: ScopedItem<string[]>, index: number) {
    const newValue = item.value.filter((_, i) => i !== index);
    update({
      surface: 'sandbox',
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: newValue,
    });
  }

  const settingsFiles = config.settings.files;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Sandbox</h2>
        <div className="flex bg-card border border-border rounded-lg overflow-hidden">
          <button onClick={() => { setView('effective'); setJumpTarget(null); }} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'effective' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'}`}>
            Effective
          </button>
          <button onClick={() => setView('json')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'json' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'}`}>
            JSON
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">Process isolation and network restrictions</p>

      {view === 'json' ? (
        <RawJsonView files={config.settings.files.map(f => ({ scope: f.scope, filePath: f.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : (
      <>
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BooleanCard label="Sandbox Enabled" item={enabled} settingsKey="sandbox.enabled" onToggle={toggleBoolean} onInitialize={initializeSetting} settingsFiles={settingsFiles} saving={saving} />
        <BooleanCard label="Auto-allow Bash if Sandboxed" item={autoAllowBashIfSandboxed} settingsKey="sandbox.autoAllowBashIfSandboxed" onToggle={toggleBoolean} onInitialize={initializeSetting} settingsFiles={settingsFiles} saving={saving} />
      </div>

      </>
      )}
    </div>
  );
}
