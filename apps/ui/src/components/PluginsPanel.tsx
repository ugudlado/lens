import { useState } from 'react';
import { ConfigScope, PluginScope, PluginAction } from '@lens/schema';
import type { ConfigSnapshot, PluginEntry, PluginContentItem, MarketplacePlugin, McpServer } from '@lens/schema';
import { SearchBar } from './SearchBar';
import { ScopeIndicator } from './ScopeIndicator.js';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { usePluginAction } from '../hooks/usePluginAction';
import { TYPE_BADGE_STYLES, PLUGIN_CONTENT_BADGE_STYLES } from '../constants/badgeStyles.js';
import { PanelShell, PanelEmpty } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

const CONTENT_LABELS: { key: keyof NonNullable<PluginEntry['contents']>; label: string; singular: string }[] = [
  { key: 'skills',   label: 'Skills',   singular: 'Skill'   },
  { key: 'hooks',    label: 'Hooks',    singular: 'Hook'    },
  { key: 'agents',   label: 'Agents',   singular: 'Agent'   },
  { key: 'commands', label: 'Commands', singular: 'Command' },
];

/** Unified item: either an installed plugin or an available (not installed) one. */
type UnifiedPlugin = {
  name: string;
  marketplace: string;
  installed: true;
  plugin: PluginEntry;
} | {
  name: string;
  marketplace: string;
  installed: false;
  available: MarketplacePlugin;
};

