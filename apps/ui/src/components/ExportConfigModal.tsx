import { useState } from 'react';
import type { ConfigSnapshot, ExportData } from '@lens/schema';
import { ConfigScope, PluginScope } from '@lens/schema';

interface ExportConfigModalProps {
  config: ConfigSnapshot;
  onClose: () => void;
}

type ModalState = 'checklist' | 'exporting' | 'error';

type ExportSectionId = 'mcp' | 'hooks' | 'skills' | 'agents' | 'rules' | 'commands' | 'permissions' | 'claudeMd' | 'plugins';

const SECTION_LABELS: Record<ExportSectionId, string> = {
  mcp: 'MCP Servers',
  hooks: 'Hooks',
  skills: 'Skills',
  agents: 'Agents',
  rules: 'Rules',
  commands: 'Commands',
  permissions: 'Permissions',
  claudeMd: 'CLAUDE.md',
  plugins: 'Plugins',
};

interface SectionItem {
  key: string;
  label: string;
}

export function ExportConfigModal({ config, onClose }: ExportConfigModalProps) {
  // Build section items from config (only project-scoped)
  const mcpItems: SectionItem[] = config.mcp.servers
    .filter(s => s.scope === ConfigScope.Project)
    .map(s => ({ key: s.name, label: s.name }));

  const hookItems: SectionItem[] = config.hooks.hooks
    .filter(h => h.scope === ConfigScope.Project)
    .map(h => ({ key: `${h.event}::${h.command || h.prompt || ''}`, label: h.event }));

  const skillItems: SectionItem[] = config.skills.skills
    .filter(s => s.scope === ConfigScope.Project)
    .map(s => ({ key: s.name, label: s.name }));

  const agentItems: SectionItem[] = config.agents.agents
    .filter(a => a.scope === ConfigScope.Project)
    .map(a => ({ key: a.name, label: a.name }));

  const ruleItems: SectionItem[] = config.rules.rules
    .filter(r => r.scope === ConfigScope.Project)
    .map(r => ({ key: r.name, label: r.name }));

  const commandItems: SectionItem[] = config.commands.commands
    .filter(c => c.scope === ConfigScope.Project)
    .map(c => ({ key: c.name, label: c.name }));

  const permissionItems: SectionItem[] = config.permissions.rules
    .filter(p => p.scope === ConfigScope.Project)
    .map(p => ({ key: `${p.type}::${p.rule}`, label: `${p.type}: ${p.rule}` }));

  const claudeMdItems: SectionItem[] = config.claudeMd.files
    .filter(f => f.scope === ConfigScope.Project)
    .map(f => ({ key: f.filePath, label: f.filePath }));

  const pluginItems: SectionItem[] = config.plugins.plugins
    .filter(p => p.scope === PluginScope.Project)
    .map(p => ({ key: `${p.name}@${p.marketplace}`, label: `${p.name} (${p.marketplace})` }));

  const sectionItemsMap: Record<ExportSectionId, SectionItem[]> = {
    mcp: mcpItems,
    hooks: hookItems,
    skills: skillItems,
    agents: agentItems,
    rules: ruleItems,
    commands: commandItems,
    permissions: permissionItems,
    claudeMd: claudeMdItems,
    plugins: pluginItems,
  };

  // Initialize state with all items checked
  const [checked, setChecked] = useState<Record<ExportSectionId, Set<string>>>(() => ({
    mcp: new Set(mcpItems.map(i => i.key)),
    hooks: new Set(hookItems.map(i => i.key)),
    skills: new Set(skillItems.map(i => i.key)),
    agents: new Set(agentItems.map(i => i.key)),
    rules: new Set(ruleItems.map(i => i.key)),
    commands: new Set(commandItems.map(i => i.key)),
    permissions: new Set(permissionItems.map(i => i.key)),
    claudeMd: new Set(claudeMdItems.map(i => i.key)),
    plugins: new Set(pluginItems.map(i => i.key)),
  }));

  const [activeSection, setActiveSection] = useState<ExportSectionId>('mcp');
  const [modalState, setModalState] = useState<ModalState>('checklist');
  const [error, setError] = useState<string>('');

  function toggleItem(section: ExportSectionId, key: string) {
    setChecked(prev => {
      const next = { ...prev, [section]: new Set(prev[section]) };
      if (next[section].has(key)) {
        next[section].delete(key);
      } else {
        next[section].add(key);
      }
      return next;
    });
  }

  function toggleAllInSection(section: ExportSectionId) {
    const items = sectionItemsMap[section];
    const allChecked = items.every(item => checked[section].has(item.key));
    setChecked(prev => ({
      ...prev,
      [section]: allChecked ? new Set() : new Set(items.map(i => i.key)),
    }));
  }

  function totalChecked() {
    return (Object.keys(checked) as ExportSectionId[]).reduce((n, s) => n + checked[s].size, 0);
  }

  async function handleExport() {
    setModalState('exporting');
    setError('');

    // Build sections list — only sections with at least one checked item
    const requestedSections = (Object.keys(checked) as ExportSectionId[])
      .filter(s => checked[s].size > 0);

    if (requestedSections.length === 0) {
      setError('Please select at least one item to export.');
      setModalState('checklist');
      return;
    }

    try {
      const params = new URLSearchParams({ sections: requestedSections.join(','), project: config.projectPath });
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as ExportData;

      // Client-side pruning: remove unchecked items from each section
      if (data.sections.mcpServers) {
        data.sections.mcpServers = data.sections.mcpServers.filter(s => checked.mcp.has(s.name));
      }
      if (data.sections.hooks) {
        data.sections.hooks = data.sections.hooks.filter(h =>
          checked.hooks.has(`${h.event}::${h.command || h.prompt || ''}`)
        );
      }
      if (data.sections.skills) {
        data.sections.skills = data.sections.skills.filter(s => checked.skills.has(s.name));
      }
      if (data.sections.agents) {
        data.sections.agents = data.sections.agents.filter(a => checked.agents.has(a.name));
      }
      if (data.sections.rules) {
        data.sections.rules = data.sections.rules.filter(r => checked.rules.has(r.name));
      }
      if (data.sections.commands) {
        data.sections.commands = data.sections.commands.filter(c => checked.commands.has(c.name));
      }
      if (data.sections.permissions) {
        data.sections.permissions = data.sections.permissions.filter(p =>
          checked.permissions.has(`${p.type}::${p.rule}`)
        );
      }
      if (data.sections.claudeMd) {
        // For claudeMd, match by slot since that's what ExportData uses
        const projectClaudeMdFiles = config.claudeMd.files.filter(f => f.scope === ConfigScope.Project);
        data.sections.claudeMd = data.sections.claudeMd.filter(exported => {
          // Find the original file that matches this export
          const originalFile = projectClaudeMdFiles.find(f => {
            const slot = f.filePath.includes('/.claude/CLAUDE.md') ? '.claude/CLAUDE.md' : 'root';
            return slot === exported.slot;
          });
          return originalFile && checked.claudeMd.has(originalFile.filePath);
        });
      }
      if (data.sections.plugins) {
        data.sections.plugins = data.sections.plugins.filter(p =>
          checked.plugins.has(`${p.name}@${p.marketplace}`)
        );
      }

      // Trigger download — include project name + timestamp to avoid collisions
      const projectName = config.projectPath.split('/').pop() || 'project';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.claude-export.${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setModalState('checklist');
    }
  }

  const total = totalChecked();
  const sections = Object.keys(SECTION_LABELS) as ExportSectionId[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl flex flex-col"
        style={{ width: '720px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-200">Export Configuration</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {modalState === 'checklist' && (
            <div className="flex-1 flex min-h-0">
              {/* Section sidebar */}
              <div className="w-48 flex-shrink-0 border-r border-white/10 py-3 overflow-y-auto">
                {sections.map(s => {
                  const total = sectionItemsMap[s].length;
                  const sel = checked[s].size;
                  return (
                    <button
                      key={s}
                      onClick={() => setActiveSection(s)}
                      className={`w-full flex items-center gap-1.5 px-4 py-2 text-xs transition-colors ${
                        activeSection === s
                          ? 'text-[#6c5ce7] bg-[#6c5ce7]/10'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-medium truncate">{SECTION_LABELS[s]}</span>
                      {total > 0 && (
                        <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          sel > 0 ? 'bg-[#6c5ce7]/20 text-[#6c5ce7]' : 'bg-white/5 text-gray-500'
                        }`}>
                          {sel}/{total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {error && (
                  <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {/* Section header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-gray-500">{SECTION_LABELS[activeSection]}</span>
                  {sectionItemsMap[activeSection].length > 0 && (
                    <button
                      onClick={() => toggleAllInSection(activeSection)}
                      className="text-[10px] text-gray-500 hover:text-[#6c5ce7] transition-colors"
                    >
                      {sectionItemsMap[activeSection].every(item => checked[activeSection].has(item.key))
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Items checklist */}
                <div className="flex flex-col gap-1.5">
                  {sectionItemsMap[activeSection].length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      No project-scoped {SECTION_LABELS[activeSection].toLowerCase()}
                    </div>
                  ) : (
                    sectionItemsMap[activeSection].map(item => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/10 bg-[#0a0a0f] cursor-pointer hover:border-[#6c5ce7]/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked[activeSection].has(item.key)}
                          onChange={() => toggleItem(activeSection, item.key)}
                          className="accent-[#6c5ce7] w-3.5 h-3.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-200 truncate">{item.label}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {modalState === 'exporting' && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Exporting configuration...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={modalState === 'exporting'}
            className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={total === 0 || modalState === 'exporting'}
            className="px-4 py-1.5 text-xs font-medium rounded bg-[#6c5ce7]/20 text-[#6c5ce7] hover:bg-[#6c5ce7]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export {total > 0 ? `${total} item${total !== 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
