import { useState } from 'react';
import { ConfigScope, PermissionType } from '@lens/schema';
import type { ConfigSnapshot, PermissionRule } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { RawJsonView } from './RawJsonView';
import { useConfigUpdate } from '../hooks/useConfigUpdate';
import { SearchBar } from './SearchBar';
import { TYPE_BADGE_STYLES } from '../constants/badgeStyles.js';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { PanelShell, PanelEmpty, DeleteButton } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

const SCOPE_SORT_ORDER: Record<string, number> = {
  [ConfigScope.Local]: 0,
  [ConfigScope.Project]: 1,
  [ConfigScope.Global]: 2,
  [ConfigScope.Managed]: 3,
};

function groupByType(rules: PermissionRule[]) {
  const groups: Record<string, PermissionRule[]> = { allow: [], ask: [], deny: [] };
  for (const rule of rules) {
    groups[rule.type]?.push(rule);
  }
  // Sort each group by scope then rule text
  for (const type of Object.keys(groups)) {
    groups[type].sort((a, b) => {
      const sd = (SCOPE_SORT_ORDER[a.scope] ?? 9) - (SCOPE_SORT_ORDER[b.scope] ?? 9);
      return sd !== 0 ? sd : a.rule.localeCompare(b.rule);
    });
  }
  return groups;
}

function truncatePath(path: string, maxLen = 60) {
  if (path.length <= maxLen) return path;
  return '...' + path.slice(path.length - maxLen + 3);
}

