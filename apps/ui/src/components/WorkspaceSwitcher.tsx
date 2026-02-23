import { useState, useRef, useEffect } from 'react';
import type { Workspace } from '@lens/schema';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeProject: string | null;
  onSelect: (path: string) => void;
  onAdd: (path: string) => Promise<string | null>;
  onRemove: (name: string) => void;
}

export function WorkspaceSwitcher({ workspaces, activeProject, onSelect, onAdd, onRemove }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeWs = workspaces.find(w => w.path === activeProject);

  const filteredWorkspaces = searchQuery.trim()
    ? workspaces.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : workspaces;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setSearchQuery(''); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 10);
    else setSearchQuery('');
  }, [open]);

  async function handleAdd() {
    if (!newPath.trim()) return;
    setAddError(null);
    const error = await onAdd(newPath.trim());
    if (error) {
      setAddError(error);
      return;
    }
    setNewPath('');
    setShowAdd(false);
  }

  function handleSelect(path: string) {
    onSelect(path);
    setOpen(false);
    setSearchQuery('');
  }

  return (
    <div className="px-3 py-3 border-b border-border relative" ref={dropdownRef}>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block">
        Workspace
      </label>

      {/* Dropdown trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded border text-xs transition-colors text-left ${
          open
            ? 'bg-bg border-accent/50 text-gray-200'
            : 'bg-bg border-border text-gray-200 hover:border-accent/30'
        }`}
      >
        <span className="flex-1 truncate font-medium">{activeWs?.name ?? '—'}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearchQuery(''); }
                if (e.key === 'Enter' && filteredWorkspaces.length === 1) handleSelect(filteredWorkspaces[0].path);
              }}
              placeholder="Search workspaces..."
              className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
            )}
          </div>

          {/* Workspace list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredWorkspaces.length === 0 && (
              <p className="text-xs text-gray-600 px-3 py-3 text-center">No workspaces match &ldquo;{searchQuery}&rdquo;</p>
            )}
            {filteredWorkspaces.map((ws) => {
              const isActive = ws.path === activeProject;
              return (
                <div key={ws.path} className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isActive ? 'bg-accent/10' : 'hover:bg-white/5'
                }`}>
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => handleSelect(ws.path)}
                  >
                    <div className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-gray-200'}`}>
                      {ws.name}
                      {isActive && <span className="ml-1.5 text-[10px] text-accent/60">active</span>}
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 truncate mt-0.5">{ws.path}</div>
                  </button>
                  {workspaces.length > 1 && (
                    confirmRemoveId === ws.name ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] text-red-400">Remove?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(ws.name); setConfirmRemoveId(null); setOpen(false); }}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >Yes</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(null); }}
                          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(ws.name); }}
                        className="flex-shrink-0 text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove workspace"
                      >✕</button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Add workspace */}
          <div className="border-t border-border">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-accent hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <span className="text-gray-600">+</span> Add workspace
              </button>
            ) : (
              <div className="px-3 py-2.5 space-y-2">
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setNewPath(''); } }}
                  placeholder="/path/to/repo"
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
                  autoFocus
                />
                {addError && <p className="text-red-400 text-xs">{addError}</p>}
                <div className="flex gap-1.5">
                  <button onClick={handleAdd} className="px-2.5 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors">Add</button>
                  <button onClick={() => { setShowAdd(false); setNewPath(''); setAddError(null); }} className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove confirm for active workspace when dropdown is closed */}
      {!open && !showAdd && workspaces.length > 1 && activeWs && confirmRemoveId === activeWs.name && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-400">Remove?</span>
          <button onClick={() => { onRemove(activeWs.name); setConfirmRemoveId(null); }} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">Yes</button>
          <button onClick={() => setConfirmRemoveId(null)} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">No</button>
        </div>
      )}
    </div>
  );
}
