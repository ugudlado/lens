import { NavSection } from "@lens/schema";
import type { ConfigSnapshot, Workspace } from "@lens/schema";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { APP_NAME, APP_VERSION } from "../constants.js";

interface NavItem {
  key: NavSection;
  icon: string;
  label: string;
}

// Group nav items by logical sections with group metadata
interface NavGroup {
  label: string;
  color: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    color: "",
    items: [{ key: NavSection.Overview, label: "Overview", icon: "▦" }],
  },
  {
    label: "INSTRUCTIONS",
    color: "text-gray-600",
    items: [
      { key: NavSection.ClaudeMd, label: "CLAUDE.md", icon: "◧" },
      { key: NavSection.Rules, label: "Rules", icon: "▤" },
      { key: NavSection.Memory, label: "Memory", icon: "◌" },
    ],
  },
  {
    label: "CAPABILITIES",
    color: "text-gray-600",
    items: [
      { key: NavSection.Skills, label: "Skills", icon: "✦" },
      { key: NavSection.Agents, label: "Agents", icon: "◫" },
      { key: NavSection.Commands, label: "Commands", icon: "▷" },
    ],
  },
  {
    label: "INTEGRATIONS",
    color: "text-gray-600",
    items: [
      { key: NavSection.Mcp, label: "MCP Servers", icon: "◉" },
      { key: NavSection.Hooks, label: "Hooks", icon: "◆" },
      { key: NavSection.Plugins, label: "Plugins", icon: "⬡" },
    ],
  },
  {
    label: "POLICY",
    color: "text-gray-600",
    items: [
      { key: NavSection.Settings, label: "Settings", icon: "◎" },
      { key: NavSection.Permissions, label: "Permissions", icon: "◈" },
    ],
  },
  {
    label: "",
    color: "",
    items: [{ key: NavSection.Sandbox, label: "Sandbox", icon: "◻" }],
  },
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
    <aside className="flex min-h-screen w-52 flex-col border-r-2 border-border/60 bg-sidebar">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xs font-bold uppercase tracking-widest text-accent">
            {APP_NAME}
          </h1>
          <span className="text-[10px] text-white/20">v{APP_VERSION}</span>
        </div>
      </div>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeProject={activeProject}
        onSelect={onSelectWorkspace}
        onAdd={onAddWorkspace}
        onRemove={onRemoveWorkspace}
      />
      <nav className="flex-1 overflow-y-auto py-1.5">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.label && (
              <div
                className={`mb-1 mt-3 px-2 text-[9px] font-semibold uppercase tracking-wider opacity-40 ${group.color}`}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = active === item.key;
              const count = getCount(item.key, config);
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-1.5 text-xs transition-colors ${
                    isActive
                      ? "sidebar-active-glow border-r-2 border-accent bg-accent/10 text-accent"
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                  }`}
                >
                  <span className="flex-1 text-left">{item.label}</span>
                  {count !== null && count > 0 && (
                    <span className="min-w-[1.5rem] text-right text-xs tabular-nums text-slate-500">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
