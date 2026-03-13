import { useState } from "react";
import { ConfigScope } from "@lens/schema";
import type { ConfigSnapshot } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator";
import { EditableContent } from "./EditableContent";
import { RawJsonView } from "./RawJsonView";
import { useConfigUpdate } from "../hooks/useConfigUpdate";
import { PanelShell, PanelRow, PanelEmpty } from "./panel/index.js";
import { slug } from "../constants.js";

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

const SCOPE_ORDER = [
  ConfigScope.Local,
  ConfigScope.Project,
  ConfigScope.Global,
  ConfigScope.Managed,
];

interface MissingScope {
  scope: ConfigScope.Global | ConfigScope.Project;
  filePath: string;
  label: string;
  initialContent: string;
}

export function ClaudeMdPanel({ config, onRescan }: Props) {
  const { files } = config.claudeMd;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"effective" | "json">("effective");
  const [jumpTarget, setJumpTarget] = useState<{
    filePath: string;
    key: string;
  } | null>(null);
  const { update, saving, error } = useConfigUpdate(onRescan);

  function jumpToFile(scope: string, filePath: string) {
    setJumpTarget({ filePath, key: scope });
    setView("json");
  }

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Sort by scope load order
  const sorted = [...files].sort((a, b) => {
    return SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope);
  });

  // Compute which scopes are missing (excluding managed — never user-created)
  const existingScopes = new Set(files.map((f) => f.scope));
  const missingScopes: MissingScope[] = [];
  if (!existingScopes.has(ConfigScope.Global)) {
    missingScopes.push({
      scope: ConfigScope.Global,
      filePath: `${config.globalPath}/CLAUDE.md`,
      label: "Create global CLAUDE.md",
      initialContent: "# CLAUDE.md\n\nProject instructions for Claude Code.\n",
    });
  }
  if (!existingScopes.has(ConfigScope.Project)) {
    missingScopes.push({
      scope: ConfigScope.Project,
      filePath: `${config.projectPath}/CLAUDE.md`,
      label: "Create project CLAUDE.md",
      initialContent: "# CLAUDE.md\n\nProject instructions for Claude Code.\n",
    });
  }

  function handleCreate(missing: MissingScope) {
    void update({
      surface: "claude-md",
      scope: missing.scope,
      filePath: missing.filePath,
      value: missing.initialContent,
    });
  }

  const createSection =
    missingScopes.length > 0 ? (
      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          {missingScopes.map((ms) => (
            <button
              key={ms.scope}
              onClick={() => handleCreate(ms)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-gray-300 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={ms.filePath}
            >
              <span className="font-bold text-accent">+</span>
              {ms.label}
              <span className="ml-1 hidden font-mono text-xs text-gray-600 sm:inline">
                {ms.filePath}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    ) : null;

  if (files.length === 0) {
    return (
      <PanelShell title="CLAUDE.md">
        <PanelEmpty>No CLAUDE.md files found</PanelEmpty>
        {createSection}
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="CLAUDE.md"
      subtitle={`${files.length} file${files.length !== 1 ? "s" : ""} loaded in order: managed, global, project, local`}
      view={view}
      onViewChange={(v) => {
        setView(v as "effective" | "json");
        if (v === "effective") setJumpTarget(null);
      }}
      viewOptions={[
        {
          value: "effective",
          label: "Effective",
          title: "Merged view of all active config across scopes",
        },
        {
          value: "json",
          label: "Files",
          title: "Per-file breakdown showing which scope defines each value",
        },
      ]}
    >
      <p className="mb-6 text-xs text-gray-600">
        Files are loaded in scope order and concatenated into the system prompt
      </p>

      {view === "json" ? (
        <RawJsonView
          files={files.map((f) => ({ scope: f.scope, filePath: f.filePath }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((file, i) => {
            const isExpanded = expanded.has(i);
            return (
              <PanelRow
                key={i}
                label={`claude-md-${slug(file.scope)}`}
                expanded={isExpanded}
                onToggle={() => toggle(i)}
                trigger={
                  <>
                    <ScopeIndicator scope={file.scope} />
                    <span className="flex-1 truncate text-left font-mono text-sm text-gray-300">
                      {file.filePath}
                    </span>
                    <span className="rounded bg-bg px-2 py-0.5 text-xs text-gray-500">
                      {file.lineCount} lines
                    </span>
                    {file.isLocal && (
                      <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                        Local
                      </span>
                    )}
                  </>
                }
                actions={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToFile(file.scope, file.filePath);
                    }}
                    className="shrink-0 text-xs text-gray-600 transition-colors hover:text-accent"
                    title="Jump to file"
                  >
                    ↗
                  </button>
                }
              >
                <div
                  id={`claude-md-${slug(file.scope)}`}
                  className="border-t border-border px-4 py-3"
                >
                  <pre className="max-h-[60vh] overflow-x-auto overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
                    {file.content}
                  </pre>
                  <EditableContent
                    content={file.content}
                    filePath={file.filePath}
                    scope={file.scope}
                    surface="claude-md"
                    onRescan={onRescan}
                  />
                </div>
              </PanelRow>
            );
          })}
        </div>
      )}
      {createSection}
    </PanelShell>
  );
}
