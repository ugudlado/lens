import { useState, useRef, useEffect } from 'react';
import type { NavSection } from '@lens/schema';
import type { SearchResult } from '../hooks/useUniversalSearch.js';

interface Props {
  search: (query: string) => SearchResult[];
  onNavigate: (section: NavSection, scrollId?: string) => void;
  onOpenPalette: (initialQuery?: string) => void;
}

const SCOPE_COLORS: Record<string, string> = {
  global: 'text-blue-400',
  project: 'text-green-400',
  local: 'text-yellow-400',
  managed: 'text-gray-500',
  'n/a': 'text-gray-600',
};

export function HeaderSearch({ search, onNavigate, onOpenPalette }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim() ? search(query).slice(0, 5) : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(result: SearchResult) {
    onNavigate(result.section, result.scrollId);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setQuery(''); setOpen(false); }
    if (e.key === 'Enter' && results[0]) { handleSelect(results[0]); }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (!query) onOpenPalette(); }}
          onKeyDown={handleKeyDown}
          placeholder="Search… (⌘K)"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[#0f0f1a] border border-white/10 rounded-lg shadow-2xl z-40 overflow-hidden">
          {results.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-2.5">No results</p>
          ) : (
            results.map(result => (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-100 font-medium truncate">{result.label}</span>
                    <span className="text-xs text-gray-600 flex-shrink-0">·</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{result.sectionLabel}</span>
                    {result.scope !== 'n/a' && (
                      <span className={`text-xs flex-shrink-0 ${SCOPE_COLORS[result.scope] ?? ''}`}>{result.scope}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{result.preview}</p>
                </div>
              </div>
            ))
          )}
          {results.length === 5 && (
            <div
              className="px-3 py-1.5 text-xs text-accent cursor-pointer hover:bg-white/5 border-t border-white/5"
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
