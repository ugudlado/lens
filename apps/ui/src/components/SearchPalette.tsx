import { useState, useEffect, useRef, useCallback } from 'react';
import type { NavSection, Workspace } from '@lens/schema';
import type { SearchResult } from '../hooks/useUniversalSearch.js';

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
  global: 'bg-blue-500/20 text-blue-400',
  project: 'bg-green-500/20 text-green-400',
  local: 'bg-yellow-500/20 text-yellow-400',
  managed: 'bg-gray-500/20 text-gray-400',
  'n/a': 'bg-gray-500/10 text-gray-600',
};

interface WorkspaceItem {
  kind: 'workspace';
  path: string;
  name: string;
  isActive: boolean;
  idx: number;
}

interface ConfigItem extends SearchResult {
  kind: 'config';
  idx: number;
}

type AnyItem = WorkspaceItem | ConfigItem;

export function SearchPalette({ open, initialQuery, onClose, onNavigate, search, workspaces, activeProject, onSelectWorkspace }: Props) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const configResults = query.trim() ? search(query).slice(0, 18) : [];

  // Workspace results: filter by query, exclude active
  const wsResults: WorkspaceItem[] = (() => {
    if (!workspaces || !onSelectWorkspace) return [];
    const q = query.trim().toLowerCase();
    return workspaces
      .filter(w => !q || w.name.toLowerCase().includes(q) || w.path.toLowerCase().includes(q))
      .map((w, i) => ({ kind: 'workspace' as const, path: w.path, name: w.name, isActive: w.path === activeProject, idx: i }));
  })();

  // Flat list: workspaces first, then config results
  const allItems: AnyItem[] = [
    ...wsResults.map((w, i) => ({ ...w, idx: i })),
    ...configResults.map((r, i) => ({ ...r, kind: 'config' as const, idx: wsResults.length + i })),
  ];
  const totalCount = allItems.length;

  useEffect(() => {
    if (open) {
      setQuery(initialQuery ?? '');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelectConfig = useCallback((result: SearchResult) => {
    onNavigate(result.section, result.scrollId);
    onClose();
    setQuery('');
  }, [onNavigate, onClose]);

  const handleSelectWorkspace = useCallback((path: string) => {
    onSelectWorkspace?.(path);
    onClose();
    setQuery('');
  }, [onSelectWorkspace, onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, totalCount - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[activeIdx]) {
      const item = allItems[activeIdx];
      if (item.kind === 'workspace') handleSelectWorkspace(item.path);
      else handleSelectConfig(item);
    }
  }

  const grouped: Record<string, { label: string; items: ConfigItem[] }> = {};
  configResults.forEach((r, i) => {
    const idx = wsResults.length + i;
    if (!grouped[r.section]) grouped[r.section] = { label: r.sectionLabel, items: [] };
    grouped[r.section].items.push({ ...r, kind: 'config', idx });
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl mx-4 bg-[#0f0f1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search config — MCP servers, hooks, skills, settings..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none"
          />
          <kbd className="text-xs text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {query.trim() && totalCount === 0 && (
            <p className="text-sm text-gray-600 px-4 py-6 text-center">No results for &ldquo;{query}&rdquo;</p>
          )}
          {!query.trim() && wsResults.length === 0 && (
            <p className="text-xs text-gray-600 px-4 py-4 text-center">Type to search across all config surfaces</p>
          )}
          {wsResults.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white/[0.02]">
                Workspaces
              </div>
              {wsResults.map(ws => (
                <div
                  key={ws.path}
                  data-idx={ws.idx}
                  onClick={() => handleSelectWorkspace(ws.path)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    ws.idx === activeIdx ? 'bg-accent/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${ws.isActive ? 'text-accent' : 'text-gray-100'}`}>{ws.name}</span>
                      {ws.isActive && <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent/70 flex-shrink-0">active</span>}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{ws.path}</p>
                  </div>
                  {ws.idx === activeIdx && (
                    <kbd className="text-xs text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono flex-shrink-0">↵</kbd>
                  )}
                </div>
              ))}
            </div>
          )}
          {Object.entries(grouped).map(([section, group]) => (
            <div key={section}>
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white/[0.02]">
                {group.label}
              </div>
              {group.items.map(result => (
                <div
                  key={result.id}
                  data-idx={result.idx}
                  onClick={() => handleSelectConfig(result)}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    result.idx === activeIdx ? 'bg-accent/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-100 font-medium truncate">{result.label}</span>
                      {result.scope !== 'n/a' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${SCOPE_COLORS[result.scope] ?? SCOPE_COLORS.global}`}>
                          {result.scope}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{result.preview}</p>
                  </div>
                  {result.idx === activeIdx && (
                    <kbd className="text-xs text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono flex-shrink-0 self-center">↵</kbd>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {totalCount > 0 && (
          <div className="border-t border-white/10 px-4 py-2 flex items-center gap-4 text-xs text-gray-600">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
