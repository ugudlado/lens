import { useState, useEffect } from 'react';
import type { McpServer, Workspace, ConfigSnapshot } from '@lens/schema';

interface Props {
  workspaces: Workspace[];
  activeProject: string;
  currentServers: McpServer[];
  onImport: (servers: McpServer[]) => Promise<void>;
  onClose: () => void;
}

type ModalState = 'pick-workspace' | 'checklist' | 'importing';

export function WorkspaceImportModal({ workspaces, activeProject, currentServers, onImport, onClose }: Props) {
  const otherWorkspaces = workspaces.filter(w => w.path !== activeProject);

  const [state, setState] = useState<ModalState>('pick-workspace');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceServers, setSourceServers] = useState<McpServer[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentServerNames = new Set(currentServers.map(s => s.name));

  async function loadWorkspace() {
    if (!selectedWorkspace) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/config?project=${encodeURIComponent(selectedWorkspace.path)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as ConfigSnapshot;
      const servers = (data.mcp?.servers ?? []).filter(s => !s.pluginName);
      setSourceServers(servers);
      // Pre-check all servers that don't already exist
      const newNames = new Set(
        servers.filter(s => !currentServerNames.has(s.name)).map(s => s.name)
      );
      setChecked(newNames);
      setState('checklist');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    const toImport = sourceServers.filter(s => checked.has(s.name));
    if (toImport.length === 0) return;
    setState('importing');
    try {
      await onImport(toImport);
      onClose();
    } catch {
      // If import fails, go back to checklist so user can retry
      setState('checklist');
    }
  }

  function toggleServer(name: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const newServers = sourceServers.filter(s => !currentServerNames.has(s.name));
  const existingServers = sourceServers.filter(s => currentServerNames.has(s.name));
  const checkedCount = checked.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-gray-200">Import MCP Servers from Workspace</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* State 1: Pick workspace */}
          {state === 'pick-workspace' && (
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Select a workspace to import MCP servers from.
              </p>

              {otherWorkspaces.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-6">
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

              {loadError && (
                <div className="mt-3 text-xs text-red-400">{loadError}</div>
              )}
            </div>
          )}

          {/* State 2: Checklist */}
          {state === 'checklist' && (
            <div>
              <div className="text-xs text-gray-500 mb-3">
                From <span className="text-gray-300 font-medium">{selectedWorkspace?.name}</span>
                {' — '}
                <span className="text-green-400">{newServers.length} new</span>
                {existingServers.length > 0 && (
                  <>, <span className="text-gray-500">{existingServers.length} already exist</span></>
                )}
              </div>

              {sourceServers.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-6">
                  No MCP servers found in this workspace.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* New servers first */}
                  {newServers.map(server => (
                    <label
                      key={server.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg cursor-pointer hover:border-accent/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(server.name)}
                        onChange={() => toggleServer(server.name)}
                        className="accent-[#6c5ce7] w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200">{server.name}</div>
                        {server.type === 'stdio' && server.command && (
                          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                            {server.command}{server.args?.length ? ' ' + server.args.join(' ') : ''}
                          </div>
                        )}
                        {(server.type === 'http' || server.type === 'sse') && server.url && (
                          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                            {server.url}
                          </div>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        server.type === 'stdio' ? 'bg-purple-500/20 text-purple-400' :
                        server.type === 'http' ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {server.type}
                      </span>
                    </label>
                  ))}

                  {/* Already-existing servers */}
                  {existingServers.map(server => (
                    <div
                      key={server.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg opacity-40"
                    >
                      <input
                        type="checkbox"
                        disabled
                        checked={false}
                        readOnly
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200">{server.name}</div>
                        {server.type === 'stdio' && server.command && (
                          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                            {server.command}{server.args?.length ? ' ' + server.args.join(' ') : ''}
                          </div>
                        )}
                        {(server.type === 'http' || server.type === 'sse') && server.url && (
                          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                            {server.url}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 italic">already exists</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* State 3: Importing */}
          {state === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Importing servers...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {state === 'pick-workspace' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={loadWorkspace}
                disabled={!selectedWorkspace || loading}
                className="px-4 py-1.5 text-sm font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
                )}
                {loading ? 'Loading...' : 'Load'}
              </button>
            </>
          )}

          {state === 'checklist' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={checkedCount === 0}
                className="px-4 py-1.5 text-sm font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {checkedCount > 0 ? `${checkedCount} selected` : ''}
              </button>
            </>
          )}

          {state === 'importing' && (
            <div className="w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
