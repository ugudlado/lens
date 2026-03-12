import {
  ConfigScope,
  NavSection,
  SuggestionCategory,
  SuggestionSeverity,
} from "@lens/schema";
import type { SuggestionRule } from "@lens/schema";

export const healthRules: SuggestionRule[] = [
  // Rule 1: No project-level CLAUDE.md
  (config) => {
    const hasProjectClaude = config.claudeMd.files.some(
      (f) => f.scope === ConfigScope.Project || f.scope === ConfigScope.Local,
    );
    if (hasProjectClaude) return [];
    return [
      {
        id: "health-no-claude-md",
        category: SuggestionCategory.Health,
        severity: SuggestionSeverity.Warning,
        navSection: NavSection.ClaudeMd,
        title: "No project CLAUDE.md found",
        description:
          "Add a CLAUDE.md to your project to give Claude context about your codebase, conventions, and workflow.",
        fix: { label: "Create CLAUDE.md" },
      },
    ];
  },

  // Rule 2: No hooks configured
  (config) => {
    if (config.hooks.hooks.length > 0) return [];
    return [
      {
        id: "health-no-hooks",
        category: SuggestionCategory.Health,
        severity: SuggestionSeverity.Warning,
        navSection: NavSection.Hooks,
        title: "No hooks configured",
        description:
          "Hooks let you run scripts or prompts on Claude Code events. Add hooks to control tool behavior, enforce policies, or automate tasks.",
      },
    ];
  },

  // Rule 3: No permission rules
  (config) => {
    if (config.permissions.rules.length > 0) return [];
    return [
      {
        id: "health-no-permissions",
        category: SuggestionCategory.Health,
        severity: SuggestionSeverity.Warning,
        navSection: NavSection.Permissions,
        title: "No permission rules defined",
        description:
          "Permission rules control which tools Claude can use without asking. Define allow/deny rules to customize Claude's access.",
      },
    ];
  },

  // Rule 4: No MCP servers
  (config) => {
    const enabledServers = config.mcp.servers.filter(
      (s) => s.enabled && s.pluginInstalled !== false,
    );
    if (enabledServers.length > 0) return [];
    return [
      {
        id: "health-no-mcp",
        category: SuggestionCategory.Health,
        severity: SuggestionSeverity.Warning,
        navSection: NavSection.Mcp,
        title: "No MCP servers configured",
        description:
          "MCP servers extend Claude with tools like databases, APIs, and external services. Configure at least one to unlock more capabilities.",
      },
    ];
  },
];
