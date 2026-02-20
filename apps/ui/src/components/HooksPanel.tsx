import { useState } from 'react';
import { HookEvent, HookType, HookSource, ConfigScope } from '@lens/schema';
import type { ConfigSnapshot, HookEntry } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator.js';
import { RawJsonView } from './RawJsonView.js';
import { useConfigUpdate } from '../hooks/useConfigUpdate.js';
import { SearchBar } from './SearchBar.js';
import { ScopeMoveButton } from './ScopeMoveButton.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { TYPE_BADGE_STYLES, SOURCE_BADGES } from '../constants/badgeStyles.js';
import { PanelShell, PanelRow, PanelEmpty, AddButton, DeleteButton } from './panel/index.js';
import { slug } from '../constants.js';

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

const ALL_HOOK_EVENTS: HookEvent[] = [
  HookEvent.SessionStart, HookEvent.UserPromptSubmit, HookEvent.PreToolUse, HookEvent.PermissionRequest,
  HookEvent.PostToolUse, HookEvent.PostToolUseFailure, HookEvent.Notification, HookEvent.SubagentStart,
  HookEvent.SubagentStop, HookEvent.Stop, HookEvent.TeammateIdle, HookEvent.TaskCompleted,
  HookEvent.PreCompact, HookEvent.SessionEnd,
];


function groupByEvent(hooks: HookEntry[]): Map<HookEvent, HookEntry[]> {
  const map = new Map<HookEvent, HookEntry[]>();
  for (const hook of hooks) {
    const arr = map.get(hook.event) || [];
    arr.push(hook);
    map.set(hook.event, arr);
  }
  // Sort hooks within each group: custom (non-plugin) first, then plugin; within each by scope then value
  const SCOPE_ORDER: Record<string, number> = { local: 0, project: 1, global: 2, managed: 3 };
  for (const [event, arr] of map.entries()) {
    map.set(event, arr.sort((a, b) => {
      const aPlugin = a.pluginName ? 1 : 0;
      const bPlugin = b.pluginName ? 1 : 0;
      if (aPlugin !== bPlugin) return aPlugin - bPlugin;
      const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
      return sd !== 0 ? sd : (a.command || a.prompt || '').localeCompare(b.command || b.prompt || '');
    }));
  }
  return map;
}

function canRemoveHook(hook: HookEntry): boolean {
  return hook.scope !== ConfigScope.Managed && hook.source === HookSource.Settings;
}

type ViewTab = 'effective' | 'json';

interface JumpTarget {
  filePath: string;
  key: string;
}

interface AddHookForm {
  event: HookEvent;
  type: HookType.Command | HookType.Prompt;
  value: string;
  matcher: string;
  scope: ConfigScope;
  filePath: string;
}

interface EditingHook {
  /** Composite key: `${event}:${filePath}:${indexWithinEventFile}` */
  key: string;
  type: HookType.Command | HookType.Prompt;
  value: string;
  matcher: string;
}

