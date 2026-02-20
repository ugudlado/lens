import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, SettingsFile } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { RawJsonView } from './RawJsonView';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

export function ModelsPanel({ config, onRescan }: Props) {
  const { providers, defaultModel } = config.models;
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSetDefault, setShowSetDefault] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [selectedFile, setSelectedFile] = useState<SettingsFile | null>(null);
  const { update, saving, error } = useConfigUpdate(() => {
    setEditing(false);
    setShowSetDefault(false);
    setNewModelName('');
    setSelectedFile(null);
    onRescan();
  });

  function jumpToFile(key: string, filePath: string) {
    setJumpTarget({ filePath, key });
    setView('json');
  }

  const editableFiles = config.settings.files.filter(f => f.editable);

  function startEdit() {
    if (!defaultModel || defaultModel.scope === ConfigScope.Managed) return;
    setEditValue(String(defaultModel.value));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (!defaultModel || editValue === String(defaultModel.value)) return;
    update({
      surface: 'models',
      scope: defaultModel.scope,
      filePath: defaultModel.filePath,
      key: 'defaultModel',
      value: editValue,
    });
  }

  function submitNewDefault() {
    if (!newModelName.trim() || !selectedFile) return;
    update({
      surface: 'models',
      scope: selectedFile.scope,
      filePath: selectedFile.filePath,
      key: 'defaultModel',
      value: newModelName.trim(),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Models</h2>
        <div className="flex bg-card border border-border rounded-lg overflow-hidden">
          <button onClick={() => { setView('effective'); setJumpTarget(null); }} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'effective' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'}`}>
            Effective
          </button>
          <button onClick={() => setView('json')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'json' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'}`}>
            JSON
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {providers.filter(p => p.available).length} of {providers.length} providers available
      </p>

      {view === 'json' ? (
        <RawJsonView files={config.settings.files.map(f => ({ scope: f.scope, filePath: f.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : (
      <>
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {defaultModel ? (
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-sm text-gray-400">Default model:</span>
          {editing ? (
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
          ) : (
            <code
              onClick={startEdit}
              className={`text-sm font-mono text-accent ${
                defaultModel.scope !== ConfigScope.Managed ? 'cursor-pointer hover:bg-white/5 rounded px-1 -mx-1' : ''
              }`}
              title={defaultModel.scope !== ConfigScope.Managed ? 'Click to edit' : undefined}
            >
              {String(defaultModel.value)}
            </code>
          )}
          <ScopeIndicator scope={defaultModel.scope} />
          <button
            onClick={() => jumpToFile('defaultModel', defaultModel.filePath)}
            className="text-xs text-gray-600 hover:text-accent transition-colors shrink-0"
            title={defaultModel.filePath}
          >
            ↗
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Default model:</span>
            <span className="text-gray-600 text-sm">Not configured</span>
            {!showSetDefault && editableFiles.length > 0 && (
              <button
                onClick={() => {
                  setShowSetDefault(true);
                  setSelectedFile(editableFiles.find(f => f.scope === ConfigScope.Project) || editableFiles[0]);
                }}
                className="px-2 py-0.5 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                Set default model
              </button>
            )}
          </div>
          {showSetDefault && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input
                autoFocus
                value={newModelName}
                onChange={e => setNewModelName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitNewDefault();
                  if (e.key === 'Escape') { setShowSetDefault(false); setNewModelName(''); }
                }}
                placeholder="Model name (e.g. claude-sonnet-4-20250514)"
                disabled={saving}
                className="flex-1 min-w-[240px] text-sm font-mono bg-bg border border-border rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-accent/50 disabled:opacity-50"
              />
              <select
                value={selectedFile ? `${selectedFile.scope}::${selectedFile.filePath}` : ''}
                onChange={e => {
                  const [scope, ...rest] = e.target.value.split('::');
                  const filePath = rest.join('::');
                  const file = editableFiles.find(f => f.scope === scope && f.filePath === filePath);
                  if (file) setSelectedFile(file);
                }}
                className="bg-bg border border-border rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-accent/50 capitalize"
              >
                {editableFiles.map(f => (
                  <option key={`${f.scope}::${f.filePath}`} value={`${f.scope}::${f.filePath}`}>
                    {f.scope}
                  </option>
                ))}
              </select>
              <button
                onClick={submitNewDefault}
                disabled={saving || !newModelName.trim() || !selectedFile}
                className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSetDefault(false); setNewModelName(''); }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map((provider, i) => (
          <div key={i} className={`bg-card border rounded-lg p-5 ${
            provider.available ? 'border-border' : 'border-border opacity-60'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${provider.available ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span className="font-semibold text-gray-200 capitalize">{provider.name}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                {provider.type}
              </span>
              <span className={`ml-auto text-xs ${provider.available ? 'text-green-400' : 'text-gray-500'}`}>
                {provider.available ? 'Available' : 'Not configured'}
              </span>
            </div>

            {provider.configSource && (
              <div className="mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Config source</span>
                <div className="text-sm font-mono text-gray-400 mt-0.5">{provider.configSource}</div>
              </div>
            )}

            {provider.models.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Models</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {provider.models.map(model => (
                    <span
                      key={model.id}
                      className="px-2 py-0.5 bg-bg rounded text-xs font-mono text-gray-400"
                      title={model.detail || model.id}
                    >
                      {model.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
