import { useState, useEffect, useCallback } from 'react';
import { NavSection } from '@lens/schema';
import type { ConfigSnapshot, Workspace } from '@lens/schema';
import { APP_NAME } from './constants.js';
import { useUniversalSearch } from './hooks/useUniversalSearch.js';
import { SearchPalette } from './components/SearchPalette.js';
import { HeaderSearch } from './components/HeaderSearch.js';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PermissionsPanel } from './components/PermissionsPanel';
import { McpPanel } from './components/McpPanel';
import { HooksPanel } from './components/HooksPanel';
import { SkillsPanel } from './components/SkillsPanel';
import { AgentsPanel } from './components/AgentsPanel';
import { RulesPanel } from './components/RulesPanel';
import { CommandsPanel } from './components/CommandsPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SandboxPanel } from './components/SandboxPanel';
import { ClaudeMdPanel } from './components/ClaudeMdPanel';
import { PluginsPanel } from './components/PluginsPanel';

const NAV_SECTION_VALUES = new Set<string>(Object.values(NavSection));

function sectionFromHash(): NavSection {
  const hash = window.location.hash.slice(1);
  return NAV_SECTION_VALUES.has(hash) ? (hash as NavSection) : NavSection.Overview;
}

export default function App() {
  const [section, setSection] = useState<NavSection>(sectionFromHash);
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInitialQuery, setPaletteInitialQuery] = useState('');
  const [allowGlobalWrites, setAllowGlobalWrites] = useState(false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);

  useEffect(() => { document.title = APP_NAME; }, []);

  const navigate = useCallback((s: NavSection) => {
    setSection(s);
    window.history.pushState(null, '', s === NavSection.Overview ? '/' : `#${s}`);
  }, []);

  // Sync section on browser back/forward
  useEffect(() => {
    function onPopState() { setSection(sectionFromHash()); }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Workspace[] = await res.json();
      setWorkspaces(data);
      // Set active project to first workspace if not yet set
      if (data.length > 0) {
        setActiveProject((prev) => prev ?? data[0].path);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    }
  }, []);

  const fetchConfig = useCallback((projectPath?: string) => {
    const project = projectPath ?? activeProject;
    const url = project ? `/api/config?project=${encodeURIComponent(project)}` : '/api/config';
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ConfigSnapshot) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeProject]);

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Fetch config when active project changes
  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      setError(null);
      fetchConfig(activeProject);
    }
  }, [activeProject, fetchConfig]);

  // SSE: only rescan if the changed project matches the active one
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('config-changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        // Rescan if no projectPath (global change) or if it matches active
        if (!data.projectPath || data.projectPath === activeProject) {
          fetchConfig(activeProject ?? undefined);
        }
      } catch {
        fetchConfig(activeProject ?? undefined);
      }
    });
    return () => { eventSource.close(); };
  }, [fetchConfig, activeProject]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteInitialQuery('');
        setPaletteOpen(true);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const rescan = useCallback(() => {
    fetchConfig(activeProject ?? undefined);
  }, [fetchConfig, activeProject]);

  const toggleGlobalWrites = useCallback(async () => {
    setTogglingGlobal(true);
    try {
      const next = !allowGlobalWrites;
      const res = await fetch('/api/global-writes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        setAllowGlobalWrites(next);
        fetchConfig(activeProject ?? undefined);
      }
    } finally {
      setTogglingGlobal(false);
    }
  }, [allowGlobalWrites, fetchConfig, activeProject]);

  // Keep a ref to workspaces/activeProject for use in keyboard handler

  const { search } = useUniversalSearch(config);

  const handleNavigateToResult = useCallback((targetSection: NavSection, scrollId?: string) => {
    navigate(targetSection);
    if (!scrollId) return;
    setTimeout(() => {
      const el = document.getElementById(scrollId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.setAttribute('data-search-highlight', '1');
      setTimeout(() => el.removeAttribute('data-search-highlight'), 1200);
    }, 80);
  }, [navigate]);

  function handleSelectWorkspace(path: string) {
    setActiveProject(path);
  }

  async function handleAddWorkspace(path: string): Promise<string | null> {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) {
        const data = await res.json();
        const message = (data as { error?: string }).error ?? `HTTP ${res.status}`;
        return message;
      }
      await fetchWorkspaces();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to add workspace';
    }
  }

  async function handleRemoveWorkspace(name: string) {
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) return;
      const updated = workspaces.filter(w => w.name !== name);
      setWorkspaces(updated);
      // If we removed the active workspace, switch to the first remaining
      if (activeProject && workspaces.find(w => w.name === name)?.path === activeProject) {
        setActiveProject(updated[0]?.path ?? null);
      }
    } catch (err) {
      console.error('Failed to remove workspace', err);
    }
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">Loading configuration...</div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
            <h2 className="text-red-400 font-semibold mb-2">Failed to load config</h2>
            <p className="text-red-300/70 text-sm">{error}</p>
          </div>
        </div>
      );
    }
    if (!config) return null;

    switch (section) {
      case NavSection.Overview:
        return <Dashboard config={config} onNavigate={navigate} workspaces={workspaces} activeProject={activeProject ?? ''} onRescan={rescan} />;
      case NavSection.ClaudeMd:
        return <ClaudeMdPanel config={config} onRescan={rescan} />;
      case NavSection.Settings:
        return <SettingsPanel config={config} onRescan={rescan} />;
      case NavSection.Permissions:
        return <PermissionsPanel config={config} onRescan={rescan} />;
      case NavSection.Mcp:
        return <McpPanel config={config} onRescan={rescan} workspaces={workspaces} activeProject={activeProject ?? ''} />;
      case NavSection.Hooks:
        return <HooksPanel config={config} onRescan={rescan} />;
      case NavSection.Skills:
        return <SkillsPanel config={config} onRescan={rescan} />;
      case NavSection.Agents:
        return <AgentsPanel config={config} onRescan={rescan} />;
      case NavSection.Rules:
        return <RulesPanel config={config} onRescan={rescan} />;
      case NavSection.Commands:
        return <CommandsPanel config={config} onRescan={rescan} />;
      case NavSection.Memory:
        return <MemoryPanel config={config} onRescan={rescan} />;
      case NavSection.Plugins:
        return <PluginsPanel config={config} onRescan={rescan} />;
      case NavSection.Sandbox:
        return <SandboxPanel config={config} onRescan={rescan} />;
    }
  }

  return (
    <div className="min-h-screen bg-bg text-white flex">
      <Sidebar
        active={section}
        onNavigate={navigate}
        config={config}
        workspaces={workspaces}
        activeProject={activeProject}
        onSelectWorkspace={handleSelectWorkspace}
        onAddWorkspace={handleAddWorkspace}
        onRemoveWorkspace={handleRemoveWorkspace}
      />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex items-center gap-4 px-6 pt-4 pb-2">
          <HeaderSearch
            search={search}
            onNavigate={handleNavigateToResult}
            onOpenPalette={(initialQuery) => {
              setPaletteInitialQuery(initialQuery ?? '');
              setPaletteOpen(true);
            }}
          />
          <button
            onClick={toggleGlobalWrites}
            disabled={togglingGlobal}
            title={allowGlobalWrites ? 'Global config: editable — click to make read-only' : 'Global config: read-only — click to enable editing'}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 ${allowGlobalWrites ? 'bg-amber-500/10' : ''}`}
          >
            <span className={`text-xs font-medium transition-colors ${allowGlobalWrites ? 'text-amber-400' : 'text-gray-500'}`}>
              {allowGlobalWrites ? 'Global writes ON' : 'Global writes OFF'}
            </span>
            {/* Track */}
            <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors duration-200 ${
              allowGlobalWrites ? 'bg-amber-500/70 border-amber-400/50' : 'bg-white/10 border-white/10'
            }`}>
              {/* Thumb */}
              <span className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 self-center ${
                allowGlobalWrites ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </span>
          </button>
        </div>
        <div className="flex-1 p-6">
          {renderContent()}
        </div>
      </main>
      <SearchPalette
        open={paletteOpen}
        initialQuery={paletteInitialQuery}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigateToResult}
        search={search}
        workspaces={workspaces}
        activeProject={activeProject}
        onSelectWorkspace={handleSelectWorkspace}
      />
    </div>
  );
}
