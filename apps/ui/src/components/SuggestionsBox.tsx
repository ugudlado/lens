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
  activeProject?: string;
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

type FixState = "idle" | "loading" | "error";

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
  activeProject,
  onDismiss,
}: {
  suggestion: Suggestion;
  onNavigate: (section: NavSection) => void;
  activeProject?: string;
  onDismiss: (id: string) => void;
}) {
  const [fixState, setFixState] = useState<FixState>("idle");
  const [fixError, setFixError] = useState<string | null>(null);

  const isWarning = suggestion.severity === SuggestionSeverity.Warning;
  const sectionLabel =
    NAV_LABELS[suggestion.navSection] ?? suggestion.navSection;

  async function handleFix() {
    setFixState("loading");
    setFixError(null);
    try {
      const url = activeProject
        ? `/api/suggestions/${encodeURIComponent(suggestion.id)}/fix?project=${encodeURIComponent(activeProject)}`
        : `/api/suggestions/${encodeURIComponent(suggestion.id)}/fix`;
      const res = await fetch(url, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        onDismiss(suggestion.id);
      } else {
        setFixState("error");
        setFixError(data.error ?? "Fix failed");
      }
    } catch {
      setFixState("error");
      setFixError("Network error");
    }
  }

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-xs transition-all hover:border-accent/50 hover:bg-card/80">
      <span
        className={`flex-shrink-0 ${isWarning ? "text-amber-400" : "text-blue-400"
          }`}
      >
        {isWarning ? "\u26A0" : "\u2139"}
      </span>
      <span className="text-gray-200">{suggestion.title}</span>
      <span className="text-gray-500">—</span>
      <span className="text-gray-400">{suggestion.description}</span>
      <button
        onClick={() => onNavigate(suggestion.navSection)}
        className="ml-auto flex-shrink-0 text-accent transition-colors hover:text-accent-hover"
      >
        {sectionLabel} &rarr;
      </button>
    </div>
  );
}

function CategoryGroup({
  category,
  suggestions,
  onNavigate,
  activeProject,
  dismissed,
  onDismiss,
}: {
  category: SuggestionCategory;
  suggestions: Suggestion[];
  onNavigate: (section: NavSection) => void;
  activeProject?: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const visible = suggestions.filter((s) => !dismissed.has(s.id));
  if (visible.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="group flex w-full cursor-pointer items-center gap-3 border-l-2 border-l-amber-500/30 px-3 py-1.5 text-left transition-all hover:bg-amber-500/5 hover:bg-slate-800/40"
      >
        <span
          className="text-xs text-slate-500 transition-transform duration-150"
          style={{
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          &#9654;
        </span>
        <span className="text-sm font-medium text-white">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="ml-auto text-sm text-slate-400">
          {suggestions.length}
        </span>
      </button>
      {expanded && (
        <div className="mb-4 ml-5 space-y-1">
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
  activeProject,
}: SuggestionsBoxProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  // Loading state
  if (suggestions === null) {
    return (
      <div className="mt-8">
        <h3 className="mb-4 text-sm font-medium text-gray-400">Suggestions</h3>
        <SkeletonCards />
      </div>
    );
  }

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  // Zero suggestions state
  if (visibleSuggestions.length === 0) {
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
  );
}
