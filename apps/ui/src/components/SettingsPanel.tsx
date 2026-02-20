import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, ScopedItem, SettingsFile } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { RawJsonView } from './RawJsonView';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { SearchBar } from './SearchBar';
import { PanelShell, PanelEmpty, DeleteButton, AddButton } from './panel/index.js';
import { ScopeMoveButton, type ScopeMoveOption } from './ScopeMoveButton.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

type View = 'effective' | 'by-file';

const SCOPE_SORT_ORDER: Record<string, number> = {
  [ConfigScope.Local]: 0,
  [ConfigScope.Project]: 1,
  [ConfigScope.Global]: 2,
  [ConfigScope.Managed]: 3,
};

interface JumpTarget {
  filePath: string;
  key: string;
}

const COPYABLE_SCOPES: ConfigScope[] = [ConfigScope.Global, ConfigScope.Project, ConfigScope.Local];

function EditableValue({
  settingKey,
  item,
  onSave,
  saving,
}: {
  settingKey: string;
  item: ScopedItem<unknown>;
  onSave: (key: string, item: ScopedItem<unknown>, newValue: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const displayValue = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
  const [editValue, setEditValue] = useState(displayValue);

  function startEdit() {
    if (!item.editable || item.scope === ConfigScope.Managed) return;
    setEditValue(displayValue);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (editValue === displayValue) return;
    onSave(settingKey, item, editValue);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        disabled={saving}
        className="text-sm font-mono text-accent flex-1 bg-bg border border-accent/50 rounded px-2 py-0.5 focus:outline-none focus:border-accent"
      />
    );
  }

  return (
    <code
      onClick={startEdit}
      className={`text-sm font-mono text-accent flex-1 truncate ${
        item.editable && item.scope !== ConfigScope.Managed ? 'cursor-pointer hover:bg-white/5 rounded px-1 -mx-1' : ''
      }`}
      title={item.editable && item.scope !== ConfigScope.Managed ? 'Click to edit' : undefined}
    >
      {displayValue}
    </code>
  );
}

function AddSettingForm({
  files,
  onAdd,
  onCancel,
  saving,
}: {
  files: SettingsFile[];
  onAdd: (key: string, value: unknown, file: SettingsFile) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const editableFiles = files.filter(f => f.editable);
  const [keyName, setKeyName] = useState('');
  const [valueStr, setValueStr] = useState('');
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSave() {
    const trimmedKey = keyName.trim();
    if (!trimmedKey) {
      setFormError('Key name is required');
      return;
    }
    if (!editableFiles[selectedFileIdx]) {
      setFormError('No editable file selected');
      return;
    }

    // Parse value: try JSON first, fallback to string
    let parsed: unknown;
    try {
      parsed = JSON.parse(valueStr);
    } catch {
      parsed = valueStr;
    }

    setFormError(null);
    onAdd(trimmedKey, parsed, editableFiles[selectedFileIdx]);
  }

  if (editableFiles.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-4 text-sm text-gray-500">
        No editable settings files available.
      </div>
    );
  }

  return (
    <div className="bg-card border border-accent/30 rounded-lg p-4 mb-4 space-y-3">
      <div className="text-sm font-medium text-gray-200">Add New Setting</div>
      {formError && (
        <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
          {formError}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-14 flex-shrink-0">Key</label>
          <input
            autoFocus
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="e.g. model, apiProvider"
            className="flex-1 text-sm font-mono bg-bg border border-border rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-14 flex-shrink-0">Value</label>
          <input
            value={valueStr}
            onChange={e => setValueStr(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder='e.g. true, "string", {"key": "val"}'
            className="flex-1 text-sm font-mono bg-bg border border-border rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-14 flex-shrink-0">File</label>
          <select
            value={selectedFileIdx}
            onChange={e => setSelectedFileIdx(Number(e.target.value))}
            className="flex-1 text-sm font-mono bg-bg border border-border rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-accent/50"
          >
            {editableFiles.map((f, i) => (
              <option key={f.filePath} value={i}>
                [{f.scope}] {f.filePath.split('/').pop()}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({ config, onRescan }: Props) {
  const { files, effective } = config.settings;
  const [view, setView] = useState<View>('effective');
  const [showAddForm, setShowAddForm] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const { update, saving, error } = useConfigUpdate(onRescan);

  function jumpToFile(key: string, filePath: string) {
    setJumpTarget({ filePath, key });
    setView('by-file');
  }

  function saveValue(key: string, item: ScopedItem<unknown>, newValue: string) {
    // Try to parse as JSON first (for objects/arrays/numbers/booleans)
    let parsed: unknown;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      parsed = newValue;
    }

    update({
      surface: 'settings',
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: parsed,
    });
  }

  function copyToScope(key: string, value: unknown, targetFile: SettingsFile) {
    update({
      surface: 'settings',
      scope: targetFile.scope,
      filePath: targetFile.filePath,
      key,
      value,
    });
  }

  async function moveToScope(key: string, value: unknown, targetFile: SettingsFile, sourceItem: ScopedItem<unknown>) {
    // First write to target
    await update({
      surface: 'settings',
      scope: targetFile.scope,
      filePath: targetFile.filePath,
      key,
      value,
    });
    // Then delete from source
    await update({
      surface: 'settings',
      scope: sourceItem.scope,
      filePath: sourceItem.filePath,
      key,
      value: null,
      delete: true,
    });
  }

  function deleteSetting(key: string, item: ScopedItem<unknown>) {
    if (!confirm(`Delete setting "${key}" from ${item.scope} scope?`)) return;
    update({
      surface: 'settings',
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: null,
      delete: true,
    });
  }

  function addSetting(key: string, value: unknown, file: SettingsFile) {
    update({
      surface: 'settings',
      scope: file.scope,
      filePath: file.filePath,
      key,
      value,
    });
    setShowAddForm(false);
  }

  const [search, setSearch] = useState('');
  const effectiveEntries = Object.entries(effective);

  const filteredEntries = effectiveEntries.filter(([key, item]) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const valStr = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
    return key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
  }).sort(([keyA, a], [keyB, b]) => {
    const sd = (SCOPE_SORT_ORDER[a.scope] ?? 9) - (SCOPE_SORT_ORDER[b.scope] ?? 9);
    return sd !== 0 ? sd : keyA.localeCompare(keyB);
  });

  return (
    <PanelShell
      title="Settings"
      subtitle={`${effectiveEntries.length} effective settings from ${files.length} file${files.length !== 1 ? 's' : ''}`}
      actions={view === 'effective' ? (
        <AddButton variant="header" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? 'Cancel' : '+ Add Setting'}
        </AddButton>
      ) : undefined}
      view={view}
      onViewChange={(v) => { setView(v as View); setJumpTarget(null); }}
      viewOptions={[{ value: 'effective', label: 'Effective' }, { value: 'by-file', label: 'Files' }]}
    >
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {view === 'effective' ? (
        <>
          {showAddForm && (
            <AddSettingForm
              files={files}
              onAdd={addSetting}
              onCancel={() => setShowAddForm(false)}
              saving={saving}
            />
          )}
          <SearchBar value={search} onChange={setSearch} placeholder="Search settings..." itemCount={effectiveEntries.length} filteredCount={filteredEntries.length} />
          {effectiveEntries.length === 0 ? (
            <PanelEmpty>No settings configured</PanelEmpty>
          ) : (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {filteredEntries.map(([key, item]) => (
                <div key={key} id={`setting-${slug(key)}-${item.scope}`} className="flex items-center gap-3 px-4 py-3">
                  <code className="text-sm font-mono text-gray-200 min-w-0 flex-shrink-0">{key}</code>
                  <EditableValue settingKey={key} item={item} onSave={saveValue} saving={saving} />
                  <ScopeIndicator scope={item.scope} />
                  <ScopeMoveButton
                    saving={saving}
                    options={
                      COPYABLE_SCOPES
                        .filter(s => s !== item.scope)
                        .flatMap(scope => {
                          const file = files.find(f => f.scope === scope);
                          if (!file || !file.editable) return [];
                          const option: ScopeMoveOption = {
                            label: scope,
                            scope,
                            filePath: file.filePath,
                            onCopy: async () => copyToScope(key, item.value, file),
                            onMove: (item.editable && item.scope !== ConfigScope.Managed)
                              ? async () => moveToScope(key, item.value, file, item)
                              : undefined,
                          };
                          return [option];
                        })
                    }
                  />
                  {item.editable && item.scope !== ConfigScope.Managed && (
                    <DeleteButton
                      onClick={() => deleteSetting(key, item)}
                      disabled={saving}
                      title={`Delete "${key}" from ${item.scope} scope`}
                    />
                  )}
                  <button
                    onClick={() => jumpToFile(key, item.filePath)}
                    className="text-xs text-gray-600 font-mono truncate max-w-[180px] hover:text-accent transition-colors"
                    title={`View in file: ${item.filePath}`}
                  >
                    {item.filePath.split('/').pop()} ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <RawJsonView
          files={files.map(f => ({ scope: f.scope, filePath: f.filePath }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      )}
    </PanelShell>
  );
}