export function PluginsPanel({ config, onRescan }: Props) {
  const { plugins, marketplaces, available } = config.plugins;
  const [search, setSearch] = useState('');
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [expandedMarketplaces, setExpandedMarketplaces] = useState<Set<string>>(() => new Set());
  const [addMarketplaceOpen, setAddMarketplaceOpen] = useState(false);
  const [addMarketplaceInput, setAddMarketplaceInput] = useState('');

  const { run, acting, error, clearError } = usePluginAction(onRescan);

  const q = search.toLowerCase();

  // Build unified list per marketplace
  const byMarketplace = new Map<string, UnifiedPlugin[]>();

  for (const p of plugins) {
    if (q && !p.name.toLowerCase().includes(q) && !p.marketplace.toLowerCase().includes(q) && !(p.description && p.description.toLowerCase().includes(q))) continue;
    const arr = byMarketplace.get(p.marketplace) || [];
    arr.push({ name: p.name, marketplace: p.marketplace, installed: true, plugin: p });
    byMarketplace.set(p.marketplace, arr);
  }

  for (const a of (available || [])) {
    if (a.installed) continue;
    if (q && !a.name.toLowerCase().includes(q) && !a.marketplace.toLowerCase().includes(q) && !(a.description && a.description.toLowerCase().includes(q))) continue;
    const arr = byMarketplace.get(a.marketplace) || [];
    arr.push({ name: a.name, marketplace: a.marketplace, installed: false, available: a });
    byMarketplace.set(a.marketplace, arr);
  }

  const allMarketplaceNames = [...byMarketplace.keys()].sort();

  // Summary counts
  const totalSkills = plugins.reduce((s, p) => s + (p.contents?.skills.length || 0), 0);
  const totalHooks = plugins.reduce((s, p) => s + (p.contents?.hooks.length || 0), 0);
  const totalAgents = plugins.reduce((s, p) => s + (p.contents?.agents.length || 0), 0);
  const totalCommands = plugins.reduce((s, p) => s + (p.contents?.commands.length || 0), 0);
  const totalMcps = config.mcp.servers.filter(s => s.pluginName && s.pluginInstalled !== false).length;
  const notInstalledCount = (available || []).filter(a => !a.installed).length;
  const totalFiltered = [...byMarketplace.values()].reduce((s, arr) => s + arr.length, 0);

  const [confirmRemoveMarketplace, setConfirmRemoveMarketplace] = useState<string | null>(null);

  const togglePlugin = (key: string) => {
    setExpandedPlugin(expandedPlugin === key ? null : key);
  };

  const toggleMarketplace = (mp: string) => {
    setExpandedMarketplaces(prev => {
      const next = new Set(prev);
      if (next.has(mp)) next.delete(mp);
      else next.add(mp);
      return next;
    });
  };

  const isExpanded = (mp: string) => q ? true : expandedMarketplaces.has(mp);

  const updatablePlugins = plugins.filter(p => p.updateAvailable && p.enabled);
  const updateAll = async () => {
    for (const p of updatablePlugins) {
      const result = await run({ action: PluginAction.Update, plugin: `${p.name}@${p.marketplace}`, scope: p.scope });
      if (!result.success) break;
    }
  };

  return (
    <PanelShell
      title="Plugins"
      subtitle={`${plugins.length} installed${notInstalledCount > 0 ? `, ${notInstalledCount} available` : ''}`}
      actions={updatablePlugins.length > 0 ? (
        <button
          onClick={updateAll}
          disabled={acting}
          className="px-3 py-1 text-xs font-medium rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          Update all ({updatablePlugins.length})
        </button>
      ) : undefined}
    >
      {/* Summary badges */}
      {plugins.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {totalSkills > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-amber-400 bg-amber-500/15">
              {totalSkills} skills
            </span>
          )}
          {totalHooks > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-emerald-400 bg-emerald-500/15">
              {totalHooks} hooks
            </span>
          )}
          {totalAgents > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-purple-400 bg-purple-500/15">
              {totalAgents} agents
            </span>
          )}
          {totalCommands > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-cyan-400 bg-cyan-500/15">
              {totalCommands} commands
            </span>
          )}
          {totalMcps > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-400 bg-blue-500/15">
              {totalMcps} MCPs
            </span>
          )}
        </div>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search plugins..."
        itemCount={plugins.length + notInstalledCount}
        filteredCount={totalFiltered}
      />

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-2">&times;</button>
        </div>
      )}

      {allMarketplaceNames.length === 0 && plugins.length === 0 ? (
        <PanelEmpty>No plugins installed</PanelEmpty>
      ) : (
        <div className="flex flex-col gap-5">
          {allMarketplaceNames.map(mp => {
            const items = (byMarketplace.get(mp) || []).sort((a, b) => {
              // Installed before available, then alphabetical
              if (a.installed !== b.installed) return a.installed ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
            const installedCount = items.filter(i => i.installed).length;
            const availableCount = items.filter(i => !i.installed).length;
            const mpInfo = marketplaces.find(m => m.name === mp);
            const open = isExpanded(mp);
            const isOfficial = mp === 'claude-plugins-official';

            return (
              <div key={mp} className="bg-card border border-border rounded-lg overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleMarketplace(mp)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMarketplace(mp); } }}
                  className="w-full text-left px-4 py-5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <svg
                    className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6 3l5 5-5 5V3z" />
                  </svg>
                  <span className="font-semibold text-gray-200">{mp}</span>
                  <span className="text-xs text-gray-500">
                    {installedCount} installed{availableCount > 0 ? `, ${availableCount} available` : ''}
                  </span>
                  {mpInfo?.url && (
                    <span className="ml-auto text-xs text-gray-600 font-mono truncate max-w-[300px]">{mpInfo.url}</span>
                  )}
                  {confirmRemoveMarketplace === mp ? (
                    <div className="ml-auto flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-red-400">
                        Remove{installedCount > 0 ? ` + uninstall ${installedCount} plugin${installedCount !== 1 ? 's' : ''}` : ''}?
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setConfirmRemoveMarketplace(null);
                          // Uninstall all installed plugins from this marketplace first
                          for (const item of items) {
                            if (!item.installed) continue;
                            await run({ action: PluginAction.Uninstall, plugin: `${item.name}@${item.marketplace}`, scope: item.plugin.scope });
                          }
                          await run({ action: PluginAction.MarketplaceRemove, plugin: mp });
                        }}
                        disabled={acting}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmRemoveMarketplace(null); }}
                        className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemoveMarketplace(mp);
                      }}
                      disabled={acting}
                      className="ml-auto px-2 py-0.5 text-xs font-medium rounded bg-gray-500/10 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                      title="Remove marketplace"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {open && (
                  <div className="border-t border-border/50">
                    {items.map(item => {
                      if (item.installed) {
                        const key = `${item.name}@${item.marketplace}`;
                        return (
                          <InstalledPluginRow
                            key={key}
                            plugin={item.plugin}
                            mcpServers={config.mcp.servers.filter(s => s.pluginName === item.name)}
                            expanded={expandedPlugin === key}
                            onToggle={() => togglePlugin(key)}
                            onEnable={() => run({ action: PluginAction.Enable, plugin: `${item.name}@${item.marketplace}` })}
                            onDisable={() => run({ action: PluginAction.Disable, plugin: `${item.name}@${item.marketplace}` })}
                            onUninstall={() => run({ action: PluginAction.Uninstall, plugin: `${item.name}@${item.marketplace}`, scope: item.plugin.scope })}
                            onUpdate={() => run({ action: PluginAction.Update, plugin: `${item.name}@${item.marketplace}`, scope: item.plugin.scope })}
                            onCopy={async () => {
                              const targetScope = item.plugin.scope === PluginScope.User ? PluginScope.Project : PluginScope.User;
                              await run({ action: PluginAction.Install, plugin: `${item.name}@${item.marketplace}`, scope: targetScope });
                            }}
                            onMove={async () => {
                              const targetScope = item.plugin.scope === PluginScope.User ? PluginScope.Project : PluginScope.User;
                              const result = await run({ action: PluginAction.Install, plugin: `${item.name}@${item.marketplace}`, scope: targetScope });
                              if (result.success) await run({ action: PluginAction.Uninstall, plugin: `${item.name}@${item.marketplace}`, scope: item.plugin.scope });
                            }}
                            acting={acting}
                          />
                        );
                      } else {
                        return (
                          <AvailablePluginRow
                            key={`${item.name}@${item.marketplace}`}
                            plugin={item.available}
                            onInstall={(scope) => run({ action: PluginAction.Install, plugin: `${item.name}@${item.marketplace}`, scope })}
                            acting={acting}
                          />
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Marketplace section */}
      <div className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setAddMarketplaceOpen(o => !o)}
          className="w-full text-left px-4 py-4 flex items-center gap-2 hover:bg-white/[0.02] transition-colors"
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${addMarketplaceOpen ? 'rotate-45' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-gray-400">Add Marketplace</span>
        </button>
        {addMarketplaceOpen && (
          <div className="border-t border-border/50 px-4 py-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const val = addMarketplaceInput.trim();
                if (!val) return;
                const result = await run({ action: PluginAction.MarketplaceAdd, plugin: val });
                if (result.success) setAddMarketplaceInput('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={addMarketplaceInput}
                onChange={(e) => setAddMarketplaceInput(e.target.value)}
                placeholder="github:owner/repo or owner/repo"
                disabled={acting}
                className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={acting || !addMarketplaceInput.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                {acting ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>
        )}
      </div>

    </PanelShell>
  );
}

function InstalledPluginRow({
  plugin,
  mcpServers,
  expanded,
  onToggle,
  onEnable,
  onDisable,
  onUninstall,
  onUpdate,
  onCopy,
  onMove,
  acting,
}: {
  plugin: PluginEntry;
  mcpServers: McpServer[];
  expanded: boolean;
  onToggle: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onUninstall: () => void;
  onUpdate: () => void;
  onCopy: () => Promise<void>;
  onMove: () => Promise<void>;
  acting: boolean;
}) {
  const [showFiles, setShowFiles] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  return (
    <div id={`plugin-${slug(plugin.name)}-${plugin.scope}`} className={`border-t border-border/30 ${expanded ? 'bg-white/[0.02]' : ''} ${!plugin.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center px-4 py-5">
        {/* Toggle switch */}
        <button
          onClick={(e) => { e.stopPropagation(); plugin.enabled ? onDisable() : onEnable(); }}
          disabled={acting}
          className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 flex-shrink-0 mr-3 ${
            plugin.enabled ? 'bg-green-500/40' : 'bg-gray-600/40'
          }`}
          title={plugin.enabled ? 'Disable plugin' : 'Enable plugin'}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              plugin.enabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>

        {/* Clickable row for expand/collapse */}
        <button
          onClick={onToggle}
          className="flex-1 text-left focus:outline-none flex items-center gap-2 min-w-0"
        >
          <svg
            className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
          <span className={`font-medium ${plugin.enabled ? 'text-gray-200' : 'text-gray-400'}`}>{plugin.name}</span>
          <ScopeIndicator scope={plugin.scope === PluginScope.User ? ConfigScope.Global : ConfigScope.Project} />
          {(plugin.contents || mcpServers.length > 0) && (
            <div className="flex gap-1.5 ml-1">
              {plugin.contents && CONTENT_LABELS.map(({ key, label, singular }) => {
                const items = plugin.contents![key];
                if (!items.length) return null;
                const badgeStyle = PLUGIN_CONTENT_BADGE_STYLES[key as keyof typeof PLUGIN_CONTENT_BADGE_STYLES];
                return (
                  <span key={key} className={`px-2 py-0.5 rounded text-xs font-medium ${badgeStyle.bg} ${badgeStyle.color}`}>
                    {items.length} {items.length === 1 ? singular : label}
                  </span>
                );
              })}
              {mcpServers.length > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-400 bg-blue-500/15">
                  {mcpServers.length} {mcpServers.length === 1 ? 'MCP' : 'MCPs'}
                </span>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {plugin.updateAvailable && plugin.enabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(); }}
                disabled={acting}
                className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                title={`Update available: ${plugin.latestVersion}`}
              >
                Update
              </button>
            )}
            <span onClick={e => e.stopPropagation()}>
              <ScopeMoveButton
                saving={acting}
                options={[{
                  label: plugin.scope === PluginScope.User ? 'Project' : 'User',
                  scope: plugin.scope === PluginScope.User ? ConfigScope.Project : ConfigScope.Global,
                  onCopy,
                  onMove,
                }]}
              />
            </span>
            {!confirmUninstall ? (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmUninstall(true); }}
                disabled={acting}
                className="px-2 py-0.5 text-xs font-medium rounded bg-gray-500/10 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Uninstall plugin"
              >
                Uninstall
              </button>
            ) : (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-red-400">Sure?</span>
                <button
                  onClick={() => { onUninstall(); setConfirmUninstall(false); }}
                  disabled={acting}
                  className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmUninstall(false)}
                  className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  No
                </button>
              </div>
            )}
            <span className={`text-xs font-mono ${plugin.updateAvailable ? 'text-amber-500/70' : 'text-gray-500'}`}>
              {plugin.version}
            </span>
          </div>
        </button>
      </div>

      {!expanded && plugin.description && (
        <p className="text-xs text-gray-500 px-4 pb-4 ml-[52px] truncate">{plugin.description}</p>
      )}

      {expanded && (
        <div className="px-4 pb-6 pt-4 space-y-5">
          {/* Uninstall action */}
          <div className="flex items-center gap-2">
            {!confirmUninstall ? (
              <button
                onClick={() => setConfirmUninstall(true)}
                disabled={acting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-gray-500/10 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Uninstall
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Uninstall {plugin.name}?</span>
                <button
                  onClick={() => { onUninstall(); setConfirmUninstall(false); }}
                  disabled={acting}
                  className="px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmUninstall(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {acting && (
              <span className="text-xs text-gray-500 animate-pulse">Working...</span>
            )}
          </div>

          {plugin.description && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Description</span>
              <p className="text-sm text-gray-300 mt-0.5">{plugin.description}</p>
            </div>
          )}

          {/* Contents breakdown */}
          {plugin.contents && (
            <div className="space-y-3">
              {CONTENT_LABELS.map(({ key, label }) => {
                const items = plugin.contents![key];
                if (!items.length) return null;
                const badgeStyle = PLUGIN_CONTENT_BADGE_STYLES[key as keyof typeof PLUGIN_CONTENT_BADGE_STYLES];
                return (
                  <div key={key}>
                    <span className={`text-xs uppercase tracking-wide font-medium ${badgeStyle.color}`}>
                      {label} ({items.length})
                    </span>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {items.map(item => {
                        const name = typeof item === 'string' ? item : item.name;
                        const desc = typeof item === 'string' ? undefined : item.description;
                        return (
                          <div key={name} className="flex items-baseline gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 ${badgeStyle.bg} ${badgeStyle.color}`}>
                              {name}
                            </span>
                            {desc && (
                              <span className="text-xs text-gray-500 truncate">{desc}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MCP Servers */}
          {mcpServers.length > 0 && (
            <div>
              <span className="text-xs uppercase tracking-wide font-medium text-blue-400">
                MCP Servers ({mcpServers.length})
              </span>
              <div className="flex flex-col gap-1.5 mt-1">
                {mcpServers.map(server => {
                  const displayName = server.name.replace(`plugin:${plugin.name}:`, '');
                  const mcpTypeStyle = TYPE_BADGE_STYLES.mcp[server.type as keyof typeof TYPE_BADGE_STYLES.mcp] ?? TYPE_BADGE_STYLES.mcp.stdio;
                  return (
                    <div key={server.name} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${server.enabled ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span className="px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 text-blue-400 bg-blue-500/15">
                        {displayName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${mcpTypeStyle.bg} ${mcpTypeStyle.text}`}>
                        {server.type}
                      </span>
                      {server.type === 'stdio' && server.command && (
                        <span className="text-xs text-gray-500 font-mono truncate">
                          {server.command}{server.args?.length ? ' ' + server.args.join(' ') : ''}
                        </span>
                      )}
                      {(server.type === 'http' || server.type === 'sse') && server.url && (
                        <span className="text-xs text-gray-500 font-mono truncate">{server.url}</span>
                      )}
                      <span className={`ml-auto text-xs ${server.enabled ? 'text-green-400' : 'text-gray-600'}`}>
                        {server.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Install Path</span>
              <div className="text-sm font-mono text-gray-300 mt-0.5 bg-bg rounded px-2 py-1 overflow-x-auto">
                {plugin.installPath}
              </div>
            </div>
            {plugin.installedAt && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Installed</span>
                <div className="text-sm text-gray-300 mt-0.5 bg-bg rounded px-2 py-1">
                  {formatDate(plugin.installedAt)}
                </div>
              </div>
            )}
            {plugin.gitSha && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Git Commit</span>
                <div className="text-sm font-mono text-gray-300 mt-0.5 bg-bg rounded px-2 py-1">
                  {plugin.gitSha}
                </div>
              </div>
            )}
            {plugin.latestVersion && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {plugin.updateAvailable ? 'Latest Version' : 'Up to date'}
                </span>
                <div className={`text-sm font-mono mt-0.5 bg-bg rounded px-2 py-1 flex items-center gap-2 ${plugin.updateAvailable ? 'text-amber-400' : 'text-green-400'}`}>
                  {plugin.updateAvailable
                    ? plugin.latestVersion.slice(0, 12)
                    : plugin.version}
                  {!plugin.updateAvailable && <span className="text-xs">✓</span>}
                </div>
              </div>
            )}
          </div>

          {plugin.files && plugin.files.length > 0 && (
            <div>
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {showFiles ? '-- Hide Files' : `++ View Files (${plugin.files.length})`}
              </button>
              {showFiles && (
                <div className="mt-2 bg-bg rounded-lg border border-border p-3 max-h-64 overflow-y-auto">
                  <div className="space-y-0.5">
                    {plugin.files.map((file, idx) => (
                      <div key={idx} className="text-xs font-mono text-gray-400 py-0.5">
                        <FileIcon filename={file} />
                        <span className="ml-1.5">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AvailablePluginRow({
  plugin,
  onInstall,
  acting,
}: {
  plugin: MarketplacePlugin;
  onInstall: (scope: PluginScope) => void;
  acting: boolean;
}) {
  return (
    <div className="border-t border-border/40 px-4 py-5 opacity-60 hover:opacity-90 transition-opacity">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-600" />
        <span className="text-sm text-gray-400">{plugin.name}</span>
        {plugin.external && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
            External
          </span>
        )}
        {!plugin.installed && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-600">
            Not installed
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-gray-600 mr-1">Install for:</span>
          <button
            onClick={() => onInstall(PluginScope.User)}
            disabled={acting}
            className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            title="Install for current user (global)"
          >
            User
          </button>
          <button
            onClick={() => onInstall(PluginScope.Project)}
            disabled={acting}
            className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            title="Install for this project only"
          >
            Project
          </button>
        </div>
      </div>
      {plugin.description && (
        <p className="text-xs text-gray-600 mt-1.5 ml-4 truncate">{plugin.description}</p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  let color = 'text-gray-600';
  let icon = 'F';

  if (ext === 'md' || ext === 'mdc') {
    color = 'text-blue-500'; icon = 'M';
  } else if (ext === 'json') {
    color = 'text-yellow-500'; icon = 'J';
  } else if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
    color = 'text-cyan-500'; icon = 'S';
  } else if (ext === 'yaml' || ext === 'yml') {
    color = 'text-pink-500'; icon = 'Y';
  } else if (ext === 'toml') {
    color = 'text-orange-500'; icon = 'T';
  }

  return (
    <span className={`inline-block w-3 text-center ${color}`}>{icon}</span>
  );
}
