import {
  ConfigScope,
  NavSection,
  SuggestionCategory,
  SuggestionSeverity,
} from "@lens/schema";
import type { SuggestionRule } from "@lens/schema";

export const contextualRules: SuggestionRule[] = [
  // Rule 1: Has MCP servers but no hooks
  // Note: suppressed by aggregator when health-no-hooks is also active
  (config) => {
    const hasEnabledMcp = config.mcp.servers.some(
      (s) => s.enabled && s.pluginInstalled !== false,
    );
    const hasHooks = config.hooks.hooks.length > 0;
    if (!hasEnabledMcp || hasHooks) return [];
    return [
      {
        id: "ctx-mcp-no-hooks",
        category: SuggestionCategory.Contextual,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Hooks,
        title: "MCP servers configured but no hooks",
        description:
          "You have MCP servers configured. Consider adding pre-tool hooks to validate or log MCP tool calls for better visibility and control.",
      },
    ];
  },

  // Rule 2: Has legacy commands but no skills (skills supersede commands)
  (config) => {
    const hasCommands = config.commands.commands.length > 0;
    const hasSkills =
      config.skills.skills.filter((s) => !s.pluginName).length > 0;
    if (!hasCommands || hasSkills) return [];
    return [
      {
        id: "ctx-commands-no-skills",
        category: SuggestionCategory.Contextual,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Skills,
        title: "Legacy commands without skills",
        description:
          "You have commands configured. Skills are the modern replacement — they support tools, models, and hooks. Consider migrating your commands to skills.",
      },
    ];
  },

  // Rule 3: Has plugins but no project settings
  (config) => {
    const hasPlugins = config.plugins.plugins.some((p) => p.enabled);
    const hasProjectSettings = config.settings.files.some(
      (f) => f.scope === ConfigScope.Project || f.scope === ConfigScope.Local,
    );
    if (!hasPlugins || hasProjectSettings) return [];
    return [
      {
        id: "ctx-plugins-no-settings",
        category: SuggestionCategory.Contextual,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Settings,
        title: "Plugins installed but no project settings",
        description:
          "You have plugins but no project-level settings file. Add one to configure plugin behavior consistently for your project.",
      },
    ];
  },
];