export function PermissionsPanel({ config, onRescan }: Props) {
  const { rules, defaultMode } = config.permissions;
  const { update, saving, error } = useConfigUpdate(onRescan);
  const [newRule, setNewRule] = useState<Record<string, string>>({ allow: '', ask: '', deny: '' });
  const [editingRule, setEditingRule] = useState<{ rule: PermissionRule; index: number; newText: string } | null>(null);
  const [view, setView] = useState<'effective' | 'json'>('effective');
  const [jumpTarget, setJumpTarget] = useState<{ filePath: string; key: string } | null>(null);
  const [search, setSearch] = useState('');

  function jumpToFile(rule: string, filePath: string) {
    setJumpTarget({ filePath, key: rule });
    setView('json');
  }

  const filteredRules = rules.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    return r.rule.toLowerCase().includes(q)
      || r.type.toLowerCase().includes(q);
  });

  const groups = groupByType(filteredRules);

  async function addRule(type: PermissionType) {
    const ruleText = newRule[type]?.trim();
    if (!ruleText) return;

    // Find the first non-managed file that has this permission type, or fall back to any non-managed settings file
    const existingRule = rules.find(r => r.type === type && r.scope !== ConfigScope.Managed);
    const settingsFile = existingRule
      ? existingRule.filePath
      : config.settings.files.find(f => f.editable)?.filePath;

    if (!settingsFile) return;

    // Get current rules of this type from that file
    const currentRules = rules
      .filter(r => r.type === type && r.filePath === settingsFile)
      .map(r => r.rule);

    await update({
      surface: 'permissions',
      scope: existingRule?.scope ?? ConfigScope.Project,
      filePath: settingsFile,
      key: `permissions.${type}`,
      value: [...currentRules, ruleText],
    });

    setNewRule(prev => ({ ...prev, [type]: '' }));
  }

  function getScopeOptions(rule: PermissionRule) {
    if (rule.scope === ConfigScope.Managed) return [];

    async function copyRuleTo(targetScope: ConfigScope, targetFilePath: string) {
      const targetRules = rules
        .filter(r => r.type === rule.type && r.filePath === targetFilePath)
        .map(r => r.rule);
      if (targetRules.includes(rule.rule)) return; // already exists
      await update({
        surface: 'permissions',
        scope: targetScope,
        filePath: targetFilePath,
        key: `permissions.${rule.type}`,
        value: [...targetRules, rule.rule],
      });
    }

    if (rule.scope === ConfigScope.Project || rule.scope === ConfigScope.Local) {
      const globalFile = config.settings.files.find(f => f.scope === ConfigScope.Global);
      if (globalFile && config.allowGlobalWrites) {
        return [{
          label: 'Global',
          scope: ConfigScope.Global,
          onCopy: () => copyRuleTo(ConfigScope.Global, globalFile.filePath),
          onMove: async () => {
            await copyRuleTo(ConfigScope.Global, globalFile.filePath);
            await removeRule(rule);
          },
        }];
      }
      return [];
    }
    if (rule.scope === ConfigScope.Global) {
      const projectFile = config.settings.files.find(f => f.scope === ConfigScope.Project);
      if (projectFile) {
        return [{
          label: 'Project',
          scope: ConfigScope.Project,
          onCopy: () => copyRuleTo(ConfigScope.Project, projectFile.filePath),
          onMove: config.allowGlobalWrites ? async () => {
            await copyRuleTo(ConfigScope.Project, projectFile.filePath);
            await removeRule(rule);
          } : undefined,
        }];
      }
    }
    return [];
  }

  async function removeRule(rule: PermissionRule) {
    if (rule.scope === ConfigScope.Managed) return;

    const sameFileRules = rules
      .filter(r => r.type === rule.type && r.filePath === rule.filePath)
      .map(r => r.rule)
      .filter(r => r !== rule.rule);

    await update({
      surface: 'permissions',
      scope: rule.scope,
      filePath: rule.filePath,
      key: `permissions.${rule.type}`,
      value: sameFileRules,
    });
  }

  async function saveEdit() {
    if (!editingRule) return;
    const { rule, newText } = editingRule;
    const trimmed = newText.trim();
    if (!trimmed) return;
    // No-op if text unchanged
    if (trimmed === rule.rule) { setEditingRule(null); return; }

    const fileRules = rules.filter(r => r.type === rule.type && r.filePath === rule.filePath);
    const updatedRules = fileRules.map((r, idx) => idx === editingRule.index ? trimmed : r.rule);

    await update({
      surface: 'permissions',
      scope: rule.scope,
      filePath: rule.filePath,
      key: `permissions.${rule.type}`,
      value: updatedRules,
    });

    setEditingRule(null);
  }

  if (rules.length === 0) {
    return (
      <PanelShell title="Permissions">
        <PanelEmpty>No permission rules configured</PanelEmpty>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Permissions"
      subtitle={`${rules.length} rules configured`}
      view={view}
      onViewChange={(v) => { setView(v as 'effective' | 'json'); setJumpTarget(null); setEditingRule(null); }}
      viewOptions={[{ value: 'effective', label: 'Effective' }, { value: 'json', label: 'Files' }]}
    >
      {defaultMode && (
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 mb-6">
          <span className="text-sm text-gray-400">Default mode:</span>
          <span className="text-sm font-mono text-gray-200">{String(defaultMode.value)}</span>
          <ScopeIndicator scope={defaultMode.scope} />
        </div>
      )}

      {view === 'json' ? (
        <RawJsonView files={config.settings.files.map(f => ({ scope: f.scope, filePath: f.filePath }))} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
      ) : (
      <>
      <SearchBar value={search} onChange={v => { setSearch(v); setEditingRule(null); }} placeholder="Search permissions..." itemCount={rules.length} filteredCount={filteredRules.length} />
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {([PermissionType.Allow, PermissionType.Ask, PermissionType.Deny] as const).map((type) => {
        const typeRules = groups[type];
        const cfg = TYPE_BADGE_STYLES.permission[type as keyof typeof TYPE_BADGE_STYLES.permission] ?? TYPE_BADGE_STYLES.permission.allow;
        return (
          <div key={type} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="text-xs text-gray-500">{typeRules.length} rules</span>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {typeRules.map((rule, i) => {
                // Find this rule's index within the file-scoped list (same filter saveEdit uses)
                const fileRules = rules.filter(r => r.type === rule.type && r.filePath === rule.filePath);
                const fileIndex = fileRules.findIndex(r => r === rule);
                const isEditing = editingRule !== null && editingRule.index === fileIndex && editingRule.rule.filePath === rule.filePath && editingRule.rule.type === rule.type;
                return (
                  <div key={i} id={`permission-${slug(rule.rule)}-${i}-${rule.scope}`} className="flex items-center gap-3 px-4 py-3">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editingRule.newText}
                          onChange={e => setEditingRule(prev => prev ? { ...prev, newText: e.target.value } : null)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape' && !saving) setEditingRule(null); }}
                          autoFocus
                          disabled={saving}
                          className="flex-1 bg-bg border border-accent rounded px-3 py-1 text-sm font-mono text-gray-200 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          onClick={saveEdit}
                          disabled={saving || !editingRule.newText.trim()}
                          className="px-2.5 py-1 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          disabled={saving}
                          className="px-2.5 py-1 bg-gray-700/40 text-gray-400 rounded text-xs font-medium hover:text-gray-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <code className="flex-1 text-sm font-mono text-gray-200 truncate">{rule.rule}</code>
                        <ScopeIndicator scope={rule.scope} />
                        <button
                          onClick={() => jumpToFile(rule.rule, rule.filePath)}
                          className="text-xs text-gray-600 font-mono truncate max-w-[200px] hover:text-accent transition-colors"
                          title={`View in file: ${rule.filePath}`}
                        >
                          {truncatePath(rule.filePath)} ↗
                        </button>
                        {rule.scope !== ConfigScope.Managed && (
                          <>
                            <ScopeMoveButton options={getScopeOptions(rule)} saving={saving} />
                            <button
                              onClick={() => setEditingRule({ rule, index: fileIndex, newText: rule.rule })}
                              disabled={saving}
                              className="text-gray-600 hover:text-accent transition-colors text-sm px-1 disabled:opacity-50"
                              title="Edit rule"
                            >
                              ✎
                            </button>
                            <DeleteButton
                              onClick={() => removeRule(rule)}
                              disabled={saving}
                              title="Remove rule"
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Add rule form */}
              <div className="flex items-center gap-2 px-4 py-2">
                <input
                  type="text"
                  value={newRule[type] ?? ''}
                  onChange={e => setNewRule(prev => ({ ...prev, [type]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addRule(type); }}
                  placeholder={`Add ${type} rule...`}
                  disabled={saving}
                  className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent disabled:opacity-50"
                />
                <button
                  onClick={() => addRule(type)}
                  disabled={saving || !newRule[type]?.trim()}
                  className="px-3 py-1.5 bg-accent/20 text-accent rounded text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );
      })}
      </>
      )}
    </PanelShell>
  );
}
