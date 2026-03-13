import { useState, useRef, useEffect } from "react";
import type { NavSection } from "@lens/schema";
import type { SearchResult } from "../hooks/useUniversalSearch.js";

interface Props {
  search: (query: string) => SearchResult[];
  onNavigate: (section: NavSection, scrollId?: string) => void;
  onOpenPalette: (initialQuery?: string) => void;
}

const SCOPE_COLORS: Record<string, string> = {
  global: "text-sky-400",
  project: "text-teal-400",
  local: "text-amber-400",
  managed: "text-rose-400",
  "n/a": "text-gray-600",
};

export function HeaderSearch({ search, onNavigate, onOpenPalette }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim() ? search(query).slice(0, 5) : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(result: SearchResult) {
    onNavigate(result.section, result.scrollId);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
    }
    if (e.key === "Enter" && results[0]) {
      handleSelect(results[0]);
    }
  }

  return (
    <div ref={containerRef} className="relative max-w-sm flex-1">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
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
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!query) onOpenPalette();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search… (⌘K)"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-sm text-gray-300 transition-colors placeholder:text-gray-500 focus:border-accent/50 focus:outline-none"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-600">No results</p>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                className="flex cursor-pointer items-start gap-2 px-3 py-2 transition-colors hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-gray-100">
                      {result.label}
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-600">
                      ·
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {result.sectionLabel}
                    </span>
                    {result.scope !== "n/a" && (
                      <span
                        className={`flex-shrink-0 text-xs ${SCOPE_COLORS[result.scope] ?? ""}`}
                      >
                        {result.scope}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-600">
                    {result.preview}
                  </p>
                </div>
              </div>
            ))
          )}
          {results.length === 5 && (
            <div
              className="cursor-pointer border-t border-white/5 px-3 py-1.5 text-xs text-accent hover:bg-white/5"
              onClick={() => onOpenPalette(query)}
            >
              See all results (⌘K)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
