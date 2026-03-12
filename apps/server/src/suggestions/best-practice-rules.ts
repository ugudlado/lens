import {
  ConfigScope,
  NavSection,
  SuggestionCategory,
  SuggestionSeverity,
} from "@lens/schema";
import type { SuggestionRule } from "@lens/schema";

export const bestPracticeRules: SuggestionRule[] = [
  // Rule 1: No project-level settings file
  (config) => {
    const hasProjectSettings = config.settings.files.some(
      (f) => f.scope === ConfigScope.Project || f.scope === ConfigScope.Local,
    );
    if (hasProjectSettings) return [];
    return [
      {
        id: "bp-no-project-settings",
        category: SuggestionCategory.BestPractice,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Settings,
        title: "No project settings file",
        description:
          "A project-level settings.json ensures consistent Claude behavior for all contributors. Add one to share settings across your team.",
      },
    ];
  },

  // Rule 2: Sandbox not configured (enabled === null means never touched)
  // IMPORTANT: Only fires when null (not configured). Does NOT fire when explicitly false.
  (config) => {
    if (config.sandbox.enabled !== null) return [];
    return [
      {
        id: "bp-sandbox-disabled",
        category: SuggestionCategory.BestPractice,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Sandbox,
        title: "Sandbox not configured",
        description:
          "The sandbox restricts file and network access during Claude's tool use. Enable it for safer execution, especially when using MCP servers.",
      },
    ];
  },

  // Rule 3: No memory files
  (config) => {
    if (config.memory.files.length > 0) return [];
    return [
      {
        id: "bp-no-memory",
        category: SuggestionCategory.BestPractice,
        severity: SuggestionSeverity.Info,
        navSection: NavSection.Memory,
        title: "No memory files found",
        description:
          "Memory files let Claude persist context across sessions. Create a memory directory to help Claude remember project-specific information.",
      },
    ];
  },
];
