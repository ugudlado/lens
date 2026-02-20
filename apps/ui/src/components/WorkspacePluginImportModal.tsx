import { useState, useEffect } from 'react';
import { PluginScope } from '@lens/schema';
import type { ConfigSnapshot, Workspace, PluginEntry } from '@lens/schema';

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalState = 'pick-workspace' | 'checklist' | 'importing';

interface Props {
  workspaces: Workspace[];
  activeProject: string;
  currentPlugins: PluginEntry[];
  onClose: () => void;
  onImport: (plugins: Array<{ name: string; marketplace: string }>) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkspacePluginImportModal({
  workspaces,
  activeProject,
  currentPlugins,
  onClose,
  onImport,
}: Props) {
  const otherWorkspaces = workspaces.filter(w => w.path !== activeProject);

  const [state, setState] = useState<ModalState>('pick-workspace');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [sourcePlugins, setSourcePlugins] = useState<PluginEntry[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Build a set of already-installed plugin keys
  const installedKeys = new Set(currentPlugins.map(p => `${p.name}@${p.marketplace}`));

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function loadWorkspace() {
    if (!selectedWorkspace) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/config?project=${encodeURIComponent(selectedWorkspace.path)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as ConfigSnapshot;

      const projectPlugins = (data.plugins?.plugins ?? []).filter(
        p => p.scope === PluginScope.Project
      );

      setSourcePlugins(projectPlugins);

      // Pre-check plugins that are NOT already installed
      const newChecked = new Set<string>();
      for (const p of projectPlugins) {
        const key = `${p.name}@${p.marketplace}`;
        if (!installedKeys.has(key)) {
          newChecked.add(key);
        }
      }
      setChecked(newChecked);
      setState('checklist');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function togglePlugin(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleImport() {
    const toImport = sourcePlugins
      .filter(p => checked.has(`${p.name}@${p.marketplace}`))
      .map(p => ({ name: p.name, marketplace: p.marketplace }));

    if (toImport.length === 0) return;
    setState('importing');
    setImportError(null);

    try {
      await onImport(toImport);
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setState('checklist');
    }
  }

  // Group source plugins by marketplace
  const byMarketplace = new Map<string, PluginEntry[]>();
  for (const p of sourcePlugins) {
    const arr = byMarketplace.get(p.marketplace) ?? [];
    arr.push(p);
    byMarketplace.set(p.marketplace, arr);
  }
  const marketplaceNames = [...byMarketplace.keys()].sort();

  const checkedCount = checked.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: '560px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-200">
            Import Plugins from Workspace
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* State: pick-workspace */}
          {state === 'pick-workspace' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm text-gray-400 mb-4">
                Select a workspace to import project-scoped plugins from.
              </p>
              {otherWorkspaces.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No other workspaces available.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {otherWorkspaces.map(ws => (
                    <button
                      key={ws.path}
                      onClick={() => setSelectedWorkspace(ws)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedWorkspace?.path === ws.path
                          ? 'border-accent/60 bg-accent/10 text-gray-200'
                          : 'border-border bg-bg text-gray-300 hover:border-accent/30 hover:bg-accent/5'
                      }`}
                    >
                      <div className="font-medium text-sm">{ws.name}</div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">{ws.path}</div>
                    </button>
                  ))}
                </div>
              )}
              {loadError && <div className="mt-3 text-xs text-red-400">{loadError}</div>}
            </div>
          )}

          {/* State: checklist */}
          {state === 'checklist' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-4">
                From: {selectedWorkspace?.name}
              </div>

              {importError && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                  {importError}
                </div>
              )}

              {sourcePlugins.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No project-scoped plugins found in this workspace.
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {marketplaceNames.map(mp => {
                    const plugins = byMarketplace.get(mp) ?? [];
                    return (
                      <div key={mp}>
                        <div className="text-xs font-semibold text-gray-400 mb-2">{mp}</div>
                        <div className="flex flex-col gap-1.5">
                          {plugins.map(p => {
                            const key = `${p.name}@${p.marketplace}`;
                            const alreadyInstalled = installedKeys.has(key);
                            if (alreadyInstalled) {
                              return (
                                <div
                                  key={key}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg opacity-40"
                                >
                                  <input
                                    type="checkbox"
                                    disabled
                                    checked={false}
                                    readOnly
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-300 truncate">{p.name}</div>
                                    {p.description && (
                                      <div className="text-[11px] text-gray-500 truncate mt-0.5">{p.description}</div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-600 italic flex-shrink-0">Already installed</span>
                                </div>
                              );
                            }
                            return (
                              <label
                                key={key}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg cursor-pointer hover:border-accent/30 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked.has(key)}
                                  onChange={() => togglePlugin(key)}
                                  className="accent-[#6c5ce7] w-3.5 h-3.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-200 truncate">{p.name}</div>
                                  {p.description && (
                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">{p.description}</div>
                                  )}
                                </div>
                                {p.version && (
                                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{p.version}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* State: importing */}
          {state === 'importing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Importing plugins...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          {state === 'pick-workspace' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={loadWorkspace}
                disabled={!selectedWorkspace || loading}
                className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
                )}
                {loading ? 'Loading...' : 'Load Workspace'}
              </button>
            </>
          )}

          {state === 'checklist' && (
            <>
              <button
                onClick={() => setState('pick-workspace')}
                className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={checkedCount === 0}
                className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {checkedCount > 0 ? `${checkedCount} plugin${checkedCount !== 1 ? 's' : ''}` : ''}
              </button>
            </>
          )}

          {state === 'importing' && <div className="w-full" />}
        </div>
      </div>
    </div>
  );
}