export function HooksPanel({ config, onRescan }: Props) {
  const { hooks, disableAllHooks } = config.hooks;
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const firstGroup = groupByEvent(hooks);
    const firstKey = firstGroup.keys().next().value;
    return firstKey !== undefined ? new Set([firstKey]) : new Set();
  });
  const { update, saving, error } = useConfigUpdate(onRescan);
  const [viewTab, setViewTab] = useState<ViewTab>('effective');
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<EditingHook | null>(null);
  const [search, setSearch] = useState('');
  const [confirmHook, setConfirmHook] = useState<HookEntry | null>(null);

  function jumpToFile(event: string, filePath: string) {
    setJumpTarget({ filePath, key: event });
    setViewTab('json');
  }

  const editableSettingsFiles = config.settings.files.filter(f => f.editable);
  const defaultFile = editableSettingsFiles.find(f => f.scope === ConfigScope.Project)
    || editableSettingsFiles.find(f => f.scope === ConfigScope.Global)
    || editableSettingsFiles[0];

  const [addForm, setAddForm] = useState<AddHookForm>({
    event: HookEvent.PreToolUse,
    type: HookType.Command,
    value: '',
    matcher: '',
    scope: defaultFile?.scope ?? ConfigScope.Global,
    filePath: defaultFile?.filePath ?? '',
  });

  const toggle = (event: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  async function removeHook(hook: HookEntry) {
    const sameFileEventHooks = hooks.filter(
      h => h.event === hook.event && h.filePath === hook.filePath && h.source === HookSource.Settings
    );

    // Find the first matching hook by value and remove only that one (index-based)
    let removedOne = false;
    const remaining = sameFileEventHooks.filter(h => {
      if (removedOne) return true;
      if (h.type === hook.type && h.command === hook.command && h.matcher === hook.matcher) {
        removedOne = true;
        return false;
      }
      return true;
    });

    const hookEntries = remaining.map(h => {
      const entry: Record<string, unknown> = { type: h.type };
      if (h.command) entry.command = h.command;
      if (h.prompt) entry.prompt = h.prompt;
      if (h.matcher) entry.matcher = h.matcher;
      if (h.timeout) entry.timeout = h.timeout;
      return entry;
    });

    await update({
      surface: 'hooks',
      scope: hook.scope,
      filePath: hook.filePath,
      key: `hooks.${hook.event}`,
      value: hookEntries.length > 0 ? hookEntries : undefined,
      delete: hookEntries.length === 0,
    });
  }

  function startEdit(hook: HookEntry, indexInEventFile: number) {
    setEditing({
      key: `${hook.event}:${hook.filePath}:${indexInEventFile}`,
      type: hook.type === HookType.Prompt ? HookType.Prompt : HookType.Command,
      value: hook.command || hook.prompt || '',
      matcher: hook.matcher || '',
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit(hook: HookEntry, indexInEventFile: number) {
    if (!editing) return;

    const sameFileEventHooks = hooks.filter(
      h => h.event === hook.event && h.filePath === hook.filePath && h.source === HookSource.Settings
    );

    const hookEntries = sameFileEventHooks.map((h, i) => {
      const entry: Record<string, unknown> = { type: h.type };
      if (i === indexInEventFile) {
        // Replace with edited values
        entry.type = editing.type;
        if (editing.type === HookType.Command) {
          entry.command = editing.value.trim();
        } else {
          entry.prompt = editing.value.trim();
        }
        if (editing.matcher.trim()) {
          entry.matcher = editing.matcher.trim();
        }
      } else {
        if (h.command) entry.command = h.command;
        if (h.prompt) entry.prompt = h.prompt;
        if (h.matcher) entry.matcher = h.matcher;
        if (h.timeout) entry.timeout = h.timeout;
      }
      return entry;
    });

    await update({
      surface: 'hooks',
      scope: hook.scope,
      filePath: hook.filePath,
      key: `hooks.${hook.event}`,
      value: hookEntries,
    });

    setEditing(null);
  }

  async function toggleDisableAll() {
    const settingsFile = config.settings.files.find(f => f.scope === ConfigScope.Global) || config.settings.files[0];
    if (!settingsFile) return;

    await update({
      surface: 'hooks' as const,
      scope: settingsFile.scope,
      filePath: settingsFile.filePath,
      key: 'disableAllHooks',
      value: !disableAllHooks,
    });
  }

  function buildHookEntry(hook: HookEntry): Record<string, unknown> {
    const entry: Record<string, unknown> = { type: hook.type };
    if (hook.command) entry.command = hook.command;
    if (hook.prompt) entry.prompt = hook.prompt;
    if (hook.matcher) entry.matcher = hook.matcher;
    if (hook.timeout) entry.timeout = hook.timeout;
    return entry;
  }

  function getHookScopeOptions(hook: HookEntry): { label: string; scope?: ConfigScope; onCopy: () => Promise<void>; onMove?: () => Promise<void> }[] {
    if (hook.scope === ConfigScope.Project) {
      const globalFile = config.settings.files.find(f => f.scope === ConfigScope.Global);
      if (!globalFile || !config.allowGlobalWrites) return [];
      return [{
        label: 'Global',
        scope: ConfigScope.Global,
        onCopy: () => copyHook(hook, ConfigScope.Global, globalFile.filePath),
        onMove: () => moveHook(hook, ConfigScope.Global, globalFile.filePath),
      }];
    }
    if (hook.scope === ConfigScope.Global) {
      const projectFile = config.settings.files.find(f => f.scope === ConfigScope.Project);
      if (!projectFile) return [];
      return [{
        label: 'Project',
        scope: ConfigScope.Project,
        onCopy: () => copyHook(hook, ConfigScope.Project, projectFile.filePath),
        onMove: config.allowGlobalWrites ? () => moveHook(hook, ConfigScope.Project, projectFile.filePath) : undefined,
      }];
    }
    return [];
  }

  async function copyHook(hook: HookEntry, targetScope: ConfigScope, targetFilePath: string) {
    const existingInTarget = hooks.filter(
      h => h.event === hook.event && h.filePath === targetFilePath && h.source === HookSource.Settings
    );
    const existingEntries = existingInTarget.map(buildHookEntry);
    const newEntry = buildHookEntry(hook);

    await update({
      surface: 'hooks',
      scope: targetScope,
      filePath: targetFilePath,
      key: `hooks.${hook.event}`,
      value: [...existingEntries, newEntry],
    });
  }

  async function moveHook(hook: HookEntry, targetScope: ConfigScope, targetFilePath: string) {
    // Copy to target first
    await copyHook(hook, targetScope, targetFilePath);

    // Remove from source
    const sameFileEventHooks = hooks.filter(
      h => h.event === hook.event && h.filePath === hook.filePath && h.source === HookSource.Settings
    );
    let removedOne = false;
    const remaining = sameFileEventHooks.filter(h => {
      if (removedOne) return true;
      if (h.type === hook.type && h.command === hook.command && h.matcher === hook.matcher && h.prompt === hook.prompt) {
        removedOne = true;
        return false;
      }
      return true;
    });
    const remainingEntries = remaining.map(buildHookEntry);

    await update({
      surface: 'hooks',
      scope: hook.scope,
      filePath: hook.filePath,
      key: `hooks.${hook.event}`,
      value: remainingEntries.length > 0 ? remainingEntries : undefined,
      delete: remainingEntries.length === 0,
    });
  }

  async function addHook() {
    if (!addForm.value.trim() || !addForm.filePath) return;

    // Get existing hooks for this event in the target file
    const existingHooks = hooks.filter(
      h => h.event === addForm.event && h.filePath === addForm.filePath && h.source === HookSource.Settings
    );

    const existingEntries = existingHooks.map(h => {
      const entry: Record<string, unknown> = { type: h.type };
      if (h.command) entry.command = h.command;
      if (h.prompt) entry.prompt = h.prompt;
      if (h.matcher) entry.matcher = h.matcher;
      if (h.timeout) entry.timeout = h.timeout;
      return entry;
    });

    // Build the new hook entry
    const newEntry: Record<string, unknown> = { type: addForm.type };
    if (addForm.type === HookType.Command) {
      newEntry.command = addForm.value.trim();
    } else {
      newEntry.prompt = addForm.value.trim();
    }
    if (addForm.matcher.trim()) {
      newEntry.matcher = addForm.matcher.trim();
    }

    await update({
      surface: 'hooks',
      scope: addForm.scope,
      filePath: addForm.filePath,
      key: `hooks.${addForm.event}`,
      value: [...existingEntries, newEntry],
    });

    setAddForm(prev => ({ ...prev, value: '', matcher: '' }));
    setShowAddForm(false);
  }

  function handleScopeFileChange(filePath: string) {
    const file = editableSettingsFiles.find(f => f.filePath === filePath);
    if (file) {
      setAddForm(prev => ({ ...prev, scope: file.scope, filePath: file.filePath }));
    }
  }

  // Show all settings files in JSON view so users can see all scopes
  const jsonFiles = config.settings.files.map(f => ({ scope: f.scope, filePath: f.filePath }));

  const filteredHooks = hooks.filter(h => {
    const q = search.toLowerCase();
    if (!q) return true;
    return h.event.toLowerCase().includes(q)
      || (h.command || '').toLowerCase().includes(q)
      || (h.prompt || '').toLowerCase().includes(q)
      || (h.matcher || '').toLowerCase().includes(q)
      || (h.source || '').toLowerCase().includes(q);
  });

  const grouped = groupByEvent(filteredHooks);
  const allGroupKeys = Array.from(grouped.keys());
  const allExpanded = allGroupKeys.length > 0 && allGroupKeys.every(k => expanded.has(k));

  function toggleExpandAll() {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(allGroupKeys));
    }
  }

  return (
    <PanelShell
      title="Hooks"
      subtitle={`${hooks.length} hook${hooks.length !== 1 ? 's' : ''} across ${grouped.size} event${grouped.size !== 1 ? 's' : ''}`}
      actions={
        allGroupKeys.length > 0 ? (
          <button
            onClick={toggleExpandAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        ) : undefined
      }
      view={viewTab}
      onViewChange={(v) => { setViewTab(v as ViewTab); if (v !== 'json') setJumpTarget(null); }}
      viewOptions={[
        { value: 'effective', label: 'Effective' },
        { value: 'json', label: 'Files' },
      ]}
    >
      {viewTab === 'json' ? (
        <div className="mt-0">
          <RawJsonView files={jsonFiles} onRescan={onRescan} autoExpandFile={jumpTarget?.filePath} highlightKey={jumpTarget?.key} />
        </div>
      ) : (
        <>

          <SearchBar value={search} onChange={setSearch} placeholder="Search hooks..." itemCount={hooks.length} filteredCount={filteredHooks.length} />

          {error && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
            <button
              onClick={toggleDisableAll}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                disableAllHooks ? 'bg-gray-600/40' : 'bg-accent/60'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  disableAllHooks ? 'left-0.5' : 'left-5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-400">
              {disableAllHooks ? 'Hooks disabled' : 'Hooks enabled'}
            </span>
            {disableAllHooks && (
              <span className="text-red-400/60 text-xs">All hooks are currently disabled</span>
            )}
          </div>

          {/* Add Hook Button / Form */}
          {!showAddForm ? (
            <AddButton
              variant="block"
              onClick={() => setShowAddForm(true)}
              disabled={editableSettingsFiles.length === 0}
            >
              + Add Hook
            </AddButton>
          ) : (
            <div className="mb-4 bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">Add Hook</span>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Event */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Event</label>
                <select
                  value={addForm.event}
                  onChange={e => setAddForm(prev => ({ ...prev, event: e.target.value as HookEvent }))}
                  className="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                >
                  {ALL_HOOK_EVENTS.map(ev => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="hook-type"
                      value={HookType.Command}
                      checked={addForm.type === HookType.Command}
                      onChange={() => setAddForm(prev => ({ ...prev, type: HookType.Command }))}
                      className="accent-accent"
                    />
                    Command
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="hook-type"
                      value={HookType.Prompt}
                      checked={addForm.type === HookType.Prompt}
                      onChange={() => setAddForm(prev => ({ ...prev, type: HookType.Prompt }))}
                      className="accent-accent"
                    />
                    Prompt
                  </label>
                </div>
              </div>

              {/* Command / Prompt value */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {addForm.type === HookType.Command ? 'Command' : 'Prompt'}
                </label>
                <input
                  type="text"
                  value={addForm.value}
                  onChange={e => setAddForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder={addForm.type === HookType.Command ? 'e.g. npm run lint' : 'e.g. Check for security issues'}
                  className="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono placeholder:text-gray-600 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Matcher (optional) */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Matcher (optional)</label>
                <input
                  type="text"
                  value={addForm.matcher}
                  onChange={e => setAddForm(prev => ({ ...prev, matcher: e.target.value }))}
                  placeholder="e.g. tool_name or regex pattern"
                  className="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-200 font-mono placeholder:text-gray-600 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Scope / Settings file */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Settings File</label>
                <select
                  value={addForm.filePath}
                  onChange={e => handleScopeFileChange(e.target.value)}
                  className="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                >
                  {editableSettingsFiles.map(f => {
                    const shortPath = f.filePath.replace(/.*\/\.claude\//, '~/.claude/').replace(/.*\/([^/]+)$/, '$1');
                    const scopeLabel = f.scope.charAt(0).toUpperCase() + f.scope.slice(1);
                    return (
                      <option key={f.filePath} value={f.filePath}>
                        {scopeLabel} — {shortPath}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addHook}
                  disabled={saving || !addForm.value.trim()}
                  className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Hook'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {hooks.length === 0 && !disableAllHooks && !saving && (
            <PanelEmpty>No hooks configured</PanelEmpty>
          )}

          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([event, eventHooks]) => {
              const isExpanded = expanded.has(event);
              return (
                <PanelRow
                  key={event}
                  label={event}
                  expanded={isExpanded}
                  onToggle={() => toggle(event)}
                  trigger={
                    <>
                      <span className="font-medium text-gray-200">{event}</span>
                      <span className="text-xs text-gray-500 bg-bg px-2 py-0.5 rounded">
                        {eventHooks.length}
                      </span>
                    </>
                  }
                >
                  <div className="border-t border-border divide-y divide-border">
                    {eventHooks.map((hook, i) => {
                        const typeBadge = TYPE_BADGE_STYLES.hook[hook.type as keyof typeof TYPE_BADGE_STYLES.hook] ?? TYPE_BADGE_STYLES.hook.command;
                        const srcBadge = SOURCE_BADGES[hook.source] || SOURCE_BADGES.settings;

                        // Compute index within same event+file for edit/save targeting
                        const sameFileEventHooks = hooks.filter(
                          h => h.event === hook.event && h.filePath === hook.filePath && h.source === HookSource.Settings
                        );
                        const indexInEventFile = sameFileEventHooks.indexOf(hook);
                        const editKey = `${hook.event}:${hook.filePath}:${indexInEventFile}`;
                        const isEditing = editing !== null && editing.key === editKey;

                        return (
                          <div key={i} id={`hook-${slug(hook.event)}-${i}-${hook.scope}`} className="px-4 py-3 pl-10">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <ScopeIndicator scope={hook.scope} />
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${srcBadge.bg} ${srcBadge.text}`}>
                                {hook.source}{hook.pluginName ? `:${hook.pluginName}` : ''}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge.bg} ${typeBadge.text}`}>
                                {hook.type}
                              </span>
                              {hook.matcher && !isEditing && (
                                <span className="text-xs text-gray-500">
                                  matcher: <code className="text-gray-400">{hook.matcher}</code>
                                </span>
                              )}
                              {canRemoveHook(hook) && (
                                <div className="ml-auto flex items-center gap-1">
                                  {!isEditing && (() => {
                                    const hookScopeOptions = getHookScopeOptions(hook);
                                    return hookScopeOptions.length > 0 ? (
                                      <ScopeMoveButton options={hookScopeOptions} saving={saving} />
                                    ) : null;
                                  })()}
                                  {!isEditing && (
                                    <button
                                      onClick={() => startEdit(hook, indexInEventFile)}
                                      disabled={saving}
                                      className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                                      title="Edit hook"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25l-1.44-1.44-6.37 6.37a.25.25 0 0 0-.057.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.057l6.364-6.376Z" />
                                      </svg>
                                    </button>
                                  )}
                                  <DeleteButton
                                    onClick={() => setConfirmHook(hook)}
                                    disabled={saving}
                                    title="Remove hook"
                                  />
                                </div>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-2">
                                {/* Type toggle */}
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`edit-type-${editKey}`}
                                      checked={editing.type === HookType.Command}
                                      onChange={() => setEditing({ ...editing, type: HookType.Command })}
                                      className="accent-accent"
                                    />
                                    Command
                                  </label>
                                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`edit-type-${editKey}`}
                                      checked={editing.type === HookType.Prompt}
                                      onChange={() => setEditing({ ...editing, type: HookType.Prompt })}
                                      className="accent-accent"
                                    />
                                    Prompt
                                  </label>
                                </div>
                                {/* Value input */}
                                <input
                                  type="text"
                                  value={editing.value}
                                  onChange={e => setEditing({ ...editing, value: e.target.value })}
                                  placeholder={editing.type === HookType.Command ? 'e.g. npm run lint' : 'e.g. Check for issues'}
                                  className="w-full bg-bg border border-accent/30 rounded px-2 py-1 text-sm text-gray-200 font-mono placeholder:text-gray-600 focus:outline-none focus:border-accent"
                                />
                                {/* Matcher input */}
                                <input
                                  type="text"
                                  value={editing.matcher}
                                  onChange={e => setEditing({ ...editing, matcher: e.target.value })}
                                  placeholder="Matcher (optional)"
                                  className="w-full bg-bg border border-border rounded px-2 py-1 text-sm text-gray-200 font-mono placeholder:text-gray-600 focus:outline-none focus:border-accent"
                                />
                                {/* Save / Cancel */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEdit(hook, indexInEventFile)}
                                    disabled={saving || !editing.value.trim()}
                                    className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                                  >
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="px-3 py-1 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {hook.command && (
                                  <div className="text-sm font-mono text-gray-300 bg-bg rounded px-2 py-1 overflow-x-auto">
                                    {hook.command}
                                  </div>
                                )}
                                {hook.prompt && (
                                  <div className="text-sm text-gray-300 bg-bg rounded px-2 py-1 mt-1 overflow-x-auto">
                                    {hook.prompt}
                                  </div>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => jumpToFile(hook.event, hook.filePath)}
                              className="mt-2 text-xs text-gray-600 font-mono truncate hover:text-accent transition-colors block"
                              title={`View in file: ${hook.filePath}`}
                            >
                              {hook.filePath} ↗
                            </button>
                          </div>
                        );
                      })}
                    </div>
                </PanelRow>
              );
            })}
          </div>
        </>
      )}
      {confirmHook && (
        <ConfirmDialog
          title="Remove hook?"
          message={`Remove ${confirmHook.type} hook on ${confirmHook.event}?`}
          onConfirm={() => { const h = confirmHook; setConfirmHook(null); removeHook(h); }}
          onCancel={() => setConfirmHook(null)}
        />
      )}
    </PanelShell>
  );
}
