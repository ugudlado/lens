import { useState } from "react";
import {
  NavSection,
  SuggestionCategory,
  SuggestionSeverity,
} from "@lens/schema";
import type { Suggestion } from "@lens/schema";

interface SuggestionsBoxProps {
  suggestions: Suggestion[] | null;
  onNavigate: (section: NavSection) => void;
}

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  [SuggestionCategory.Health]: "Health Checks",
  [SuggestionCategory.BestPractice]: "Best Practices",
  [SuggestionCategory.Contextual]: "Contextual",
};

const CATEGORY_ORDER: SuggestionCategory[] = [
  SuggestionCategory.Health,
  SuggestionCategory.BestPractice,
  SuggestionCategory.Contextual,
];

const NAV_LABELS: Partial<Record<NavSection, string>> = {
  [NavSection.ClaudeMd]: "CLAUDE.md",
  [NavSection.Settings]: "Settings",
  [NavSection.Permissions]: "Permissions",
  [NavSection.Mcp]: "MCP Servers",
  [NavSection.Hooks]: "Hooks",
  [NavSection.Skills]: "Skills",
  [NavSection.Memory]: "Memory",
  [NavSection.Sandbox]: "Sandbox",
  [NavSection.Commands]: "Commands",
  [NavSection.Plugins]: "Plugins",
};

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded bg-border/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-border/50" />
              <div className="h-3 w-full rounded bg-border/30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onNavigate,
}: {
  suggestion: Suggestion;
  onNavigate: (section: NavSection) => void;
}) {
  const isWarning = suggestion.severity === SuggestionSeverity.Warning;
  const sectionLabel =
    NAV_LABELS[suggestion.navSection] ?? suggestion.navSection;

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all hover:border-accent/50 hover:bg-card/80">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex-shrink-0 text-base ${
            isWarning ? "text-amber-400" : "text-blue-400"
          }`}
        >
          {isWarning ? "\u26A0" : "\u2139"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-200">
            {suggestion.title}
          </div>
          <div className="mt-0.5 text-sm text-gray-500">
            {suggestion.description}
          </div>
          <button
            onClick={() => onNavigate(suggestion.navSection)}
            className="mt-2 text-xs text-accent transition-colors hover:text-accent-hover"
          >
            Go to {sectionLabel} &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  suggestions,
  onNavigate,
}: {
  category: SuggestionCategory;
  suggestions: Suggestion[];
  onNavigate: (section: NavSection) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="group flex w-full items-center gap-2 py-2 text-left"
      >
        <span
          className="text-xs text-gray-500 transition-transform duration-150"
          style={{
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          &#9654;
        </span>
        <span className="text-sm font-medium text-gray-300 transition-colors group-hover:text-gray-200">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs tabular-nums text-gray-400">
          {suggestions.length}
        </span>
      </button>
      {expanded && (
        <div className="mb-4 ml-5 space-y-2">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SuggestionsBox({
  suggestions,
  onNavigate,
}: SuggestionsBoxProps) {
  // Loading state
  if (suggestions === null) {
    return (
      <div className="mt-8">
        <h3 className="mb-4 text-sm font-medium text-gray-400">Suggestions</h3>
        <SkeletonCards />
      </div>
    );
  }

  // Zero suggestions state
  if (suggestions.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="mb-4 text-sm font-medium text-gray-400">Suggestions</h3>
        <div className="rounded-lg border border-border bg-card p-5 text-center">
          <span className="text-2xl text-green-400">&#10003;</span>
          <p className="mt-2 text-sm font-medium text-green-400">
            Your configuration looks great!
          </p>
        </div>
      </div>
    );
  }

  // Group suggestions by category, preserving defined order
  const grouped = new Map<SuggestionCategory, Suggestion[]>();
  for (const s of suggestions) {
    const list = grouped.get(s.category);
    if (list) {
      list.push(s);
    } else {
      grouped.set(s.category, [s]);
    }
  }

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-sm font-medium text-gray-400">Suggestions</h3>
      <div className="space-y-1">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const categorySuggestions = grouped.get(cat);
          if (!categorySuggestions) return null;
          return (
            <CategoryGroup
              key={cat}
              category={cat}
              suggestions={categorySuggestions}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </div>
  );
}
