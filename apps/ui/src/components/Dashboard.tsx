import type { ConfigSnapshot, Suggestion, Workspace } from "@lens/schema";
import { ConfigScope, NavSection } from "@lens/schema";
import { useState } from "react";
import { ExportConfigModal } from "./ExportConfigModal.js";
import { SuggestionsBox } from "./SuggestionsBox.js";
import { WorkspaceConfigImportModal } from "./WorkspaceConfigImportModal.js";

interface DashboardProps {
  config: ConfigSnapshot;
  onNavigate: (section: NavSection) => void;
  workspaces?: Workspace[];
  activeProject?: string;
  onRescan?: () => void;
  suggestions?: Suggestion[] | null;
}

interface CardDef {
  section: NavSection;
  label: string;
  icon: string;
  description: string;
  getCount: (c: ConfigSnapshot) => number;
  getScopes: (c: ConfigSnapshot) => Array<{ scope: string }>;
  getPreviewItems: (c: ConfigSnapshot) => string[];
}

const scopedItems = (items: Array<{ scope: string }>) =>
  items.map((i) => ({ scope: i.scope }));
const noScopes = () => [] as Array<{ scope: string }>;

interface CardGroup {
  label: string;
  cards: CardDef[];
}

// Grouped by how a developer thinks about their Claude setup
const CARD_GROUPS: CardGroup[] = [
  {
    label: "Instructions",
    cards: [
      {
        section: NavSection.ClaudeMd,
        label: "CLAUDE.md",
        icon: "◧",
        description: "Project-specific instructions and context for Claude",
        getCount: (c) => c.claudeMd.files.length,
        getScopes: (c) => scopedItems(c.claudeMd.files),
        getPreviewItems: (c) =>
          c.claudeMd.files.slice(0, 3).map((f) => {
            const home = f.filePath.replace(/^\/Users\/[^/]+/, "~");
            // Show the directory context: ~/.claude/CLAUDE.md or ~/code/project/CLAUDE.md
            return home.replace(/\/CLAUDE\.md$/, "/CLAUDE.md");
          }),
      },
      {
        section: NavSection.Rules,
        label: "Rules",
        icon: "▤",
        description: "Reusable behavioral constraints applied to Claude",
        getCount: (c) => c.rules.rules.length,
        getScopes: (c) => scopedItems(c.rules.rules),
        getPreviewItems: (c) => c.rules.rules.slice(0, 3).map((r) => r.name),
      },
      {
        section: NavSection.Memory,
        label: "Memory",
        icon: "◌",
        description:
          "Files Claude can reference to persist context across sessions",
        getCount: (c) => c.memory.files.length,
        getScopes: noScopes,
        getPreviewItems: (c) =>
          c.memory.files
            .slice(0, 3)
            .map((f) => f.filePath.split("/").pop() ?? "Memory file"),
      },
    ],
  },
  {
    label: "Capabilities",
    cards: [
      {
        section: NavSection.Skills,
        label: "Skills",
        icon: "✦",
        description: "Custom slash commands and reusable workflows",
        getCount: (c) => c.skills.skills.length,
        getScopes: (c) => scopedItems(c.skills.skills),
        getPreviewItems: (c) => c.skills.skills.slice(0, 3).map((s) => s.name),
      },
      {
        section: NavSection.Agents,
        label: "Agents",
        icon: "◫",
        description: "Specialized subagents with focused roles and tools",
        getCount: (c) => c.agents.agents.length,
        getScopes: (c) => scopedItems(c.agents.agents),
        getPreviewItems: (c) => c.agents.agents.slice(0, 3).map((a) => a.name),
      },
      {
        section: NavSection.Commands,
        label: "Commands",
        icon: "▷",
        description: "Reusable prompt templates invoked as slash commands",
        getCount: (c) => c.commands.commands.length,
        getScopes: (c) => scopedItems(c.commands.commands),
        getPreviewItems: (c) =>
          c.commands.commands.slice(0, 3).map((cmd) => cmd.name),
      },
    ],
  },
  {
    label: "Integrations",
    cards: [
      {
        section: NavSection.Mcp,
        label: "MCP Servers",
        icon: "◉",
        description:
          "External tools and services connected via Model Context Protocol",
        getCount: (c) => c.mcp.servers.length,
        getScopes: (c) => scopedItems(c.mcp.servers),
        getPreviewItems: (c) => c.mcp.servers.slice(0, 3).map((s) => s.name),
      },
      {
        section: NavSection.Hooks,
        label: "Hooks",
        icon: "◆",
        description:
          "Event-driven scripts that run before or after Claude actions",
        getCount: (c) => c.hooks.hooks.length,
        getScopes: (c) => scopedItems(c.hooks.hooks),
        getPreviewItems: (c) =>
          Array.from(
            new Set(c.hooks.hooks.slice(0, 3).map((h) => h.event)),
          ).slice(0, 3),
      },
      {
        section: NavSection.Plugins,
        label: "Plugins",
        icon: "⬡",
        description:
          "Installable packages that extend Claude Code with new capabilities",
        getCount: (c) => c.plugins.plugins.length,
        getScopes: (c) =>
          Array.from({ length: c.plugins.plugins.length }, () => ({
            scope: ConfigScope.Global,
          })),
        getPreviewItems: (c) =>
          c.plugins.plugins.slice(0, 3).map((p) => p.name),
      },
    ],
  },
  {
    label: "Policy",
    cards: [
      {
        section: NavSection.Settings,
        label: "Settings",
        icon: "◎",
        description: "Claude Code configuration values across all scopes",
        getCount: (c) => c.settings.files.length,
        getScopes: (c) => scopedItems(c.settings.files),
        getPreviewItems: (c) => {
          const items: string[] = [];
          for (const f of c.settings.files.slice(0, 3)) {
            const keys = Object.keys(f.raw ?? {}).slice(0, 2);
            if (keys.length > 0) {
              items.push(...keys);
            } else {
              const path = f.filePath
                .replace(/.*\/\.claude\//, "~/.claude/")
                .replace(/.*\/(settings\.json)$/, "$1");
              items.push(path);
            }
          }
          return items.slice(0, 3);
        },
      },
      {
        section: NavSection.Permissions,
        label: "Permissions",
        icon: "◈",
        description:
          "Allow and deny rules controlling which tools Claude can use",
        getCount: (c) => c.permissions.rules.length,
        getScopes: (c) => scopedItems(c.permissions.rules),
        getPreviewItems: (c) =>
          c.permissions.rules.slice(0, 3).map((r) => {
            // Truncate long glob paths: "Edit(//Users/spidey/code/**)" → "Edit(~/code/**)"
            return r.rule
              .replace(/\/Users\/[^/]+/g, "~")
              .replace(/\(\/~/, "(~")
              .replace(/^(Allow|Deny):\s*/, "");
          }),
      },
      {
        section: NavSection.Sandbox,
        label: "Sandbox",
        icon: "◻",
        description: "Process isolation and network restrictions for Claude",
        getCount: (c) => (c.sandbox.enabled !== null ? 1 : 0),
        getScopes: (c) =>
          c.sandbox.enabled !== null
            ? [{ scope: c.sandbox.enabled.scope }]
            : [],
        getPreviewItems: (c) =>
          c.sandbox.enabled !== null
            ? [c.sandbox.enabled.value ? "Enabled" : "Disabled"]
            : [],
      },
    ],
  },
];

function countByScope(
  items: Array<{ scope: string }>,
): Array<{ scope: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.scope, (map.get(item.scope) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([scope, count]) => ({ scope, count }));
}

// Scope pill styles: subdued semantic colors per scope
const SCOPE_PILL: Record<string, string> = {
  [ConfigScope.Managed]: "bg-rose-400/10 text-rose-400/70",
  [ConfigScope.Global]: "bg-slate-700/60 text-slate-400",
  [ConfigScope.Project]: "bg-teal-900/50 text-teal-400/70",
  [ConfigScope.Local]: "bg-amber-900/50 text-amber-400/70",
};

// Short label for each scope shown inside pill
const SCOPE_LABEL: Record<string, string> = {
  [ConfigScope.Managed]: "managed",
  [ConfigScope.Global]: "global",
  [ConfigScope.Project]: "project",
  [ConfigScope.Local]: "local",
};

// Map section group labels to left-edge accent colors
const GROUP_ACCENT_COLORS: Record<string, string> = {
  Instructions: "border-l-sky-500/30",
  Capabilities: "border-l-green-500/30",
  Integrations: "border-l-purple-500/30",
  Policy: "border-l-amber-500/30",
};

// Map section group labels to text colors — unified neutral, let left-border carry color identity
const GROUP_TEXT_COLORS: Record<string, string> = {
  Instructions: "text-white/40",
  Capabilities: "text-white/40",
  Integrations: "text-white/40",
  Policy: "text-white/40",
};

// Map section group labels to bottom border colors
const GROUP_BOTTOM_BORDERS: Record<string, string> = {
  Instructions: "border-white/8",
  Capabilities: "border-white/8",
  Integrations: "border-white/8",
  Policy: "border-white/8",
};

// Map section group labels to card hover border colors
const GROUP_HOVER_BORDERS: Record<string, string> = {
  Instructions: "hover:border-sky-500/30",
  Capabilities: "hover:border-green-500/30",
  Integrations: "hover:border-purple-500/30",
  Policy: "hover:border-amber-500/30",
};

// Count badge colors: all neutral, readable white
const GROUP_COUNT_COLORS: Record<string, string> = {
  Instructions: "text-white/70",
  Capabilities: "text-white/70",
  Integrations: "text-white/70",
  Policy: "text-white/70",
};

// Card component for config surfaces
function ConfigCard({
  card,
  config,
  onNavigate,
  isConfigured,
  groupLabel,
}: {
  card: CardDef;
  config: ConfigSnapshot;
  onNavigate: (s: NavSection) => void;
  isConfigured: boolean;
  groupLabel: string;
}) {
  const scopeCounts = countByScope(card.getScopes(config));
  const totalCount = card.getCount(config);
  const previewItems = card.getPreviewItems(config);

  const accentBorder =
    GROUP_ACCENT_COLORS[groupLabel] ?? "border-l-slate-600/40";
  const hoverBorder =
    GROUP_HOVER_BORDERS[groupLabel] ?? "hover:border-slate-500/40";
  const countColor = GROUP_COUNT_COLORS[groupLabel] ?? "text-slate-400";

  return (
    <button
      onClick={() => onNavigate(card.section)}
      className={`group flex w-full flex-col gap-2 rounded border border-l-2 bg-white/[0.02] px-4 py-3 text-left transition-all ${
        isConfigured
          ? `border-white/5 ${accentBorder} ${hoverBorder} hover:bg-white/[0.04]`
          : "border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
      }`}
    >
      {/* Top row: label + count */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${isConfigured ? "text-white/90" : "italic text-slate-500"}`}
        >
          {card.label}
        </span>
        {isConfigured ? (
          <span className={`text-lg font-semibold tabular-nums ${countColor}`}>
            {totalCount}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            Set up →
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-slate-500">
        {card.description}
      </p>

      {/* Bottom row: scope pills or preview items */}
      {isConfigured && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Show scope badges (up to 3) */}
          {scopeCounts.slice(0, 3).map(({ scope, count: sc }) => (
            <span
              key={scope}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${SCOPE_PILL[scope] ?? "bg-stone-400/15 text-stone-400"}`}
            >
              {SCOPE_LABEL[scope] ?? scope} {sc}
            </span>
          ))}
          {scopeCounts.length > 3 && (
            <span className="text-[10px] text-slate-600">
              +{scopeCounts.length - 3} more
            </span>
          )}
          {/* Preview items as muted text when no scope info */}
          {scopeCounts.length === 0 && previewItems.length > 0 && (
            <span className="truncate text-[10px] text-slate-600">
              {previewItems.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function Dashboard({
  config,
  onNavigate,
  workspaces = [],
  activeProject = "",
  onRescan,
  suggestions,
}: DashboardProps) {
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasSuggestions = suggestions && suggestions.length > 0;

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
      {showExport && (
        <ExportConfigModal
          config={config}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-semibold text-white">
              Configuration Overview
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-slate-500">
                {config.projectPath}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-600">
                {new Date(config.scanTime).toLocaleString()}
              </span>
              {hasSuggestions && suggestions && (
                <button
                  onClick={() => setShowSuggestions((v) => !v)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${showSuggestions ? "border-amber-500/50 bg-amber-500/20 text-amber-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/15"}`}
                >
                  ✦ {suggestions.length} suggestion
                  {suggestions.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRescan && (
              <button
                onClick={() => setShowImport(true)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/70"
              >
                ↑ Import
              </button>
            )}
            <button
              onClick={() => setShowExport(true)}
              className="flex-shrink-0 rounded border border-accent/50 bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/30"
            >
              ↓ Export
            </button>
          </div>
        </div>
        {showSuggestions && suggestions && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <SuggestionsBox
              suggestions={suggestions}
              onNavigate={(section) => {
                onNavigate(section);
                setShowSuggestions(false);
              }}
              activeProject={activeProject}
            />
          </div>
        )}
      </div>

      {/* Config surfaces - compact list layout */}
      <div className="space-y-5">
        {CARD_GROUPS.map((group, idx) => {
          // Separate configured and not-configured cards
          const configuredCards: CardDef[] = [];
          const notConfiguredCards: CardDef[] = [];

          group.cards.forEach((card) => {
            const isConfigured = card.getCount(config) > 0;
            if (isConfigured) {
              configuredCards.push(card);
            } else {
              notConfiguredCards.push(card);
            }
          });

          return (
            <div key={group.label} className={idx > 0 ? "mt-5" : ""}>
              {/* Section header */}
              <div
                className={`mb-2 border-b border-l-2 ${GROUP_ACCENT_COLORS[group.label] ?? "border-l-slate-600/40"} ${GROUP_BOTTOM_BORDERS[group.label] ?? "border-slate-500/10"} pb-1 pl-2 text-xs font-semibold uppercase tracking-widest ${GROUP_TEXT_COLORS[group.label] ?? "text-slate-400"}`}
              >
                {group.label}
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Show configured items */}
                {configuredCards.map((card) => (
                  <ConfigCard
                    key={card.section}
                    card={card}
                    config={config}
                    onNavigate={onNavigate}
                    isConfigured={true}
                    groupLabel={group.label}
                  />
                ))}

                {/* Show not-configured items */}
                {notConfiguredCards.map((card) => (
                  <ConfigCard
                    key={card.section}
                    card={card}
                    config={config}
                    onNavigate={onNavigate}
                    isConfigured={false}
                    groupLabel={group.label}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
