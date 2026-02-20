import { useState, useEffect, type ReactNode } from 'react';
import { ConfigScope, PluginScope, PluginAction } from '@lens/schema';
import type {
  ConfigSnapshot,
  Workspace,
  McpServer,
  HookEntry,
  SkillEntry,
  AgentEntry,
  RuleEntry,
  CommandEntry,
  PermissionRule,
  PluginEntry,
} from '@lens/schema';

// ─── Section definitions ────────────────────────────────────────────────────

export type ImportSection =
  | 'mcp'
  | 'hooks'
  | 'skills'
  | 'agents'
  | 'rules'
  | 'commands'
  | 'permissions'
  | 'plugins';

const SECTION_LABELS: Record<ImportSection, string> = {
  mcp: 'MCP Servers',
  hooks: 'Hooks',
  skills: 'Skills',
  agents: 'Agents',
  rules: 'Rules',
  commands: 'Commands',
  permissions: 'Permissions',
  plugins: 'Plugins',
};

// ─── Item key helpers ───────────────────────────────────────────────────────

function mcpKey(s: McpServer) { return s.name; }
function hookKey(h: HookEntry) { return `${h.event}::${h.command || h.prompt || ''}`; }
function skillKey(s: SkillEntry) { return s.name; }
function agentKey(a: AgentEntry) { return a.name; }
function ruleKey(r: RuleEntry) { return r.name; }
function commandKey(c: CommandEntry) { return c.name; }
function permKey(p: PermissionRule) { return `${p.type}::${p.rule}`; }
function pluginKey(p: PluginEntry) { return `${p.name}@${p.marketplace}`; }

// ─── Build config write payloads ────────────────────────────────────────────

