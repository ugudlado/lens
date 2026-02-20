import { useState } from 'react';
import { ConfigScope } from '@lens/schema';
import type { ConfigSnapshot } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { EditableContent } from './EditableContent';
import { RawJsonView } from './RawJsonView';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { useFileDelete } from '../hooks/useFileDelete';
import { SearchBar } from './SearchBar';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { PanelRow, DeleteButton } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

type ViewTab = 'rules' | 'raw';


function CreateRuleForm({ config, onRescan, onClose }: { config: ConfigSnapshot; onRescan: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ConfigScope.Project | ConfigScope.Global>(ConfigScope.Project);

  const { update, saving, error } = useConfigUpdate(() => {
    onRescan();
    onClose();
  });

  const sanitizedName = name.trim().replace(/\.mdc?$/, '');
  const filePath = scope === ConfigScope.Project
    ? `${config.projectPath}/.claude/rules/${sanitizedName}.mdc`
    : `${config.globalPath}/rules/${sanitizedName}.mdc`;

  function handleSave() {
    if (!sanitizedName) return;
    update({
      surface: 'rules',
      scope,
      filePath,
      value: '# ' + sanitizedName + '\n\nTODO: Add rule content here.\n',
    });
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">New Rule</h3>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Rule name (becomes filename, e.g. <code className="font-mono">my-rule</code> → <code className="font-mono">my-rule.mdc</code>)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-rule"
            className="w-full px-3 py-1.5 text-sm bg-bg border border-border rounded font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Scope</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope(ConfigScope.Project)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                scope === ConfigScope.Project
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-bg text-gray-400 border border-border hover:bg-white/5'
              }`}
            >
              Project
            </button>
            <button
              onClick={() => setScope(ConfigScope.Global)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                scope === ConfigScope.Global
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-bg text-gray-400 border border-border hover:bg-white/5'
              }`}
            >
              Global
            </button>
          </div>
        </div>

        {/* Resolved path preview */}
        {sanitizedName && (
          <div className="text-xs text-gray-500 font-mono bg-bg border border-border rounded px-3 py-2 truncate">
            {filePath}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !sanitizedName}
            className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Rule'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function RulesPanel({ config, onRescan }: Props) {
  const { rules } = config.rules;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [viewTab, setViewTab] = useState<ViewTab>('rules');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState('');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);

  const { update, saving } = useConfigUpdate(onRescan);
  const { deleteFile, deleting } = useFileDelete(onRescan);

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setViewTab('raw');
  }

  async function handleDelete(filePath: string, ruleName: string) {
    if (!window.confirm(`Delete rule "${ruleName}"?\n\nThis will permanently delete:\n${filePath}`)) return;
    await deleteFile(filePath);
  }

  function getScopeOptions(rule: typeof rules[number]) {
    if (rule.scope === ConfigScope.Managed) return [];
    if (rule.scope === ConfigScope.Project) {
      return config.allowGlobalWrites ? [{
        label: 'Global',
        scope: ConfigScope.Global,
        onCopy: async () => {
          await update({ surface: 'rules', scope: ConfigScope.Global, filePath: `${config.globalPath}/rules/${rule.name}.mdc`, value: rule.content });
        },
        onMove: async () => {
          await update({ surface: 'rules', scope: ConfigScope.Global, filePath: `${config.globalPath}/rules/${rule.name}.mdc`, value: rule.content });
          await deleteFile(rule.filePath);
        },
      }] : [];
    }
    if (rule.scope === ConfigScope.Global) {
      return [{
        label: 'Project',
        scope: ConfigScope.Project,
        onCopy: async () => {
          await update({ surface: 'rules', scope: ConfigScope.Project, filePath: `${config.projectPath}/.claude/rules/${rule.name}.mdc`, value: rule.content });
        },
        onMove: config.allowGlobalWrites ? async () => {
          await update({ surface: 'rules', scope: ConfigScope.Project, filePath: `${config.projectPath}/.claude/rules/${rule.name}.mdc`, value: rule.content });
          await deleteFile(rule.filePath);
        } : undefined,
      }];
    }
    return [];
  }

  const filteredRules = rules.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q)
      || r.content.toLowerCase().includes(q)
      || (r.paths || []).some(p => p.toLowerCase().includes(q));
  }).sort((a, b) => {
    const SCOPE_ORDER: Record<string, number> = { local: 0, project: 1, global: 2, managed: 3 };
    const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
    return sd !== 0 ? sd : a.name.localeCompare(b.name);
  });

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Collect unique file refs for raw view
  const rawFiles = rules.map(r => ({ scope: r.scope, filePath: r.filePath }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Rules</h2>
      <p className="text-sm text-gray-400 mb-4">
        Rules are <code className="text-xs bg-white/5 px-1 py-0.5 rounded font-mono">.md</code> or <code className="text-xs bg-white/5 px-1 py-0.5 rounded font-mono">.mdc</code> files
        in <code className="text-xs bg-white/5 px-1 py-0.5 rounded font-mono">.claude/rules/</code> that
        provide modular instructions to Claude. They can target specific file paths using
        a <code className="text-xs bg-white/5 px-1 py-0.5 rounded font-mono">paths</code> frontmatter field.
      </p>

      {/* Tab toggle + Create button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-bg border border-border rounded-lg p-0.5">
          <button
            onClick={() => { setViewTab('rules'); setJumpTarget(null); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewTab === 'rules'
                ? 'bg-accent/20 text-accent'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => setViewTab('raw')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewTab === 'raw'
                ? 'bg-accent/20 text-accent'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw Files
          </button>
        </div>

        {viewTab === 'rules' && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            + New Rule
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && viewTab === 'rules' && (
        <CreateRuleForm
          config={config}
          onRescan={onRescan}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Raw Files tab */}
      {viewTab === 'raw' && (
        <RawJsonView files={rawFiles} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      )}

      {/* Rules tab */}
      {viewTab === 'rules' && (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search rules..." itemCount={rules.length} filteredCount={filteredRules.length} />
          {rules.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-gray-500">
              No rules configured
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule, i) => (
                <PanelRow
                  key={`${slug(rule.name)}-${rule.scope}`}
                  expanded={expanded.has(i)}
                  onToggle={() => toggle(i)}
                  label={rule.name}
                  trigger={
                    <>
                      <span className="font-medium text-gray-200">{rule.name}</span>
                      <ScopeIndicator scope={rule.scope} />
                      <span className="text-xs text-gray-500 bg-bg px-2 py-0.5 rounded shrink-0">
                        {rule.lineCount} lines
                      </span>
                      {rule.paths && rule.paths.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {rule.paths.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-accent/10 rounded text-xs font-mono text-accent">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  }
                  actions={
                    rule.scope !== ConfigScope.Managed ? (
                      <>
                        <ScopeMoveButton options={getScopeOptions(rule)} saving={saving || deleting} />
                        {(rule.scope !== ConfigScope.Global || config.allowGlobalWrites) && (
                          <DeleteButton
                            onClick={() => handleDelete(rule.filePath, rule.name)}
                            disabled={deleting}
                            title="Delete rule"
                          />
                        )}
                      </>
                    ) : undefined
                  }
                >
                  <div className="border-t border-border px-4 py-3">
                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                      {rule.content}
                    </pre>
                    <button
                      onClick={() => jumpToFile(rule.name, rule.filePath)}
                      className="mt-3 text-xs text-gray-600 font-mono truncate hover:text-accent transition-colors block"
                      title={rule.filePath}
                    >
                      {rule.filePath} ↗
                    </button>
                    {rule.scope !== ConfigScope.Managed && (
                      <EditableContent
                        content={rule.content}
                        filePath={rule.filePath}
                        scope={rule.scope}
                        surface="rules"
                        onRescan={onRescan}
                        readOnly={rule.scope === ConfigScope.Global && !config.allowGlobalWrites}
                      />
                    )}
                  </div>
                </PanelRow>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
