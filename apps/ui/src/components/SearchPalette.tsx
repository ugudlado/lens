import { useState, useEffect, useRef, useCallback } from "react";
import type { NavSection, Workspace } from "@lens/schema";
import type { SearchResult } from "../hooks/useUniversalSearch.js";

interface Props {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onNavigate: (section: NavSection, scrollId?: string) => void;
  search: (query: string) => SearchResult[];
  workspaces?: Workspace[];
  activeProject?: string | null;
  onSelectWorkspace?: (path: string) => void;
}

const SCOPE_COLORS: Record<string, string> = {
  global: "bg-sky-500/20 text-sky-400",
  project: "bg-teal-500/20 text-teal-400",
  local: "bg-amber-500/20 text-amber-400",
  managed: "bg-rose-500/20 text-rose-400",
  "n/a": "bg-stone-500/10 text-stone-600",
};

interface WorkspaceItem {
  kind: "workspace";
  path: string;
  name: string;
  isActive: boolean;
  idx: number;
}

interface ConfigItem extends SearchResult {
  kind: "config";
  idx: number;
}

type AnyItem = WorkspaceItem | ConfigItem;

export function SearchPalette({
  open,
  initialQuery,
  onClose,
  onNavigate,
  search,
  workspaces,
  activeProject,
  onSelectWorkspace,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const configResults = query.trim() ? search(query).slice(0, 18) : [];

  // Workspace results: filter by query, exclude active
  const wsResults: WorkspaceItem[] = (() => {
    if (!workspaces || !onSelectWorkspace) return [];
    const q = query.trim().toLowerCase();
    return workspaces
      .filter(
        (w) =>
          !q ||
          w.name.toLowerCase().includes(q) ||
          w.path.toLowerCase().includes(q),
      )
      .map((w, i) => ({
        kind: "workspace" as const,
        path: w.path,
        name: w.name,
        isActive: w.path === activeProject,
        idx: i,
      }));
  })();

  // Flat list: workspaces first, then config results
  const allItems: AnyItem[] = [
    ...wsResults.map((w, i) => ({ ...w, idx: i })),
    ...configResults.map((r, i) => ({
      ...r,
      kind: "config" as const,
      idx: wsResults.length + i,
    })),
  ];
  const totalCount = allItems.length;

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setQuery(initialQuery ?? "");
        setActiveIdx(0);
      });
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleSelectConfig = useCallback(
    (result: SearchResult) => {
      onNavigate(result.section, result.scrollId);
      onClose();
      setQuery("");
    },
    [onNavigate, onClose],
  );

  const handleSelectWorkspace = useCallback(
    (path: string) => {
      onSelectWorkspace?.(path);
      onClose();
      setQuery("");
    },
    [onSelectWorkspace, onClose],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalCount - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && allItems[activeIdx]) {
      const item = allItems[activeIdx];
      if (item.kind === "workspace") handleSelectWorkspace(item.path);
      else handleSelectConfig(item);
    }
  }

  const grouped: Record<string, { label: string; items: ConfigItem[] }> = {};
  configResults.forEach((r, i) => {
    const idx = wsResults.length + i;
    if (!grouped[r.section])
      grouped[r.section] = { label: r.sectionLabel, items: [] };
    grouped[r.section].items.push({ ...r, kind: "config", idx });
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative mx-4 w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#0f0f1a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search config — MCP servers, hooks, skills, settings..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-600">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {query.trim() && totalCount === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-600">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {!query.trim() && wsResults.length === 0 && (
            <p className="px-4 py-4 text-center text-xs text-gray-600">
              Type to search across all config surfaces
            </p>
          )}
          {wsResults.length > 0 && (
            <div>
              <div className="bg-white/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                Workspaces
              </div>
              {wsResults.map((ws) => (
                <div
                  key={ws.path}
                  data-idx={ws.idx}
                  onClick={() => handleSelectWorkspace(ws.path)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                    ws.idx === activeIdx ? "bg-accent/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-medium ${ws.isActive ? "text-accent" : "text-gray-100"}`}
                      >
                        {ws.name}
                      </span>
                      {ws.isActive && (
                        <span className="flex-shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent/70">
                          active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                      {ws.path}
                    </p>
                  </div>
                  {ws.idx === activeIdx && (
                    <kbd className="flex-shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      ↵
                    </kbd>
                  )}
                </div>
              ))}
            </div>
          )}
          {Object.entries(grouped).map(([section, group]) => (
            <div key={section}>
              <div className="bg-white/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                {group.label}
              </div>
              {group.items.map((result) => (
                <div
                  key={result.id}
                  data-idx={result.idx}
                  onClick={() => handleSelectConfig(result)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors ${
                    result.idx === activeIdx
                      ? "bg-accent/15"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-100">
                        {result.label}
                      </span>
                      {result.scope !== "n/a" && (
                        <span
                          className={`flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${SCOPE_COLORS[result.scope] ?? SCOPE_COLORS.global}`}
                        >
                          {result.scope}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {result.preview}
                    </p>
                  </div>
                  {result.idx === activeIdx && (
                    <kbd className="flex-shrink-0 self-center rounded border border-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      ↵
                    </kbd>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-xs text-gray-600">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> select
            </span>
            <span>
              <kbd className="font-mono">esc</kbd> close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
