import { useState } from 'react';
import { ConfigScope, PluginAction } from '@lens/schema';
import type { ConfigSnapshot, McpServer, Workspace } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator.js';
import { RawJsonView } from './RawJsonView.js';
import { useConfigUpdate } from '../hooks/useConfigUpdate.js';
import { usePluginAction } from '../hooks/usePluginAction.js';
import { SearchBar } from './SearchBar.js';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { WorkspaceConfigImportModal } from './WorkspaceConfigImportModal.js';
import { TYPE_BADGE_STYLES } from '../constants/badgeStyles.js';
import { PanelShell, PanelRow, PanelEmpty, DeleteButton } from './panel/index.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
  workspaces?: Workspace[];
  activeProject?: string;
}

type View = 'effective' | 'json';
type ServerType = 'stdio' | 'http' | 'sse';

interface JumpTarget {
  filePath: string;
  key: string;
}

/** Derive a server name from a command string.
 *  - Looks for `@scope/package-name` in tokens, extracts `package-name`
 *  - Falls back to the command name (first token)
 */
function deriveNameFromCommand(input: string): string {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length === 0) return '';

  // Search args for a scoped package pattern like @org/server-foo
  for (let i = 1; i < tokens.length; i++) {
    const match = tokens[i].match(/@[\w.-]+\/([\w.-]+)/);
    if (match) return match[1];
  }

  // Fallback: use the command name itself
  return tokens[0];
}

/** Parse a full command string into { command, args } */
function parseCommand(input: string): { command: string; args: string[] } {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { command: '', args: [] };
  return { command: tokens[0], args: tokens.slice(1) };
}

type McpScope = ConfigScope.Project | ConfigScope.Global;

