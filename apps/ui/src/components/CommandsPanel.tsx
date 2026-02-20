import { useState } from 'react';
import { ConfigScope, EntrySource } from '@lens/schema';
import type { ConfigSnapshot } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { EditableContent } from './EditableContent';
import { RawJsonView } from './RawJsonView';
import { SearchBar } from './SearchBar';
import { SourceBadge } from './SourceBadge.js';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { useFileDelete } from '../hooks/useFileDelete';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { PanelShell, PanelRow, PanelEmpty } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}


export function CommandsPanel({ config, onRescan }: Props) {
  const { commands } = config.commands;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);
  const [search, setSearch] = useState('');

  const { update, saving } = useConfigUpdate(onRescan);
  const { deleteFile, deleting } = useFileDelete(onRescan);

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setView('json');
  }

  const filteredCommands = commands.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q)
      || c.content.toLowerCase().includes(q);
  }).sort((a, b) => {
    // Custom before plugin
    const aPlugin = a.pluginName ? 1 : 0;
    const bPlugin = b.pluginName ? 1 : 0;
    if (aPlugin !== bPlugin) return aPlugin - bPlugin;
    // Within each group: local → project → global → managed, then name
    const SCOPE_ORDER: Record<string, number> = { local: 0, project: 1, global: 2, managed: 3 };
    const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
    return sd !== 0 ? sd : a.name.localeCompare(b.name);
  });

  function getScopeOptions(cmd: typeof commands[number]) {
    if (cmd.source === EntrySource.Plugin || cmd.scope === ConfigScope.Managed) return [];
    if (cmd.scope === ConfigScope.Project) {
      return config.allowGlobalWrites ? [{
        label: 'Global',
        scope: ConfigScope.Global,
        onCopy: async () => {
          const res = await fetch(`/api/file?path=${encodeURIComponent(cmd.filePath)}`);
          const { content } = await res.json();
          await update({ surface: 'commands', scope: ConfigScope.Global, filePath: `${config.globalPath}/commands/${cmd.name}.md`, value: content });
        },
        onMove: async () => {
          const res = await fetch(`/api/file?path=${encodeURIComponent(cmd.filePath)}`);
          const { content } = await res.json();
          await update({ surface: 'commands', scope: ConfigScope.Global, filePath: `${config.globalPath}/commands/${cmd.name}.md`, value: content });
          await deleteFile(cmd.filePath);
        },
      }] : [];
    }
    if (cmd.scope === ConfigScope.Global) {
      return [{
        label: 'Project',
        scope: ConfigScope.Project,
        onCopy: async () => {
          const res = await fetch(`/api/file?path=${encodeURIComponent(cmd.filePath)}`);
          const { content } = await res.json();
          await update({ surface: 'commands', scope: ConfigScope.Project, filePath: `${config.projectPath}/.claude/commands/${cmd.name}.md`, value: content });
        },
        onMove: config.allowGlobalWrites ? async () => {
          const res = await fetch(`/api/file?path=${encodeURIComponent(cmd.filePath)}`);
          const { content } = await res.json();
          await update({ surface: 'commands', scope: ConfigScope.Project, filePath: `${config.projectPath}/.claude/commands/${cmd.name}.md`, value: content });
          await deleteFile(cmd.filePath);
        } : undefined,
      }];
    }
    return [];
  }

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <PanelShell
      title="Commands"
      subtitle={`${commands.length} command${commands.length !== 1 ? 's' : ''} configured`}
      view={view}
      onViewChange={(v) => { setView(v as 'effective' | 'json'); if (v === 'effective') setJumpTarget(null); }}
      viewOptions={[{ value: 'effective', label: 'Effective' }, { value: 'json', label: 'Files' }]}
    >
      {view === 'json' ? (
        <RawJsonView files={commands.map(c => ({ scope: c.scope, filePath: c.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : commands.length === 0 ? (
        <PanelEmpty>No custom commands configured</PanelEmpty>
      ) : (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search commands..." itemCount={commands.length} filteredCount={filteredCommands.length} />
          <div className="space-y-3">
            {filteredCommands.map((cmd, i) => {
              const isExpanded = expanded.has(i);
              const lines = cmd.content.split('\n');
              const previewLines = lines.slice(0, 10);
              const remaining = lines.length - 10;

              return (
                <PanelRow
                  key={i}
                  label={`/${cmd.name}`}
                  expanded={isExpanded}
                  onToggle={() => toggle(i)}
                  trigger={
                    <>
                      <code className="font-medium text-accent">/{cmd.name}</code>
                      <ScopeIndicator scope={cmd.scope} />
                      <SourceBadge pluginName={cmd.pluginName} />
                      {cmd.supersededBySkill && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                          Superseded by Skill
                        </span>
                      )}
                    </>
                  }
                  actions={
                    cmd.source !== EntrySource.Plugin && cmd.scope !== ConfigScope.Managed ? (
                      <ScopeMoveButton options={getScopeOptions(cmd)} saving={saving || deleting} />
                    ) : undefined
                  }
                >
                  <div id={`command-${slug(cmd.name)}-${cmd.scope}`} className="border-t border-border px-4 py-3">
                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {previewLines.join('\n')}
                    </pre>
                    {remaining > 0 && (
                      <div className="mt-2 text-xs text-gray-500">... {remaining} more lines</div>
                    )}
                    <button
                      onClick={() => jumpToFile(cmd.name, cmd.filePath)}
                      className="mt-3 text-xs text-gray-600 font-mono truncate hover:text-accent transition-colors block"
                      title={cmd.filePath}
                    >
                      {cmd.filePath} ↗
                    </button>
                    {cmd.source !== EntrySource.Plugin && cmd.scope !== ConfigScope.Managed && (
                      <EditableContent
                        content={cmd.content}
                        filePath={cmd.filePath}
                        scope={cmd.scope}
                        surface="commands"
                        onRescan={onRescan}
                        readOnly={cmd.scope === ConfigScope.Global && !config.allowGlobalWrites}
                      />
                    )}
                  </div>
                </PanelRow>
              );
            })}
          </div>
        </>
      )}
    </PanelShell>
  );
}
