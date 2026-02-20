import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { EditableContent } from './EditableContent';
import { RawJsonView } from './RawJsonView';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { PanelShell, PanelRow, PanelEmpty } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

const SCOPE_ORDER = [ConfigScope.Local, ConfigScope.Project, ConfigScope.Global, ConfigScope.Managed];

interface MissingScope {
  scope: ConfigScope.Global | ConfigScope.Project;
  filePath: string;
  label: string;
  initialContent: string;
}

export function ClaudeMdPanel({ config, onRescan }: Props) {
  const { files } = config.claudeMd;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);
  const { update, saving, error } = useConfigUpdate(onRescan);

  function jumpToFile(scope: string, filePath: string) {
    setJumpTarget({ filePath, key: scope });
    setView('json');
  }

  const toggle = (idx: number) => {
    setExpanded(prev => {
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
  const existingScopes = new Set(files.map(f => f.scope));
  const missingScopes: MissingScope[] = [];
  if (!existingScopes.has(ConfigScope.Global)) {
    missingScopes.push({
      scope: ConfigScope.Global,
      filePath: `${config.globalPath}/CLAUDE.md`,
      label: 'Create global CLAUDE.md',
      initialContent: '# CLAUDE.md\n\nProject instructions for Claude Code.\n',
    });
  }
  if (!existingScopes.has(ConfigScope.Project)) {
    missingScopes.push({
      scope: ConfigScope.Project,
      filePath: `${config.projectPath}/CLAUDE.md`,
      label: 'Create project CLAUDE.md',
      initialContent: '# CLAUDE.md\n\nProject instructions for Claude Code.\n',
    });
  }


  function handleCreate(missing: MissingScope) {
    update({
      surface: 'claude-md',
      scope: missing.scope,
      filePath: missing.filePath,
      value: missing.initialContent,
    });
  }

  const createSection = missingScopes.length > 0 ? (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {missingScopes.map(ms => (
          <button
            key={ms.scope}
            onClick={() => handleCreate(ms)}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-gray-300 hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={ms.filePath}
          >
            <span className="text-accent font-bold">+</span>
            {ms.label}
            <span className="text-xs text-gray-600 font-mono ml-1 hidden sm:inline">{ms.filePath}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
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
      subtitle={`${files.length} file${files.length !== 1 ? 's' : ''} loaded in order: managed, global, project, local`}
      view={view}
      onViewChange={(v) => { setView(v as 'effective' | 'json'); if (v === 'effective') setJumpTarget(null); }}
      viewOptions={[{ value: 'effective', label: 'Effective' }, { value: 'json', label: 'Files' }]}
    >
      <p className="text-xs text-gray-600 mb-6">Files are loaded in scope order and concatenated into the system prompt</p>

      {view === 'json' ? (
        <RawJsonView files={files.map(f => ({ scope: f.scope, filePath: f.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
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
                  <span className="text-sm font-mono text-gray-300 truncate flex-1 text-left">{file.filePath}</span>
                  <span className="text-xs text-gray-500 bg-bg px-2 py-0.5 rounded">
                    {file.lineCount} lines
                  </span>
                  {file.isLocal && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                      Local
                    </span>
                  )}
                </>
              }
              actions={
                <button
                  onClick={(e) => { e.stopPropagation(); jumpToFile(file.scope, file.filePath); }}
                  className="text-xs text-gray-600 hover:text-accent transition-colors shrink-0"
                  title="Jump to file"
                >
                  ↗
                </button>
              }
            >
              <div id={`claude-md-${slug(file.scope)}`} className="border-t border-border px-4 py-3">
                <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto">
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
