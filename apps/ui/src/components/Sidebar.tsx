import { NavSection } from "@lens/schema";
import type { ConfigSnapshot, Workspace } from "@lens/schema";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { APP_NAME, APP_VERSION } from "../constants.js";

interface NavItem {
  key: NavSection;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: NavSection.Overview, icon: "\u25CE", label: "Overview" },
  { key: NavSection.ClaudeMd, icon: "\uD83D\uDCC4", label: "CLAUDE.md" },
  { key: NavSection.Settings, icon: "\u2699", label: "Settings" },
  { key: NavSection.Permissions, icon: "\uD83D\uDD12", label: "Permissions" },
  { key: NavSection.Mcp, icon: "\uD83D\uDD0C", label: "MCP Servers" },
  { key: NavSection.Hooks, icon: "\u26A1", label: "Hooks" },
  { key: NavSection.Skills, icon: "\u2726", label: "Skills" },
  { key: NavSection.Agents, icon: "\uD83E\uDD16", label: "Agents" },
  { key: NavSection.Rules, icon: "\uD83D\uDCCF", label: "Rules" },
  { key: NavSection.Commands, icon: "\u2318", label: "Commands" },
  { key: NavSection.Memory, icon: "\uD83D\uDCBE", label: "Memory" },
  { key: NavSection.Plugins, icon: "\uD83E\uDDE9", label: "Plugins" },
  { key: NavSection.Sandbox, icon: "\uD83D\uDCE6", label: "Sandbox" },
];

function getCount(
  section: NavSection,
  config: ConfigSnapshot | null,
): number | null {
  if (!config) return null;
  switch (section) {
    case NavSection.ClaudeMd:
      return config.claudeMd.files.length;
    case NavSection.Settings:
      return config.settings.files.length;
    case NavSection.Permissions:
      return config.permissions.rules.length;
    case NavSection.Mcp:
      return config.mcp.servers.length;
    case NavSection.Hooks:
      return config.hooks.hooks.length;
    case NavSection.Skills:
      return config.skills.skills.length;
    case NavSection.Agents:
      return config.agents.agents.length;
    case NavSection.Rules:
      return config.rules.rules.length;
    case NavSection.Commands:
      return config.commands.commands.length;
    case NavSection.Plugins:
      return config.plugins.plugins.length;
    case NavSection.Memory:
      return config.memory.files.length;
    default:
      return null;
  }
}

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  config: ConfigSnapshot | null;
  workspaces: Workspace[];
  activeProject: string | null;
  onSelectWorkspace: (path: string) => void;
  onAddWorkspace: (path: string) => Promise<string | null>;
  onRemoveWorkspace: (name: string) => void;
}

export function Sidebar({
  active,
  onNavigate,
  config,
  workspaces,
  activeProject,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
}: SidebarProps) {
  return (
    <aside className="flex min-h-screen w-56 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-4 py-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xs font-bold uppercase tracking-widest text-accent">
            {APP_NAME}
          </h1>
          <span className="text-[10px] text-gray-600">v{APP_VERSION}</span>
        </div>
      </div>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeProject={activeProject}
        onSelect={onSelectWorkspace}
        onAdd={onAddWorkspace}
        onRemove={onRemoveWorkspace}
      />
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const count = getCount(item.key, config);
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-r-2 border-accent bg-accent/10 text-accent"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {count !== null && (
                <span
                  className={`text-xs tabular-nums ${
                    isActive ? "text-accent" : "text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