function buildMcpValue(s: McpServer) {
  if (s.type === 'stdio') {
    return {
      type: 'stdio',
      command: s.command,
      ...(s.args?.length ? { args: s.args } : {}),
      ...(s.env && Object.keys(s.env).length ? { env: s.env } : {}),
    };
  }
  return { type: s.type, url: s.url };
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalState = 'pick-workspace' | 'checklist' | 'importing';

interface SectionItems {
  mcp: McpServer[];
  hooks: HookEntry[];
  skills: SkillEntry[];
  agents: AgentEntry[];
  rules: RuleEntry[];
  commands: CommandEntry[];
  permissions: PermissionRule[];
  plugins: PluginEntry[];
}

interface Props {
  workspaces: Workspace[];
  activeProject: string;
  currentConfig: ConfigSnapshot;
  /** If provided, that section tab is shown first */
  initialSection?: ImportSection;
  /** Which sections to show (defaults to all) */
  sections?: ImportSection[];
  onRescan: () => void;
  onClose: () => void;
}

const ALL_SECTIONS: ImportSection[] = [
  'plugins', 'mcp', 'hooks', 'skills', 'agents', 'rules', 'commands', 'permissions',
];

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkspaceConfigImportModal({
  workspaces,
  activeProject,
  currentConfig,
  initialSection,
  sections = ALL_SECTIONS,
  onRescan,
  onClose,
}: Props) {
  const otherWorkspaces = workspaces.filter(w => w.path !== activeProject);

  const [state, setState] = useState<ModalState>('pick-workspace');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ImportSection>(
    initialSection ?? sections[0]
  );

  const [sourceItems, setSourceItems] = useState<SectionItems>({
    mcp: [], hooks: [], skills: [], agents: [], rules: [], commands: [], permissions: [], plugins: [],
  });
  const [checked, setChecked] = useState<Record<ImportSection, Set<string>>>({
    mcp: new Set(), hooks: new Set(), skills: new Set(), agents: new Set(),
    rules: new Set(), commands: new Set(), permissions: new Set(), plugins: new Set(),
  });

  // Pre-compute existing item keys for each section
  const existingKeys: Record<ImportSection, Set<string>> = {
    mcp: new Set(currentConfig.mcp.servers.filter(s => !s.pluginName).map(mcpKey)),
    hooks: new Set(currentConfig.hooks.hooks.filter(h => !h.pluginName).map(hookKey)),
    skills: new Set(currentConfig.skills.skills.filter(s => !s.pluginName).map(skillKey)),
    agents: new Set(currentConfig.agents.agents.filter(a => !a.pluginName).map(agentKey)),
    rules: new Set(currentConfig.rules.rules.map(ruleKey)),
    commands: new Set(currentConfig.commands.commands.filter(c => !c.pluginName).map(commandKey)),
    permissions: new Set(currentConfig.permissions.rules.map(permKey)),
    plugins: new Set(currentConfig.plugins.plugins.map(pluginKey)),
  };

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

      const items: SectionItems = {
        mcp: (data.mcp?.servers ?? []).filter(s => !s.pluginName),
        hooks: (data.hooks?.hooks ?? []).filter(h => !h.pluginName),
        skills: (data.skills?.skills ?? []).filter(s => !s.pluginName),
        agents: (data.agents?.agents ?? []).filter(a => !a.pluginName),
        rules: data.rules?.rules ?? [],
        commands: (data.commands?.commands ?? []).filter(c => !c.pluginName),
        permissions: data.permissions?.rules ?? [],
        plugins: (data.plugins?.plugins ?? []).filter(p => p.scope === PluginScope.Project),
      };

      setSourceItems(items);

      // Pre-check all items that don't already exist
      const newChecked: Record<ImportSection, Set<string>> = {
        mcp: new Set(), hooks: new Set(), skills: new Set(), agents: new Set(),
        rules: new Set(), commands: new Set(), permissions: new Set(), plugins: new Set(),
      };
      for (const s of items.mcp) { if (!existingKeys.mcp.has(mcpKey(s))) newChecked.mcp.add(mcpKey(s)); }
      for (const h of items.hooks) { if (!existingKeys.hooks.has(hookKey(h))) newChecked.hooks.add(hookKey(h)); }
      for (const s of items.skills) { if (!existingKeys.skills.has(skillKey(s))) newChecked.skills.add(skillKey(s)); }
      for (const a of items.agents) { if (!existingKeys.agents.has(agentKey(a))) newChecked.agents.add(agentKey(a)); }
      for (const r of items.rules) { if (!existingKeys.rules.has(ruleKey(r))) newChecked.rules.add(ruleKey(r)); }
      for (const c of items.commands) { if (!existingKeys.commands.has(commandKey(c))) newChecked.commands.add(commandKey(c)); }
      for (const p of items.permissions) { if (!existingKeys.permissions.has(permKey(p))) newChecked.permissions.add(permKey(p)); }
      for (const p of items.plugins) { if (!existingKeys.plugins.has(pluginKey(p))) newChecked.plugins.add(pluginKey(p)); }

      setChecked(newChecked);
      setState('checklist');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(section: ImportSection, key: string) {
    setChecked(prev => {
      const next = { ...prev, [section]: new Set(prev[section]) };
      if (next[section].has(key)) next[section].delete(key);
      else next[section].add(key);
      return next;
    });
  }

  function totalChecked() {
    return sections.reduce((n, s) => n + checked[s].size, 0);
  }

  async function patchJson(filePath: string, key: string, value: unknown, scope: ConfigScope) {
    const res = await fetch('/api/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: 'import', scope, filePath, key, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  }

  async function replaceJson(filePath: string, value: unknown, scope: ConfigScope) {
    const res = await fetch('/api/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: 'import', scope, filePath, value, replace: true }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  }

  async function patchFile(filePath: string, value: string, scope: ConfigScope) {
    const res = await fetch('/api/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: 'import', scope, filePath, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  }

  async function fetchFileContent(filePath: string): Promise<string> {
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`Failed to fetch file: ${filePath}`);
    const data = await res.json() as { content: string };
    return data.content;
  }

  async function fetchJsonOrEmpty(filePath: string): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) return {};
      const data = await res.json() as { content: string };
      return JSON.parse(data.content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async function handleImport() {
    if (totalChecked() === 0) return;
    setState('importing');
    setImportError(null);

    try {
      const projectMcp = `${currentConfig.projectPath}/.mcp.json`;
      const projectSettings = `${currentConfig.projectPath}/.claude/settings.json`;

      // ── MCP servers → .mcp.json ──────────────────────────────────────────
      const mcpToImport = sourceItems.mcp.filter(s => checked.mcp.has(mcpKey(s)));
      for (const s of mcpToImport) {
        await patchJson(projectMcp, `mcpServers.${s.name}`, buildMcpValue(s), ConfigScope.Project);
      }

      // ── Hooks + Permissions → settings.json (single read-merge-write) ─────
      const hooksToImport = sourceItems.hooks.filter(h => checked.hooks.has(hookKey(h)));
      const permsToImport = sourceItems.permissions.filter(p => checked.permissions.has(permKey(p)));
      if (hooksToImport.length > 0 || permsToImport.length > 0) {
        const settings = await fetchJsonOrEmpty(projectSettings);

        if (hooksToImport.length > 0) {
          const hooksSection = (settings.hooks ?? {}) as Record<string, unknown[]>;
          for (const h of hooksToImport) {
            const hookDef: Record<string, unknown> = { type: h.type };
            if (h.command) hookDef.command = h.command;
            if (h.prompt) hookDef.prompt = h.prompt;
            if (h.timeout) hookDef.timeout = h.timeout;

            const existing = (hooksSection[h.event] ?? []) as Array<Record<string, unknown>>;
            const matcher = h.matcher;
            let group = existing.find(g =>
              matcher ? g.matcher === matcher : !g.matcher
            ) as Record<string, unknown> | undefined;

            if (!group) {
              group = matcher ? { matcher, hooks: [] } : { hooks: [] };
              existing.push(group);
            }
            const groupHooks = (group.hooks ?? []) as Array<Record<string, unknown>>;
            groupHooks.push(hookDef);
            group.hooks = groupHooks;
            hooksSection[h.event] = existing;
          }
          settings.hooks = hooksSection;
        }

        if (permsToImport.length > 0) {
          const permsSection = (settings.permissions ?? {}) as Record<string, string[]>;
          for (const p of permsToImport) {
            const arr = permsSection[p.type] ?? [];
            if (!arr.includes(p.rule)) arr.push(p.rule);
            permsSection[p.type] = arr;
          }
          settings.permissions = permsSection;
        }

        await replaceJson(projectSettings, settings, ConfigScope.Project);
      }

      // ── Skills → file copy (.claude/skills/<name>.md) ───────────────────
      for (const s of sourceItems.skills) {
        if (!checked.skills.has(skillKey(s))) continue;
        const filePath = `${currentConfig.projectPath}/.claude/skills/${s.name}.md`;
        const content = await fetchFileContent(s.filePath);
        await patchFile(filePath, content, ConfigScope.Project);
      }

      // ── Agents → file copy (.claude/agents/<name>.md) ───────────────────
      for (const a of sourceItems.agents) {
        if (!checked.agents.has(agentKey(a))) continue;
        const filePath = `${currentConfig.projectPath}/.claude/agents/${a.name}.md`;
        const content = await fetchFileContent(a.filePath);
        await patchFile(filePath, content, ConfigScope.Project);
      }

      // ── Rules → file copy (.claude/rules/<name>.mdc or .md) ─────────────
      for (const r of sourceItems.rules) {
        if (!checked.rules.has(ruleKey(r))) continue;
        const ext = r.filePath.endsWith('.mdc') ? '.mdc' : '.md';
        const filePath = `${currentConfig.projectPath}/.claude/rules/${r.name}${ext}`;
        await patchFile(filePath, r.content, ConfigScope.Project);
      }

      // ── Commands → file copy (.claude/commands/<name>.md) ───────────────
      for (const c of sourceItems.commands) {
        if (!checked.commands.has(commandKey(c))) continue;
        const filePath = `${currentConfig.projectPath}/.claude/commands/${c.name}.md`;
        const content = await fetchFileContent(c.filePath);
        await patchFile(filePath, content, ConfigScope.Project);
      }

      // ── Plugins → POST /api/plugins (project-scoped install) ────────────
      for (const p of sourceItems.plugins) {
        if (!checked.plugins.has(pluginKey(p))) continue;
        await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: PluginAction.Install, plugin: pluginKey(p), scope: PluginScope.Project }),
        });
      }

      onRescan();
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setState('checklist');
    }
  }

  // ─── Render helpers ──────────────────────────────────────────────────────

  function renderSectionBadge(section: ImportSection) {
    const total = sourceItems[section].length;
    const sel = checked[section].size;
    if (total === 0) return null;
    return (
      <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
        sel > 0 ? 'bg-accent/20 text-accent' : 'bg-white/5 text-gray-500'
      }`}>
        {sel}/{total}
      </span>
    );
  }

  function renderMcpItem(s: McpServer) {
    const key = mcpKey(s);
    const isExisting = existingKeys.mcp.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.mcp.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('mcp', key)}
        title={s.name}
        subtitle={
          s.type === 'stdio'
            ? `${s.command}${s.args?.length ? ' ' + s.args.join(' ') : ''}`
            : s.url
        }
        badge={{ label: s.type, color: s.type === 'stdio' ? 'purple' : s.type === 'http' ? 'cyan' : 'orange' }}
      />
    );
  }

  function renderHookItem(h: HookEntry) {
    const key = hookKey(h);
    const isExisting = existingKeys.hooks.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.hooks.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('hooks', key)}
        title={`${h.event}${h.matcher ? ` [${h.matcher}]` : ''}`}
        subtitle={h.command || h.prompt}
        badge={{ label: h.type, color: 'blue' }}
      />
    );
  }

  function renderSkillItem(s: SkillEntry) {
    const key = skillKey(s);
    const isExisting = existingKeys.skills.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.skills.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('skills', key)}
        title={s.name}
        subtitle={s.description}
      />
    );
  }

  function renderAgentItem(a: AgentEntry) {
    const key = agentKey(a);
    const isExisting = existingKeys.agents.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.agents.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('agents', key)}
        title={a.name}
        subtitle={a.description}
      />
    );
  }

  function renderRuleItem(r: RuleEntry) {
    const key = ruleKey(r);
    const isExisting = existingKeys.rules.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.rules.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('rules', key)}
        title={r.name}
        subtitle={r.paths?.length ? `paths: ${r.paths.join(', ')}` : `${r.lineCount} lines`}
      />
    );
  }

  function renderCommandItem(c: CommandEntry) {
    const key = commandKey(c);
    const isExisting = existingKeys.commands.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.commands.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('commands', key)}
        title={`/${c.name}`}
      />
    );
  }

  function renderPluginItem(p: PluginEntry) {
    const key = pluginKey(p);
    const isExisting = existingKeys.plugins.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.plugins.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('plugins', key)}
        title={p.name}
        subtitle={p.description || p.marketplace}
        badge={{ label: p.marketplace, color: 'purple' }}
      />
    );
  }

  function renderPermItem(p: PermissionRule) {
    const key = permKey(p);
    const isExisting = existingKeys.permissions.has(key);
    return (
      <ImportRow
        key={key}
        itemKey={key}
        checked={checked.permissions.has(key)}
        existing={isExisting}
        onToggle={() => toggleItem('permissions', key)}
        title={p.rule}
        badge={{ label: p.type, color: p.type === 'allow' ? 'green' : p.type === 'deny' ? 'red' : 'yellow' }}
      />
    );
  }

  const SECTION_RENDERERS: Record<ImportSection, (items: SectionItems) => ReactNode> = {
    plugins: (items) => items.plugins.length === 0
      ? <EmptySection label="No project-scoped plugins" />
      : items.plugins.map(renderPluginItem),
    mcp: (items) => items.mcp.length === 0
      ? <EmptySection label="No MCP servers" />
      : items.mcp.map(renderMcpItem),
    hooks: (items) => items.hooks.length === 0
      ? <EmptySection label="No hooks" />
      : items.hooks.map(renderHookItem),
    skills: (items) => items.skills.length === 0
      ? <EmptySection label="No skills" />
      : items.skills.map(renderSkillItem),
    agents: (items) => items.agents.length === 0
      ? <EmptySection label="No agents" />
      : items.agents.map(renderAgentItem),
    rules: (items) => items.rules.length === 0
      ? <EmptySection label="No rules" />
      : items.rules.map(renderRuleItem),
    commands: (items) => items.commands.length === 0
      ? <EmptySection label="No commands" />
      : items.commands.map(renderCommandItem),
    permissions: (items) => items.permissions.length === 0
      ? <EmptySection label="No permissions" />
      : items.permissions.map(renderPermItem),
  };

  const total = totalChecked();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: '720px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-200">
            Import from Workspace
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
                Select a workspace to import configuration from.
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
            <div className="flex-1 flex min-h-0">
              {/* Section sidebar */}
              <div className="w-44 flex-shrink-0 border-r border-border py-3 overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-gray-600 px-4 mb-2">
                  From: {selectedWorkspace?.name}
                </div>
                {sections.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`w-full flex items-center gap-1.5 px-4 py-2 text-xs transition-colors ${
                      activeSection === s
                        ? 'text-accent bg-accent/10'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="font-medium truncate">{SECTION_LABELS[s]}</span>
                    {renderSectionBadge(s)}
                  </button>
                ))}
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {importError && (
                  <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                    {importError}
                  </div>
                )}

                {/* Section select-all header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-gray-500">
                    {SECTION_LABELS[activeSection]}
                    {' — '}
                    <span className="text-green-400">
                      {sourceItems[activeSection].length - Array.from(existingKeys[activeSection]).filter(k =>
                        sourceItems[activeSection].some(item => {
                          switch (activeSection) {
                            case 'mcp': return mcpKey(item as McpServer) === k;
                            case 'hooks': return hookKey(item as HookEntry) === k;
                            case 'skills': return skillKey(item as SkillEntry) === k;
                            case 'agents': return agentKey(item as AgentEntry) === k;
                            case 'rules': return ruleKey(item as RuleEntry) === k;
                            case 'commands': return commandKey(item as CommandEntry) === k;
                            case 'permissions': return permKey(item as PermissionRule) === k;
                          }
                        })
                      ).length} new
                    </span>
                  </span>
                  {sourceItems[activeSection].length > 0 && (
                    <button
                      onClick={() => {
                        const newKeys = sourceItems[activeSection]
                          .filter(item => !existingKeys[activeSection].has(getKey(activeSection, item)))
                          .map(item => getKey(activeSection, item));
                        const allChecked = newKeys.every(k => checked[activeSection].has(k));
                        setChecked(prev => ({
                          ...prev,
                          [activeSection]: allChecked ? new Set() : new Set(newKeys),
                        }));
                      }}
                      className="text-[10px] text-gray-500 hover:text-accent transition-colors"
                    >
                      {sourceItems[activeSection]
                        .filter(item => !existingKeys[activeSection].has(getKey(activeSection, item)))
                        .every(item => checked[activeSection].has(getKey(activeSection, item)))
                        ? 'Deselect all'
                        : 'Select all'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {SECTION_RENDERERS[activeSection](sourceItems)}
                </div>
              </div>
            </div>
          )}

          {/* State: importing */}
          {state === 'importing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Importing configuration...</p>
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
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={total === 0}
                className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {total > 0 ? `${total} item${total !== 1 ? 's' : ''}` : ''}
              </button>
            </>
          )}

          {state === 'importing' && <div className="w-full" />}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const BADGE_COLOR_CLASSES: Record<string, string> = {
  purple: 'bg-purple-500/20 text-purple-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  orange: 'bg-orange-500/20 text-orange-400',
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  red: 'bg-red-500/20 text-red-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
};

function ImportRow({
  itemKey,
  checked,
  existing,
  onToggle,
  title,
  subtitle,
  badge,
}: {
  itemKey: string;
  checked: boolean;
  existing: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string };
}) {
  if (existing) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg opacity-40">
        <input type="checkbox" disabled checked={false} readOnly className="w-3.5 h-3.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-300 truncate">{title}</div>
          {subtitle && <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">{subtitle}</div>}
        </div>
        <span className="text-[10px] text-gray-600 italic flex-shrink-0">exists</span>
      </div>
    );
  }

  return (
    <label
      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg cursor-pointer hover:border-accent/30 transition-colors"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="accent-[#6c5ce7] w-3.5 h-3.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-200 truncate">{title}</div>
        {subtitle && <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">{subtitle}</div>}
      </div>
      {badge && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${BADGE_COLOR_CLASSES[badge.color] ?? 'bg-gray-500/20 text-gray-400'}`}>
          {badge.label}
        </span>
      )}
    </label>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="text-sm text-gray-500 text-center py-8">{label}</div>
  );
}

// ─── Key helper (needed for select-all) ─────────────────────────────────────

function getKey(section: ImportSection, item: unknown): string {
  switch (section) {
    case 'mcp': return mcpKey(item as McpServer);
    case 'hooks': return hookKey(item as HookEntry);
    case 'skills': return skillKey(item as SkillEntry);
    case 'agents': return agentKey(item as AgentEntry);
    case 'rules': return ruleKey(item as RuleEntry);
    case 'commands': return commandKey(item as CommandEntry);
    case 'permissions': return permKey(item as PermissionRule);
    case 'plugins': return pluginKey(item as PluginEntry);
  }
}
