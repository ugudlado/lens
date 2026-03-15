import { NavSection } from "@lens/schema";
import type { ConfigSnapshot, Workspace } from "@lens/schema";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Scale,
  Brain,
  Sparkles,
  Bot,
  Terminal,
  Server,
  Webhook,
  Puzzle,
  Settings,
  Shield,
  Box,
} from "lucide-react";

import { APP_NAME, APP_VERSION } from "../constants.js";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher.js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavItem {
  key: NavSection;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { key: NavSection.Overview, label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Instructions",
    items: [
      { key: NavSection.ClaudeMd, label: "CLAUDE.md", icon: FileText },
      { key: NavSection.Rules, label: "Rules", icon: Scale },
      { key: NavSection.Memory, label: "Memory", icon: Brain },
    ],
  },
  {
    label: "Capabilities",
    items: [
      { key: NavSection.Skills, label: "Skills", icon: Sparkles },
      { key: NavSection.Agents, label: "Agents", icon: Bot },
      { key: NavSection.Commands, label: "Commands", icon: Terminal },
    ],
  },
  {
    label: "Integrations",
    items: [
      { key: NavSection.Mcp, label: "MCP Servers", icon: Server },
      { key: NavSection.Hooks, label: "Hooks", icon: Webhook },
      { key: NavSection.Plugins, label: "Plugins", icon: Puzzle },
    ],
  },
  {
    label: "Policy",
    items: [
      { key: NavSection.Settings, label: "Settings", icon: Settings },
      { key: NavSection.Permissions, label: "Permissions", icon: Shield },
    ],
  },
  {
    label: "",
    items: [{ key: NavSection.Sandbox, label: "Sandbox", icon: Box }],
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

interface AppSidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  config: ConfigSnapshot | null;
  workspaces: Workspace[];
  activeProject: string | null;
  onSelectWorkspace: (path: string) => void;
  onAddWorkspace: (path: string) => Promise<string | null>;
  onRemoveWorkspace: (name: string) => void;
}

export function AppSidebar({
  active,
  onNavigate,
  config,
  workspaces,
  activeProject,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-baseline gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">
            {APP_NAME}
          </span>
          <span className="text-muted-foreground text-[10px]">
            v{APP_VERSION}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx} className="py-0.5">
            {group.label && (
              <SidebarGroupLabel className="text-[9px] uppercase tracking-wider opacity-60">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const count = getCount(item.key, config);
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={active === item.key}
                        tooltip={item.label}
                        onClick={() => onNavigate(item.key)}
                        className="text-xs"
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {count !== null && count > 0 && (
                        <SidebarMenuBadge className="text-muted-foreground tabular-nums">
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeProject={activeProject}
          onSelect={onSelectWorkspace}
          onAdd={onAddWorkspace}
          onRemove={onRemoveWorkspace}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
