import { useState } from "react";
import { ConfigScope, EntrySource } from "@lens/schema";
import { useEditing } from "../context/EditingContext.js";
import type { ConfigSnapshot } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator";
import { EditableContent } from "./EditableContent";
import { RawJsonView } from "./RawJsonView";
import { SearchBar } from "./SearchBar";
import { useConfigUpdate } from "../hooks/useConfigUpdate";
import { useFileDelete } from "../hooks/useFileDelete";
import { SourceBadge } from "./SourceBadge.js";
import { ScopeMoveButton } from "./ScopeMoveButton.js";
import {
  PanelShell,
  PanelRow,
  PanelEmpty,
  DeleteButton,
  AddButton,
} from "./panel/index.js";
import { slug } from "../constants.js";

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

export function AgentsPanel({ config, onRescan }: Props) {
  const { agents } = config.agents;
  const editingMode = useEditing();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"effective" | "json">("effective");
  const [jumpTarget, setJumpTarget] = useState<{
    filePath: string;
    key: string;
  } | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Create agent form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createScope, setCreateScope] = useState<
    ConfigScope.Project | ConfigScope.Global
  >(ConfigScope.Project);

  const {
    update,
    saving: createSaving,
    error: createError,
  } = useConfigUpdate(onRescan);
  const { deleteFile, deleting, error: deleteError } = useFileDelete(onRescan);

  function toggleRow(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setView("json");
  }

  const filtered = agents
    .filter((a) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.pluginName ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Custom before plugin
      const aPlugin = a.pluginName ? 1 : 0;
      const bPlugin = b.pluginName ? 1 : 0;
      if (aPlugin !== bPlugin) return aPlugin - bPlugin;
      // Within each group: local → project → global → managed, then name
      const SCOPE_ORDER: Record<string, number> = {
        local: 0,
        project: 1,
        global: 2,
        managed: 3,
      };
      const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
      return sd !== 0 ? sd : a.name.localeCompare(b.name);
    });

  async function loadContent(idx: number, filePath: string) {
    if (editingIdx === idx) {
      setEditingIdx(null);
      return;
    }
    setLoadingIdx(idx);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setEditContent(data.content);
      }
    } catch {
      /* ignore */
    }
    setLoadingIdx(null);
    setEditingIdx(idx);
  }

  async function handleCreate() {
    const name = createName.trim();
    const description = createDescription.trim();
    if (!name) return;

    const filePath =
      createScope === ConfigScope.Project
        ? `${config.projectPath}/.claude/agents/${name}.md`
        : `${config.globalPath}/agents/${name}.md`;

    const content = `---
name: ${name}
description: ${description}
---

# ${name}

TODO: Write agent instructions here.
`;

    await update({
      surface: "agents",
      scope: createScope,
      filePath,
      value: content,
    });

    if (!createError) {
      setCreateName("");
      setCreateDescription("");
      setCreateScope(ConfigScope.Project);
      setShowCreateForm(false);
    }
  }

  async function handleDelete(filePath: string, name: string) {
    if (!window.confirm(`Delete agent "${name}"? This cannot be undone.`))
      return;
    await deleteFile(filePath);
  }

  function getScopeOptions(agent: (typeof agents)[number]) {
    if (
      agent.source === EntrySource.Plugin ||
      agent.scope === ConfigScope.Managed
    )
      return [];
    if (agent.scope === ConfigScope.Project) {
      return config.allowGlobalWrites
        ? [
            {
              label: "Global",
              scope: ConfigScope.Global,
              onCopy: async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(agent.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "agents",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/agents/${agent.name}.md`,
                  value: content,
                });
              },
              onMove: async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(agent.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "agents",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/agents/${agent.name}.md`,
                  value: content,
                });
                await deleteFile(agent.filePath);
              },
            },
          ]
        : [];
    }
    if (agent.scope === ConfigScope.Global) {
      return [
        {
          label: "Project",
          scope: ConfigScope.Project,
          onCopy: async () => {
            const res = await fetch(
              `/api/file?path=${encodeURIComponent(agent.filePath)}`,
            );
            const { content } = await res.json();
            await update({
              surface: "agents",
              scope: ConfigScope.Project,
              filePath: `${config.projectPath}/.claude/agents/${agent.name}.md`,
              value: content,
            });
          },
          onMove: config.allowGlobalWrites
            ? async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(agent.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "agents",
                  scope: ConfigScope.Project,
                  filePath: `${config.projectPath}/.claude/agents/${agent.name}.md`,
                  value: content,
                });
                await deleteFile(agent.filePath);
              }
            : undefined,
        },
      ];
    }
    return [];
  }

  return (
    <PanelShell
      title="Agents"
      subtitle={`${agents.length} agent${agents.length !== 1 ? "s" : ""} configured`}
      actions={
        editingMode ? (
          <AddButton onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Cancel" : "+ Add Agent"}
          </AddButton>
        ) : undefined
      }
      view={view}
      onViewChange={(v) => {
        setView(v as "effective" | "json");
        if (v === "effective") setJumpTarget(null);
      }}
      viewOptions={[
        {
          value: "effective",
          label: "Effective",
          title: "Merged view of all active config across scopes",
        },
        {
          value: "json",
          label: "Files",
          title: "Per-file breakdown showing which scope defines each value",
        },
      ]}
    >
      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-200">
            Create New Agent
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Agent Name (used as file name)
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="my-agent"
                className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Description
              </label>
              <input
                type="text"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="What this agent does..."
                className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-gray-400">Scope</label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="createAgentScope"
                    value={ConfigScope.Project}
                    checked={createScope === ConfigScope.Project}
                    onChange={() => setCreateScope(ConfigScope.Project)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-gray-300">Project</span>
                  <span className="font-mono text-xs text-gray-500">
                    .claude/agents/
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="createAgentScope"
                    value={ConfigScope.Global}
                    checked={createScope === ConfigScope.Global}
                    onChange={() => setCreateScope(ConfigScope.Global)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-gray-300">Global</span>
                  <span className="font-mono text-xs text-gray-500">
                    ~/.claude/agents/
                  </span>
                </label>
              </div>
            </div>
            {createError && (
              <p className="text-xs text-red-400">{createError}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => void handleCreate()}
                disabled={createSaving || !createName.trim()}
                className="rounded bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                {createSaving ? "Creating..." : "Create Agent"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded px-4 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteError && (
        <p className="mb-4 text-xs text-red-400">{deleteError}</p>
      )}

      {view === "json" ? (
        <RawJsonView
          files={agents.map((a) => ({ scope: a.scope, filePath: a.filePath }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      ) : (
        <>
          {agents.length === 0 && !showCreateForm ? (
            <PanelEmpty>No agents configured</PanelEmpty>
          ) : (
            <>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search agents..."
                itemCount={agents.length}
                filteredCount={filtered.length}
              />
              <div className="space-y-3">
                {filtered.map((agent, i) => (
                  <PanelRow
                    key={`agent-${slug(agent.name)}-${agent.scope}`}
                    expanded={expanded.has(i)}
                    onToggle={() => toggleRow(i)}
                    label={agent.name}
                    trigger={
                      <>
                        <span className="font-semibold text-gray-200">
                          {agent.name}
                        </span>
                        <ScopeIndicator scope={agent.scope} />
                        <SourceBadge pluginName={agent.pluginName} />
                      </>
                    }
                    actions={
                      editingMode &&
                      agent.source !== EntrySource.Plugin &&
                      agent.scope !== ConfigScope.Managed ? (
                        <>
                          <ScopeMoveButton
                            options={getScopeOptions(agent)}
                            saving={createSaving || deleting}
                          />
                          {(agent.scope !== ConfigScope.Global ||
                            config.allowGlobalWrites) && (
                            <DeleteButton
                              onClick={() =>
                                void handleDelete(agent.filePath, agent.name)
                              }
                              disabled={deleting}
                              title={`Delete agent "${agent.name}"`}
                            />
                          )}
                        </>
                      ) : undefined
                    }
                  >
                    <div className="space-y-3 border-t border-border px-4 py-4">
                      {(agent.model ??
                        agent.permissionMode ??
                        agent.memory) && (
                        <div className="flex flex-wrap gap-2">
                          {agent.model && (
                            <span className="rounded bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400">
                              {agent.model}
                            </span>
                          )}
                          {agent.permissionMode && (
                            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-400">
                              {agent.permissionMode}
                            </span>
                          )}
                          {agent.memory && (
                            <span className="rounded bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
                              memory: {agent.memory}
                            </span>
                          )}
                        </div>
                      )}
                      {agent.description && (
                        <p className="text-sm text-gray-400">
                          {agent.description}
                        </p>
                      )}
                      {agent.tools && agent.tools.length > 0 && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500">
                            Tools
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {agent.tools.map((tool) => (
                              <span
                                key={tool}
                                className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-green-400"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {agent.disallowedTools &&
                        agent.disallowedTools.length > 0 && (
                          <div>
                            <span className="text-xs uppercase tracking-wide text-gray-500">
                              Disallowed Tools
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {agent.disallowedTools.map((tool) => (
                                <span
                                  key={tool}
                                  className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-xs text-red-400"
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      <button
                        onClick={() => jumpToFile(agent.name, agent.filePath)}
                        className="block truncate font-mono text-xs text-gray-600 transition-colors hover:text-accent"
                        title={agent.filePath}
                      >
                        {agent.filePath} ↗
                      </button>
                      {agent.scope !== ConfigScope.Managed &&
                        agent.source !== EntrySource.Plugin &&
                        (expanded.has(i) && editingIdx === i ? (
                          <EditableContent
                            content={editContent}
                            filePath={agent.filePath}
                            scope={agent.scope}
                            surface="agents"
                            onRescan={() => {
                              setEditingIdx(null);
                              onRescan();
                            }}
                            readOnly={
                              agent.scope === ConfigScope.Global &&
                              !config.allowGlobalWrites
                            }
                          />
                        ) : (
                          <button
                            onClick={() => void loadContent(i, agent.filePath)}
                            disabled={loadingIdx === i}
                            className="rounded bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          >
                            {(() => {
                              if (loadingIdx === i) return "Loading...";
                              if (
                                agent.scope === ConfigScope.Global &&
                                !config.allowGlobalWrites
                              )
                                return "View";
                              return "Edit";
                            })()}
                          </button>
                        ))}
                    </div>
                  </PanelRow>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </PanelShell>
  );
}
