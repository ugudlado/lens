import { useMemo, useCallback } from 'react';
import { NavSection, ConfigScope } from '@lens/schema';
import type { ConfigSnapshot } from '@lens/schema';
import { slug } from '../constants.js';

export interface SearchResult {
  id: string;
  label: string;
  preview: string;
  section: NavSection;
  scope: ConfigScope | 'n/a';
  matchField: string;
  scrollId?: string;
  sectionLabel: string;
}

const SECTION_LABELS: Record<NavSection, string> = {
  [NavSection.Overview]: 'Overview',
  [NavSection.ClaudeMd]: 'CLAUDE.md',
  [NavSection.Settings]: 'Settings',
  [NavSection.Permissions]: 'Permissions',
  [NavSection.Mcp]: 'MCP Servers',
  [NavSection.Hooks]: 'Hooks',
  [NavSection.Skills]: 'Skills',
  [NavSection.Agents]: 'Agents',
  [NavSection.Rules]: 'Rules',
  [NavSection.Commands]: 'Commands',
  [NavSection.Plugins]: 'Plugins',
  [NavSection.Memory]: 'Memory',
  [NavSection.Sandbox]: 'Sandbox',
};

function buildIndex(config: ConfigSnapshot): SearchResult[] {
  const results: SearchResult[] = [];

  // Panel names (navigate only)
  for (const [section, label] of Object.entries(SECTION_LABELS) as [NavSection, string][]) {
    if (section === NavSection.Overview) continue;
    results.push({
      id: `panel:${section}`,
      label,
      preview: `Navigate to ${label} panel`,
      section,
      scope: 'n/a',
      matchField: 'panel',
      sectionLabel: label,
    });
  }

  // MCP servers
  for (const s of config.mcp.servers) {
    const preview = s.command ? [s.command, ...(s.args ?? [])].join(' ') : (s.url ?? '');
    results.push({
      id: `mcp:${s.name}:${s.scope}`,
      label: s.name,
      preview: preview.slice(0, 80),
      section: NavSection.Mcp,
      scope: s.scope,
      matchField: 'name',
      scrollId: `mcp-${slug(s.name)}-${s.scope}`,
      sectionLabel: 'MCP Servers',
    });
  }

  // Hooks
  config.hooks.hooks.forEach((h, i) => {
    const label = h.matcher ? `${h.event} (${h.matcher})` : h.event;
    const preview = h.command ?? h.prompt ?? h.type;
    results.push({
      id: `hook:${h.event}:${i}:${h.scope}`,
      label,
      preview: (preview ?? '').slice(0, 80),
      section: NavSection.Hooks,
      scope: h.scope,
      matchField: 'event',
      scrollId: `hook-${slug(h.event)}-${i}-${h.scope}`,
      sectionLabel: 'Hooks',
    });
  });

  // Skills
  for (const s of config.skills.skills) {
    results.push({
      id: `skill:${s.name}:${s.scope}`,
      label: s.name,
      preview: (s.description ?? '').slice(0, 80),
      section: NavSection.Skills,
      scope: s.scope,
      matchField: 'name',
      scrollId: `skill-${slug(s.name)}-${s.scope}`,
      sectionLabel: 'Skills',
    });
  }

  // Agents
  for (const a of config.agents.agents) {
    results.push({
      id: `agent:${a.name}:${a.scope}`,
      label: a.name,
      preview: (a.description ?? '').slice(0, 80),
      section: NavSection.Agents,
      scope: a.scope,
      matchField: 'name',
      scrollId: `agent-${slug(a.name)}-${a.scope}`,
      sectionLabel: 'Agents',
    });
  }

  // Commands
  for (const c of config.commands.commands) {
    results.push({
      id: `command:${c.name}:${c.scope}`,
      label: c.name,
      preview: c.content.slice(0, 80),
      section: NavSection.Commands,
      scope: c.scope,
      matchField: 'name',
      scrollId: `command-${slug(c.name)}-${c.scope}`,
      sectionLabel: 'Commands',
    });
  }

  // Rules
  for (const r of config.rules.rules) {
    results.push({
      id: `rule:${r.name}:${r.scope}`,
      label: r.name,
      preview: r.content.slice(0, 80),
      section: NavSection.Rules,
      scope: r.scope,
      matchField: 'name',
      scrollId: `rule-${slug(r.name)}-${r.scope}`,
      sectionLabel: 'Rules',
    });
  }

  // Plugins
  for (const p of config.plugins.plugins) {
    results.push({
      id: `plugin:${p.name}:${p.scope}`,
      label: p.name,
      preview: p.description?.slice(0, 80) ?? p.marketplace,
      section: NavSection.Plugins,
      scope: p.scope === 'user' ? ConfigScope.Global : ConfigScope.Project,
      matchField: 'name',
      scrollId: `plugin-${slug(p.name)}-${p.scope}`,
      sectionLabel: 'Plugins',
    });
  }

  // Settings (effective keys)
  for (const [key, item] of Object.entries(config.settings.effective)) {
    results.push({
      id: `setting:${key}:${item.scope}`,
      label: key,
      preview: String(item.value).slice(0, 80),
      section: NavSection.Settings,
      scope: item.scope,
      matchField: 'key',
      scrollId: `setting-${slug(key)}-${item.scope}`,
      sectionLabel: 'Settings',
    });
  }

  // Permissions
  config.permissions.rules.forEach((r, i) => {
    results.push({
      id: `permission:${r.rule}:${i}:${r.scope}`,
      label: r.rule,
      preview: r.type,
      section: NavSection.Permissions,
      scope: r.scope,
      matchField: 'rule',
      scrollId: `permission-${slug(r.rule)}-${i}-${r.scope}`,
      sectionLabel: 'Permissions',
    });
  });

  // CLAUDE.md files
  for (const f of config.claudeMd.files) {
    results.push({
      id: `claude-md:${f.scope}:${f.filePath}`,
      label: f.filePath.split('/').pop() ?? 'CLAUDE.md',
      preview: f.filePath,
      section: NavSection.ClaudeMd,
      scope: f.scope,
      matchField: 'path',
      scrollId: `claude-md-${slug(f.scope)}`,
      sectionLabel: 'CLAUDE.md',
    });
  }

  // Memory files
  for (const m of config.memory.files) {
    results.push({
      id: `memory:${m.name}`,
      label: m.name,
      preview: m.content.slice(0, 80),
      section: NavSection.Memory,
      scope: ConfigScope.Global,
      matchField: 'name',
      scrollId: `memory-${slug(m.name)}`,
      sectionLabel: 'Memory',
    });
  }

  return results;
}

function rankScore(result: SearchResult, q: string): number {
  const lq = q.toLowerCase();
  const ll = result.label.toLowerCase();
  const lp = result.preview.toLowerCase();
  const ls = result.sectionLabel.toLowerCase();
  if (ll === lq) return 100;
  if (ll.startsWith(lq)) return 80;
  if (ll.includes(lq)) return 60;
  if (lp.includes(lq)) return 40;
  if (ls.includes(lq)) return 20;
  return 0;
}

export function useUniversalSearch(config: ConfigSnapshot | null) {
  const index = useMemo(() => (config ? buildIndex(config) : []), [config]);

  const search = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return index
      .map(r => ({ result: r, score: rankScore(r, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ result }) => result);
  }, [index]);

  return { search };
}