function AddServerForm({ config, onRescan }: { config: ConfigSnapshot; onRescan: () => void }) {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nameOverride, setNameOverride] = useState('');
  const [serverName, setServerName] = useState('');
  const [type, setType] = useState<ServerType>('stdio');
  const [url, setUrl] = useState('');
  const [selectedScope, setSelectedScope] = useState<McpScope>(ConfigScope.Project);
  const { update, saving, error } = useConfigUpdate(() => {
    setCommandInput('');
    setNameOverride('');
    setServerName('');
    setUrl('');
    setShowAdvanced(false);
    setOpen(false);
    onRescan();
  });

  const mcpPaths: Record<McpScope, string> = {
    [ConfigScope.Project]: `${config.projectPath}/.mcp.json`,
    [ConfigScope.Global]: `${config.globalPath}/.mcp.json`,
  };

  const derivedName = deriveNameFromCommand(commandInput);
  const effectiveName = type === 'stdio'
    ? (nameOverride.trim() || derivedName)
    : (serverName.trim() || nameOverride.trim());

  function submit() {
    if (!effectiveName) return;

    const targetScope = selectedScope;
    const targetPath = mcpPaths[targetScope];

    if (type === 'stdio') {
      const { command, args } = parseCommand(commandInput);
      if (!command) return;

      const serverConfig: Record<string, unknown> = { type: 'stdio', command };
      if (args.length > 0) serverConfig.args = args;

      update({
        surface: 'mcp',
        scope: targetScope,
        filePath: targetPath,
        key: `mcpServers.${effectiveName}`,
        value: serverConfig,
      });
    } else {
      if (!url.trim()) return;

      update({
        surface: 'mcp',
        scope: targetScope,
        filePath: targetPath,
        key: `mcpServers.${effectiveName}`,
        value: { type, url: url.trim() },
      });
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        + Add Server
      </button>
    );
  }

  return (
    <div className="mb-6 bg-card border border-accent/30 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Add MCP Server</h3>

      {error && (
        <div className="mb-3 text-xs text-red-400">{error}</div>
      )}

      {/* Scope selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 uppercase tracking-wide">Scope</label>
        <div className="flex gap-3 mt-1">
          {([ConfigScope.Project, ConfigScope.Global] as McpScope[]).map(scope => (
            <label key={scope} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="mcp-scope"
                value={scope}
                checked={selectedScope === scope}
                onChange={() => setSelectedScope(scope)}
                className="accent-accent"
              />
              {scope.charAt(0).toUpperCase() + scope.slice(1)}
              <span className="text-xs text-gray-600 font-mono">
                {mcpPaths[scope].replace(/^.*\/\.claude\//, '~/.claude/').replace(/^.*\/([^/]+\/.mcp\.json)$/, '$1')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Name input for http/sse servers */}
      {type !== 'stdio' && (
        <div className="mb-3">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Server Name</label>
          <input
            value={serverName}
            onChange={e => setServerName(e.target.value)}
            placeholder="my-server"
            className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
          />
        </div>
      )}

      {type === 'stdio' ? (
        <div className="mb-3">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Command</label>
          <input
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="npx -y @modelcontextprotocol/server-foo"
            autoFocus
            className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
          />
          {commandInput.trim() && (
            <div className="mt-1.5 text-xs text-gray-500">
              Name: <span className="text-gray-300 font-mono">{effectiveName || '...'}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <label className="text-xs text-gray-500 uppercase tracking-wide">URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="https://example.com/mcp"
            autoFocus
            className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
          />
        </div>
      )}

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mb-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showAdvanced ? '-- Hide advanced' : '++ Advanced'}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Name override</label>
            <input
              value={nameOverride}
              onChange={e => setNameOverride(e.target.value)}
              placeholder={derivedName || 'auto-derived'}
              className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ServerType)}
              className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent/50"
            >
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </select>
          </div>
          {type !== 'stdio' && !url.trim() && (
            <div className="md:col-span-2 text-xs text-gray-500">
              Enter the server URL in the field above
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !effectiveName}
          className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Server'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function McpPanel({ config, onRescan, workspaces = [], activeProject = '' }: Props) {
  const { servers } = config.mcp;
  const [view, setView] = useState<View>('effective');
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const { update, saving, error } = useConfigUpdate(onRescan);
  const { run: runPluginAction, acting: pluginActing, error: pluginError, clearError: clearPluginError } = usePluginAction(onRescan);
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  function toggleRow(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const otherWorkspaces = workspaces.filter(w => w.path !== activeProject);

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setView('json');
  }

  const filteredServers = servers.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q)
      || (s.command || '').toLowerCase().includes(q)
      || (s.url || '').toLowerCase().includes(q)
      || s.type.toLowerCase().includes(q);
  }).sort((a, b) => {
    // Non-plugin before plugin servers
    const aPlugin = a.pluginName ? 1 : 0;
    const bPlugin = b.pluginName ? 1 : 0;
    if (aPlugin !== bPlugin) return aPlugin - bPlugin;
    // Within each group: local → project → global → managed, then name
    const SCOPE_ORDER: Record<string, number> = { local: 0, project: 1, global: 2, managed: 3 };
    const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
    return sd !== 0 ? sd : a.name.localeCompare(b.name);
  });

  // Collect unique config files that contain MCP servers
  const mcpFiles = servers.reduce<{ scope: ConfigScope; filePath: string }[]>((acc, s) => {
    if (!acc.some(f => f.filePath === s.filePath)) {
      acc.push({ scope: s.scope, filePath: s.filePath });
    }
    return acc;
  }, []);

  async function toggleServer(server: McpServer) {
    if (server.scope === ConfigScope.Managed) return;

    // For plugin MCP servers, the key in .mcp.json uses the raw name (without plugin:name: prefix)
    const fileKey = server.pluginName
      ? server.name.replace(`plugin:${server.pluginName}:`, '')
      : server.name;

    await update({
      surface: 'mcp',
      scope: server.scope,
      filePath: server.filePath,
      key: `mcpServers.${fileKey}.disabled`,
      value: server.enabled,
    });
  }

  async function deleteServer(server: McpServer) {
    if (server.scope === ConfigScope.Managed) return;

    await update({
      surface: 'mcp',
      scope: server.scope,
      filePath: server.filePath,
      key: `mcpServers.${server.name}`,
      value: null,
      delete: true,
    });
  }

  function buildServerConfig(server: McpServer): Record<string, unknown> {
    const serverConfig: Record<string, unknown> = { type: server.type };
    if (server.command) serverConfig.command = server.command;
    if (server.args?.length) serverConfig.args = server.args;
    if (server.url) serverConfig.url = server.url;
    if (server.env && Object.keys(server.env).length) serverConfig.env = server.env;
    if (!server.enabled) serverConfig.disabled = true;
    return serverConfig;
  }

  function getScopeOptions(server: McpServer): { label: string; scope?: ConfigScope; onCopy: () => Promise<void>; onMove?: () => Promise<void> }[] {
    const globalFilePath = `${config.globalPath}/.mcp.json`;
    const projectFilePath = `${config.projectPath}/.mcp.json`;

    async function copyTo(targetScope: ConfigScope, targetFilePath: string) {
      await update({
        surface: 'mcp',
        scope: targetScope,
        filePath: targetFilePath,
        key: `mcpServers.${server.name}`,
        value: buildServerConfig(server),
      });
    }

    async function moveFrom(targetScope: ConfigScope, targetFilePath: string) {
      await copyTo(targetScope, targetFilePath);
      await update({
        surface: 'mcp',
        scope: server.scope,
        filePath: server.filePath,
        key: `mcpServers.${server.name}`,
        value: null,
        delete: true,
      });
    }

    if (server.scope === ConfigScope.Project) {
      if (!config.allowGlobalWrites) return [];
      return [{
        label: 'Global',
        scope: ConfigScope.Global,
        onCopy: () => copyTo(ConfigScope.Global, globalFilePath),
        onMove: () => moveFrom(ConfigScope.Global, globalFilePath),
      }];
    }
    if (server.scope === ConfigScope.Global) {
      return [{
        label: 'Project',
        scope: ConfigScope.Project,
        onCopy: () => copyTo(ConfigScope.Project, projectFilePath),
        onMove: config.allowGlobalWrites ? () => moveFrom(ConfigScope.Project, projectFilePath) : undefined,
      }];
    }
    return [];
  }

  return (
    <PanelShell
      title="MCP Servers"
      subtitle={`${servers.length} server${servers.length !== 1 ? 's' : ''} configured${mcpFiles.length > 0 ? ` across ${mcpFiles.length} file${mcpFiles.length !== 1 ? 's' : ''}` : ''}`}
      actions={
        otherWorkspaces.length > 0 ? (
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
            title="Import MCP servers from another workspace"
          >
            &#8595; Import
          </button>
        ) : undefined
      }
      view={view}
      onViewChange={(v) => { setView(v as View); if (v !== 'json') setJumpTarget(null); }}
      viewOptions={[
        { value: 'effective', label: 'Effective' },
        { value: 'json', label: 'Files' },
      ]}
    >
      {showImportModal && (
        <WorkspaceConfigImportModal
          workspaces={workspaces}
          activeProject={activeProject}
          currentConfig={config}
          initialSection="mcp"
          sections={['mcp']}
          onRescan={onRescan}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {(error || pluginError) && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
          <span>{error || pluginError}</span>
          {pluginError && <button onClick={clearPluginError} className="text-red-400 hover:text-red-300 ml-2">&times;</button>}
        </div>
      )}

      {view === 'json' ? (
        <RawJsonView files={mcpFiles} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : (
        <>
          <AddServerForm config={config} onRescan={onRescan} />

          <SearchBar value={search} onChange={setSearch} placeholder="Search servers..." itemCount={servers.length} filteredCount={filteredServers.length} />

          {(() => {
            const regularServers = filteredServers.filter(s => !s.pluginName);
            const installedPluginServers = filteredServers.filter(s => s.pluginName && s.pluginInstalled !== false);
            const availablePluginServers = filteredServers.filter(s => s.pluginName && s.pluginInstalled === false);
            const hasAny = regularServers.length > 0 || installedPluginServers.length > 0 || availablePluginServers.length > 0;

            if (!hasAny) {
              return (
                <PanelEmpty>No MCP servers configured</PanelEmpty>
              );
            }

            return (
              <>
                {/* Regular (non-plugin) MCP servers */}
                {regularServers.length > 0 && (
                  <div className="space-y-3">
                    {regularServers.map((server, i) => (
                      <McpServerCard
                        key={i}
                        server={server}
                        saving={saving}
                        onToggle={toggleServer}
                        onDelete={deleteServer}
                        onJump={jumpToFile}
                        onRescan={onRescan}
                        scopeMoveOptions={getScopeOptions(server)}
                        expanded={expanded.has(i)}
                        onToggleExpand={() => toggleRow(i)}
                      />
                    ))}
                  </div>
                )}

                {/* Plugin MCP servers — flat cards under a section heading */}
                {(() => {
                  const allPluginServers = [...installedPluginServers, ...availablePluginServers];
                  if (allPluginServers.length === 0) return null;
                  return (
                    <div className={regularServers.length > 0 ? 'mt-6' : ''}>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">From Plugins</h3>
                      <div className="space-y-3">
                        {allPluginServers.map((server, i) => {
                          const idx = regularServers.length + i;
                          const pathParts = server.filePath.split('/');
                          const cacheIdx = pathParts.indexOf('cache');
                          const marketplace = cacheIdx >= 0 ? pathParts[cacheIdx + 1] : 'claude-plugins-official';
                          return (
                            <McpServerCard
                              key={idx}
                              server={server}
                              saving={saving || pluginActing}
                              onToggle={toggleServer}
                              onDelete={deleteServer}
                              onJump={jumpToFile}
                              onInstallPlugin={() => runPluginAction({ action: PluginAction.Install, plugin: `${server.pluginName}@${marketplace}` })}
                              isPlugin={server.pluginInstalled !== false}
                              isAvailable={server.pluginInstalled === false}
                              onRescan={onRescan}
                              expanded={expanded.has(idx)}
                              onToggleExpand={() => toggleRow(idx)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </>
      )}
    </PanelShell>
  );
}

function McpServerCard({
  server,
  saving,
  onToggle,
  onDelete,
  onJump,
  onInstallPlugin,
  isPlugin,
  isAvailable,
  onRescan,
  scopeMoveOptions,
  expanded,
  onToggleExpand,
}: {
  server: McpServer;
  saving: boolean;
  onToggle: (server: McpServer) => void;
  onDelete: (server: McpServer) => void;
  onJump: (name: string, filePath: string) => void;
  onInstallPlugin?: () => void;
  isPlugin?: boolean;
  isAvailable?: boolean;
  onRescan: () => void;
  scopeMoveOptions?: { label: string; scope?: ConfigScope; onCopy: () => Promise<void>; onMove?: () => Promise<void> }[];
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const badge = TYPE_BADGE_STYLES.mcp[server.type as keyof typeof TYPE_BADGE_STYLES.mcp] ?? TYPE_BADGE_STYLES.mcp.stdio;
  const displayName = server.pluginName
    ? server.name.replace(`plugin:${server.pluginName}:`, '')
    : server.name;

  const canEdit = !isPlugin && !isAvailable && server.editable;

  const [editing, setEditing] = useState(false);
  const [editCommand, setEditCommand] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editEnv, setEditEnv] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');
  const [showEditError, setShowEditError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { update: editUpdate, saving: editSaving, error: editError } = useConfigUpdate(() => {
    setEditing(false);
    setShowEditError(false);
    onRescan();
  });

  function startEdit() {
    if (server.type === 'stdio') {
      const parts = [server.command, ...(server.args || [])].filter(Boolean);
      setEditCommand(parts.join(' '));
    } else {
      setEditUrl(server.url || '');
    }
    setEditEnv(server.env ? { ...server.env } : {});
    setNewEnvKey('');
    setNewEnvVal('');
    setShowEditError(false);
    setEditing(true);
  }

  function saveEdit() {
    if (editSaving) return;
    setShowEditError(true);
    const envToSave = Object.keys(editEnv).length > 0 ? editEnv : undefined;

    if (server.type === 'stdio') {
      const { command, args } = parseCommand(editCommand);
      if (!command) return;
      const value: Record<string, unknown> = { type: 'stdio', command };
      if (args.length > 0) value.args = args;
      if (envToSave) value.env = envToSave;
      if (!server.enabled) value.disabled = true;
      editUpdate({
        surface: 'mcp',
        scope: server.scope,
        filePath: server.filePath,
        key: `mcpServers.${server.name}`,
        value,
      });
    } else {
      const trimmedUrl = editUrl.trim();
      if (!trimmedUrl) return;
      const value: Record<string, unknown> = { type: server.type, url: trimmedUrl };
      if (envToSave) value.env = envToSave;
      if (!server.enabled) value.disabled = true;
      editUpdate({
        surface: 'mcp',
        scope: server.scope,
        filePath: server.filePath,
        key: `mcpServers.${server.name}`,
        value,
      });
    }
  }

  function addEnvVar() {
    const k = newEnvKey.trim();
    if (!k || k in editEnv) return;
    setEditEnv(prev => ({ ...prev, [k]: newEnvVal }));
    setNewEnvKey('');
    setNewEnvVal('');
  }

  function removeEnvVar(key: string) {
    setEditEnv(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <>
      <div className={isAvailable ? 'opacity-50' : !server.enabled ? 'opacity-60' : ''}>
        <PanelRow
          expanded={expanded}
          onToggle={onToggleExpand}
          label={displayName}
          trigger={
            <>
              <span className={`font-semibold ${server.enabled ? 'text-gray-200' : 'text-gray-400'}`}>{displayName}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{server.type}</span>
              <ScopeIndicator scope={server.scope} />
              {isPlugin && server.pluginName && <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">plugin:{server.pluginName}</span>}
            </>
          }
          actions={
            <>
              {canEdit && !editing && (
                <button onClick={(e) => { e.stopPropagation(); startEdit(); }} className="px-2 py-0.5 text-xs rounded bg-gray-500/10 text-gray-400 hover:bg-accent/20 hover:text-accent transition-colors" title="Edit server">Edit</button>
              )}
              {!isPlugin && scopeMoveOptions && scopeMoveOptions.length > 0 && (
                <ScopeMoveButton options={scopeMoveOptions} saving={saving} />
              )}
              {server.scope !== ConfigScope.Managed && !isPlugin && (
                <span onClick={e => e.stopPropagation()}>
                  <DeleteButton onClick={() => setConfirmDelete(true)} disabled={saving} title="Delete server" />
                </span>
              )}
              {server.scope !== ConfigScope.Managed && (
                <button
                  onClick={(e) => { e.stopPropagation(); isAvailable && onInstallPlugin ? onInstallPlugin() : onToggle(server); }}
                  disabled={saving}
                  className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${server.enabled ? 'bg-green-500/40' : 'bg-gray-600/40'}`}
                  title={isAvailable ? 'Install plugin' : server.enabled ? 'Disable server' : 'Enable server'}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${server.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              )}
            </>
          }
        >
          <div className="border-t border-border px-4 py-4">
            {editing ? (
              <div>
                {showEditError && editError && (
                  <div className="mb-2 text-xs text-red-400">{editError}</div>
                )}

                {server.type === 'stdio' ? (
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Command</label>
                    <input
                      value={editCommand}
                      onChange={e => setEditCommand(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape' && !editSaving) setEditing(false); }}
                      autoFocus
                      className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">URL</label>
                    <input
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape' && !editSaving) setEditing(false); }}
                      autoFocus
                      className="w-full mt-1 bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Environment Variables</label>
                  {Object.keys(editEnv).length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {Object.entries(editEnv).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400 flex-shrink-0">{k}=</span>
                          <input
                            value={v}
                            onChange={e => setEditEnv(prev => ({ ...prev, [k]: e.target.value }))}
                            className="flex-1 bg-bg border border-border rounded px-2 py-0.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                          />
                          <button
                            onClick={() => removeEnvVar(k)}
                            className="text-gray-500 hover:text-red-400 transition-colors text-sm leading-none"
                            title="Remove"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={newEnvKey}
                      onChange={e => setNewEnvKey(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addEnvVar(); }}
                      placeholder="KEY"
                      className="w-28 bg-bg border border-border rounded px-2 py-0.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                    />
                    <span className="text-gray-600 text-xs">=</span>
                    <input
                      value={newEnvVal}
                      onChange={e => setNewEnvVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addEnvVar(); }}
                      placeholder="value"
                      className="flex-1 bg-bg border border-border rounded px-2 py-0.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-accent/50"
                    />
                    <button
                      onClick={addEnvVar}
                      disabled={!newEnvKey.trim()}
                      className="px-2 py-0.5 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || (server.type === 'stdio' ? !editCommand.trim() : !editUrl.trim())}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={editSaving}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {server.type === 'stdio' && server.command && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Command</span>
                    <div className="text-sm font-mono text-gray-300 mt-0.5 bg-bg rounded px-2 py-1 overflow-x-auto">
                      {server.command}{server.args?.length ? ' ' + server.args.join(' ') : ''}
                    </div>
                  </div>
                )}
                {(server.type === 'http' || server.type === 'sse') && server.url && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">URL</span>
                    <div className="text-sm font-mono text-gray-300 mt-0.5 bg-bg rounded px-2 py-1 overflow-x-auto">{server.url}</div>
                  </div>
                )}
                {server.env && Object.keys(server.env).length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Environment</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.keys(server.env).map(key => (
                        <span key={key} className="px-2 py-0.5 bg-bg rounded text-xs font-mono text-gray-400">{key}=***</span>
                      ))}
                    </div>
                  </div>
                )}
                {!isAvailable && (
                  <button onClick={() => onJump(server.name, server.filePath)} className="mt-3 text-xs text-gray-600 font-mono truncate hover:text-accent transition-colors block" title={`View in file: ${server.filePath}`}>
                    {server.filePath} ↗
                  </button>
                )}
              </>
            )}
          </div>
        </PanelRow>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete MCP server?"
          message={`Remove "${displayName}" from ${server.scope} scope?`}
          onConfirm={() => { setConfirmDelete(false); onDelete(server); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

