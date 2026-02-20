import { useState } from 'react';
import { NavSection, ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, Workspace } from '@lens/schema';
import { WorkspaceConfigImportModal } from './WorkspaceConfigImportModal.js';

interface DashboardProps {
  config: ConfigSnapshot;
  onNavigate: (section: NavSection) => void;
  workspaces?: Workspace[];
  activeProject?: string;
  onRescan?: () => void;
}

interface CardDef {
  section: NavSection;
  label: string;
  description: string;
  getCount: (c: ConfigSnapshot) => number;
  getScopes: (c: ConfigSnapshot) => Array<{ scope: string }>;
}

const scopedItems = (items: Array<{ scope: string }>) => items.map(i => ({ scope: i.scope }));
const noScopes = () => [] as Array<{ scope: string }>;

const CARDS: CardDef[] = [
  {
    section: NavSection.ClaudeMd,
    label: 'CLAUDE.md Files',
    description: 'Project instructions and guidance',
    getCount: c => c.claudeMd.files.length,
    getScopes: c => scopedItems(c.claudeMd.files),
  },
  {
    section: NavSection.Settings,
    label: 'Settings Files',
    description: 'Configuration preferences',
    getCount: c => c.settings.files.length,
    getScopes: c => scopedItems(c.settings.files),
  },
  {
    section: NavSection.Permissions,
    label: 'Permission Rules',
    description: 'Tool and resource access control',
    getCount: c => c.permissions.rules.length,
    getScopes: c => scopedItems(c.permissions.rules),
  },
  {
    section: NavSection.Mcp,
    label: 'MCP Servers',
    description: 'Tool server integrations',
    getCount: c => c.mcp.servers.length,
    getScopes: c => scopedItems(c.mcp.servers),
  },
  {
    section: NavSection.Hooks,
    label: 'Hooks',
    description: 'Event-driven automations',
    getCount: c => c.hooks.hooks.length,
    getScopes: c => scopedItems(c.hooks.hooks),
  },
  {
    section: NavSection.Skills,
    label: 'Skills',
    description: 'Reusable agent capabilities',
    getCount: c => c.skills.skills.length,
    getScopes: c => scopedItems(c.skills.skills),
  },
  {
    section: NavSection.Agents,
    label: 'Agents',
    description: 'Configured sub-agents',
    getCount: c => c.agents.agents.length,
    getScopes: c => scopedItems(c.agents.agents),
  },
  {
    section: NavSection.Rules,
    label: 'Rules',
    description: 'Path-scoped behavior rules',
    getCount: c => c.rules.rules.length,
    getScopes: c => scopedItems(c.rules.rules),
  },
  {
    section: NavSection.Commands,
    label: 'Commands',
    description: 'Custom slash commands',
    getCount: c => c.commands.commands.length,
    getScopes: c => scopedItems(c.commands.commands),
  },
  {
    section: NavSection.Memory,
    label: 'Memory Files',
    description: 'Persistent context storage',
    getCount: c => c.memory.files.length,
    getScopes: noScopes,
  },
  {
    section: NavSection.Plugins,
    label: 'Plugins',
    description: 'Marketplace extensions',
    getCount: c => c.plugins.plugins.length,
    getScopes: noScopes,
  },
];

function countByScope(items: Array<{ scope: string }>): Array<{ scope: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.scope, (map.get(item.scope) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([scope, count]) => ({ scope, count }));
}

const SCOPE_TEXT_COLORS: Record<string, string> = {
  [ConfigScope.Managed]: 'text-red-400',
  [ConfigScope.Global]: 'text-blue-400',
  [ConfigScope.Project]: 'text-green-400',
  [ConfigScope.Local]: 'text-yellow-400',
};

export function Dashboard({ config, onNavigate, workspaces = [], activeProject = '', onRescan }: DashboardProps) {
  const [showImport, setShowImport] = useState(false);
  const otherWorkspaces = workspaces.filter(w => w.path !== activeProject);

  return (
    <div>
      {showImport && onRescan && (
        <WorkspaceConfigImportModal
          workspaces={workspaces}
          activeProject={activeProject}
          currentConfig={config}
          onRescan={onRescan}
          onClose={() => setShowImport(false)}
        />
      )}

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Configuration Overview</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <span className="text-gray-400">Project:</span>{' '}
                <span className="text-gray-300 font-mono">{config.projectPath}</span>
              </span>
              <span className="text-border">|</span>
              <span>
                <span className="text-gray-400">Scanned:</span>{' '}
                <span className="text-gray-300">{new Date(config.scanTime).toLocaleString()}</span>
              </span>
            </div>
          </div>
          {otherWorkspaces.length > 0 && onRescan && (
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <span>↓</span>
              Import from Workspace
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CARDS.map((card) => {
          const count = card.getCount(config);
          const scopeCounts = countByScope(card.getScopes(config));
          return (
            <button
              key={card.section}
              onClick={() => count > 0 && onNavigate(card.section)}
              className={`bg-card border border-border rounded-lg p-5 text-left transition-all group ${
                count === 0 ? 'opacity-50 cursor-default' : 'hover:border-accent/50 hover:bg-card/80 cursor-pointer'
              }`}
            >
              <div className="text-3xl font-bold text-accent group-hover:text-accent-hover transition-colors">
                {count}
              </div>
              <div className="text-sm font-semibold text-gray-200 mt-1">{card.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.description}</div>
              {scopeCounts.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-3 text-xs">
                  {scopeCounts.map(({ scope, count }) => (
                    <span key={scope} className={SCOPE_TEXT_COLORS[scope] || 'text-gray-400'}>
                      {count} {scope}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
