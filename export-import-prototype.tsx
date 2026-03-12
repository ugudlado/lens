import { useState, useRef } from 'react';

/**
 * Interactive prototype for Export/Import Config feature
 *
 * Features:
 * - Dashboard header with Export + Import buttons
 * - ExportConfigModal with section checklist
 * - Enhanced ImportConfigModal with "From Workspace" / "From File" tabs
 * - Full interactivity (drag-drop, tabs, checkboxes, etc.)
 */

// ─────────────────────────────────────────────────────────────────────
// Data & Types
// ─────────────────────────────────────────────────────────────────────

interface ConfigItem {
  id: string;
  name: string;
  detail: string;
}

interface Section {
  id: string;
  label: string;
  items: ConfigItem[];
}

const SECTIONS: Section[] = [
  {
    id: 'mcp',
    label: 'MCP Servers',
    items: [
      { id: 'mcp-1', name: 'anthropic', detail: 'http://localhost:3001' },
      { id: 'mcp-2', name: 'stripe-api', detail: 'stdio: python /path/to/stripe.py' },
      { id: 'mcp-3', name: 'github-tools', detail: 'http://localhost:3002' },
    ],
  },
  {
    id: 'hooks',
    label: 'Hooks',
    items: [
      { id: 'hook-1', name: 'UserPromptSubmit', detail: 'type: command' },
      { id: 'hook-2', name: 'PreToolUse', detail: 'type: prompt' },
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    items: [],
  },
  {
    id: 'agents',
    label: 'Agents',
    items: [
      { id: 'agent-1', name: 'code-reviewer', detail: 'Reviews code for quality' },
    ],
  },
  {
    id: 'rules',
    label: 'Rules',
    items: [
      { id: 'rule-1', name: 'no-destructive-commands', detail: 'paths: src/**' },
      { id: 'rule-2', name: 'require-tests', detail: 'All changes need tests' },
      { id: 'rule-3', name: 'performance-gates', detail: 'paths: apps/server/**' },
      { id: 'rule-4', name: 'security-audit', detail: 'Audit all PRs' },
      { id: 'rule-5', name: 'commit-conventions', detail: 'Enforce conventional commits' },
    ],
  },
  {
    id: 'commands',
    label: 'Commands',
    items: [
      { id: 'cmd-1', name: 'deploy', detail: '/' },
      { id: 'cmd-2', name: 'test', detail: '/' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'settings-1', name: 'Project Settings', detail: '.claude/settings.json' },
    ],
  },
  {
    id: 'claudeMd',
    label: 'CLAUDE.md',
    items: [
      { id: 'md-1', name: 'CLAUDE.md', detail: 'Root project instructions' },
      { id: 'md-2', name: '.claude/CLAUDE.md', detail: 'Local overrides' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// Export Modal Component
// ─────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ExportConfigModal({ isOpen, onClose }: ExportModalProps) {
  const [activeSection, setActiveSection] = useState<string>('mcp');
  const [checked, setChecked] = useState<Set<string>>(
    new Set(SECTIONS.flatMap(s => s.items.map(i => i.id)))
  );
  const [isExporting, setIsExporting] = useState(false);

  const activeTab = SECTIONS.find(s => s.id === activeSection);

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checked);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setChecked(newChecked);
  };

  const toggleSection = (sectionId: string) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    const newChecked = new Set(checked);
    const sectionItemIds = section.items.map(i => i.id);
    const allChecked = sectionItemIds.every(id => newChecked.has(id));

    sectionItemIds.forEach(id => {
      if (allChecked) {
        newChecked.delete(id);
      } else {
        newChecked.add(id);
      }
    });
    setChecked(newChecked);
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Build export data
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projectPath: '/Users/alice/my-project',
      sections: SECTIONS.reduce((acc, section) => {
        const sectionItems = section.items.filter(item => checked.has(item.id));
        if (sectionItems.length > 0) {
          acc[section.id] = sectionItems;
        }
        return acc;
      }, {} as Record<string, ConfigItem[]>),
    };

    // Trigger download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.claude-export.json';
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  const totalChecked = checked.size;
  const activeItems = activeTab?.items.filter(i => checked.has(i.id)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#1a1a22] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h3 className="text-base font-semibold text-gray-200">
              Export Configuration
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Select sections to include in your export file
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-white/5 overflow-y-auto bg-black/30 py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-600 px-4 mb-2">
              Sections
            </div>
            {SECTIONS.map(section => {
              const sectionItems = section.items.filter(i => checked.has(i.id));
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                    activeSection === section.id
                      ? 'text-accent bg-accent/10 border-l-3 border-accent pl-[calc(1rem-3px)]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <span className="font-medium truncate">{section.label}</span>
                  <span className="ml-auto text-[10px] font-medium text-gray-500">
                    {sectionItems.length}/{section.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {activeTab && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs text-gray-500">
                    {activeTab.label}
                    {activeTab.items.length > 0 && (
                      <span className="text-green-400 ml-2">
                        {activeItems.length} selected
                      </span>
                    )}
                  </span>
                  {activeTab.items.length > 0 && (
                    <button
                      onClick={() => toggleSection(activeTab.id)}
                      className="text-[10px] text-gray-500 hover:text-accent transition-colors"
                    >
                      {activeItems.length === activeTab.items.length
                        ? 'Deselect all'
                        : 'Select all'}
                    </button>
                  )}
                </div>

                {activeTab.items.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">
                    No items in this section
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeTab.items.map(item => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/2 cursor-pointer hover:border-accent/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="w-3.5 h-3.5 flex-shrink-0 accent-[#6c5ce7]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                            {item.detail}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={totalChecked === 0 || isExporting}
            className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting && (
              <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
            )}
            {isExporting ? 'Exporting...' : `Export (${totalChecked} items)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Import Modal Component
// ─────────────────────────────────────────────────────────────────────

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ImportConfigModal({ isOpen, onClose }: ImportModalProps) {
  const [source, setSource] = useState<'workspace' | 'file'>('workspace');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const workspaces = [
    { id: '1', name: 'Marketing Toolkit', path: '/Users/alice/projects/marketing-toolkit' },
    { id: '2', name: 'Data Pipeline', path: '/Users/alice/projects/data-pipeline' },
    { id: '3', name: 'API Service', path: '/Users/alice/projects/api-service' },
  ];

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.version !== 1) {
          alert(`Unsupported export format version ${data.version}`);
          return;
        }

        setUploadedFile(data);
      } catch (err) {
        alert('Invalid export file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleLoadWorkspace = async () => {
    setIsLoading(true);
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    alert(`Loaded workspace: ${selectedWorkspace}`);
  };

  if (!isOpen) return null;

  const totalSections = uploadedFile
    ? Object.keys(uploadedFile.sections || {}).length
    : 0;
  const totalItems = uploadedFile
    ? Object.values(uploadedFile.sections || {}).reduce(
        (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
        0
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#1a1a22] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-gray-200">
            Import Configuration
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/5 bg-black/20 px-0">
          <button
            onClick={() => setSource('workspace')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium transition-colors border-b-2 ${
              source === 'workspace'
                ? 'text-accent border-accent bg-accent/8'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <span>📦</span>
            <span>From Workspace</span>
          </button>
          <button
            onClick={() => setSource('file')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-xs font-medium transition-colors border-b-2 ${
              source === 'file'
                ? 'text-accent border-accent bg-accent/8'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <span>📄</span>
            <span>From File</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {source === 'workspace' ? (
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Select a workspace to import configuration from.
              </p>
              <div className="flex flex-col gap-2">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWorkspace(ws.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedWorkspace === ws.id
                        ? 'border-accent/60 bg-accent/10 text-gray-200'
                        : 'border-white/5 bg-white/2 text-gray-300 hover:border-accent/30 hover:bg-accent/5'
                    }`}
                  >
                    <div className="font-medium text-sm">{ws.name}</div>
                    <div className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">
                      {ws.path}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Upload a .claude-export.json file to import configuration.
              </p>

              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-accent bg-accent/15'
                      : 'border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/10'
                  }`}
                >
                  <div className="text-4xl mb-3 opacity-60">📥</div>
                  <div className="text-sm text-gray-200 font-medium">
                    Drag and drop your export file here
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    or click to browse
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl text-accent">✓</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">
                        {uploadedFile.projectPath?.split('/').pop()}.claude-export.json
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {totalSections} sections • {totalItems} items
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={
              source === 'workspace' ? handleLoadWorkspace : () => alert('Would import from file')
            }
            disabled={
              (source === 'workspace' && !selectedWorkspace) ||
              (source === 'file' && !uploadedFile) ||
              isLoading
            }
            className="px-4 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
            )}
            {source === 'workspace'
              ? isLoading
                ? 'Loading...'
                : 'Load Workspace'
              : 'Import from File'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Dashboard Component
// ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 p-8">
      {/* Tailwind CSS (embedded for prototype) */}
      <style>{`
        @import url('https://cdn.tailwindcss.com');
        :root {
          --accent: #6c5ce7;
        }
        .accent { color: var(--accent); }
        .bg-accent { background-color: var(--accent); }
        .text-accent { color: var(--accent); }
        .bg-accent\\\/8 { background-color: rgba(108, 92, 231, 0.08); }
        .bg-accent\\\/5 { background-color: rgba(108, 92, 231, 0.05); }
        .bg-accent\\\/10 { background-color: rgba(108, 92, 231, 0.1); }
        .bg-accent\\\/15 { background-color: rgba(108, 92, 231, 0.15); }
        .bg-accent\\\/20 { background-color: rgba(108, 92, 231, 0.2); }
        .bg-accent\\\/30 { background-color: rgba(108, 92, 231, 0.3); }
        .border-accent { border-color: var(--accent); }
        .border-accent\\\/8 { border-color: rgba(108, 92, 231, 0.08); }
        .border-accent\\\/10 { border-color: rgba(108, 92, 231, 0.1); }
        .border-accent\\\/15 { border-color: rgba(108, 92, 231, 0.15); }
        .border-accent\\\/30 { border-color: rgba(108, 92, 231, 0.3); }
        .border-accent\\\/50 { border-color: rgba(108, 92, 231, 0.5); }
        .border-accent\\\/60 { border-color: rgba(108, 92, 231, 0.6); }
        .text-accent\\\/80 { color: rgba(108, 92, 231, 0.8); }
        .bg-white\\\/2 { background-color: rgba(255, 255, 255, 0.02); }
        .bg-white\\\/5 { background-color: rgba(255, 255, 255, 0.05); }
        .bg-white\\\/10 { background-color: rgba(255, 255, 255, 0.1); }
        .border-white\\\/5 { border-color: rgba(255, 255, 255, 0.05); }
        .border-white\\\/10 { border-color: rgba(255, 255, 255, 0.1); }
        .border-l-3 { border-left-width: 3px; }
        .pl-\\[calc\\(1rem-3px\\)\\] { padding-left: calc(1rem - 3px); }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Configuration Overview</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <span className="text-gray-400">Project:</span>{' '}
                <span className="text-gray-300 font-mono">/Users/alice/my-project</span>
              </span>
              <span className="text-white/10">|</span>
              <span>
                <span className="text-gray-400">Scanned:</span>{' '}
                <span className="text-gray-300">{new Date().toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-1.5"
            >
              <span>↓</span>
              Import from Workspace
            </button>

            <button
              onClick={() => setShowExport(true)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-1.5"
            >
              <span>↑</span>
              Export Config
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-6 bg-accent/5 border border-accent/20 rounded-lg mb-8">
        <h3 className="font-semibold mb-2">Interactive Prototype</h3>
        <p className="text-sm text-gray-400 mb-3">
          Click the "Export Config" or "Import from Workspace" buttons above to see the modals in action.
        </p>
        <ul className="text-sm text-gray-400 space-y-1 ml-4">
          <li>• Try selecting/deselecting sections and items</li>
          <li>• Drag and drop a JSON file in the import modal (from File tab)</li>
          <li>• Click "Export" to download a .claude-export.json file</li>
        </ul>
      </div>

      {/* Sample Config Cards (for context) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
          <div className="text-2xl font-bold text-accent">14</div>
          <div className="text-sm font-semibold text-gray-200 mt-1">Total Items</div>
          <div className="text-xs text-gray-500 mt-0.5">Across all sections</div>
        </div>
        <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
          <div className="text-2xl font-bold text-accent">8</div>
          <div className="text-sm font-semibold text-gray-200 mt-1">Sections</div>
          <div className="text-xs text-gray-500 mt-0.5">Ready to export</div>
        </div>
      </div>

      {/* Modals */}
      <ExportConfigModal isOpen={showExport} onClose={() => setShowExport(false)} />
      <ImportConfigModal isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
