import { useState } from "react";
import { ConfigScope, EntrySource } from "@lens/schema";
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

export function SkillsPanel({ config, onRescan }: Props) {
  const { skills } = config.skills;
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

  // Create skill form state
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

  const filtered = skills
    .filter((s) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.pluginName ?? "").toLowerCase().includes(q)
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

    const basePath =
      createScope === ConfigScope.Project
        ? `${config.projectPath}/.claude/skills/${name}/SKILL.md`
        : `${config.globalPath}/skills/${name}/SKILL.md`;

    const content = `---
name: ${name}
description: ${description}
user-invocable: true
---

# ${name}

TODO: Write your skill instructions here.
`;

    await update({
      surface: "skills",
      scope: createScope,
      filePath: basePath,
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
    if (!window.confirm(`Delete skill "${name}"? This cannot be undone.`))
      return;
    await deleteFile(filePath);
  }

  function getScopeOptions(skill: (typeof skills)[number]) {
    if (
      skill.source === EntrySource.Plugin ||
      skill.scope === ConfigScope.Managed
    )
      return [];
    if (skill.scope === ConfigScope.Project) {
      return config.allowGlobalWrites
        ? [
            {
              label: "Global",
              scope: ConfigScope.Global,
              onCopy: async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(skill.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "skills",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/skills/${skill.name}/SKILL.md`,
                  value: content,
                });
              },
              onMove: async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(skill.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "skills",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/skills/${skill.name}/SKILL.md`,
                  value: content,
                });
                await deleteFile(skill.filePath);
              },
            },
          ]
        : [];
    }
    if (skill.scope === ConfigScope.Global) {
      return [
        {
          label: "Project",
          scope: ConfigScope.Project,
          onCopy: async () => {
            const res = await fetch(
              `/api/file?path=${encodeURIComponent(skill.filePath)}`,
            );
            const { content } = await res.json();
            await update({
              surface: "skills",
              scope: ConfigScope.Project,
              filePath: `${config.projectPath}/.claude/skills/${skill.name}/SKILL.md`,
              value: content,
            });
          },
          onMove: config.allowGlobalWrites
            ? async () => {
                const res = await fetch(
                  `/api/file?path=${encodeURIComponent(skill.filePath)}`,
                );
                const { content } = await res.json();
                await update({
                  surface: "skills",
                  scope: ConfigScope.Project,
                  filePath: `${config.projectPath}/.claude/skills/${skill.name}/SKILL.md`,
                  value: content,
                });
                await deleteFile(skill.filePath);
              }
            : undefined,
        },
      ];
    }
    return [];
  }

  return (
    <PanelShell
      title="Skills"
      subtitle={`${skills.length} skill${skills.length !== 1 ? "s" : ""} configured`}
      actions={
        <AddButton onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "+ New Skill"}
        </AddButton>
      }
      view={view}
      onViewChange={(v) => {
        setView(v as "effective" | "json");
        if (v === "effective") setJumpTarget(null);
      }}
      viewOptions={[
        { value: "effective", label: "Effective" },
        { value: "json", label: "Files" },
      ]}
    >
      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-200">
            Create New Skill
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Skill Name (used as directory name)
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="my-skill"
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
                placeholder="What this skill does..."
                className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-gray-400">Scope</label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="createScope"
                    value={ConfigScope.Project}
                    checked={createScope === ConfigScope.Project}
                    onChange={() => setCreateScope(ConfigScope.Project)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-gray-300">Project</span>
                  <span className="font-mono text-xs text-gray-500">
                    .claude/skills/
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="createScope"
                    value={ConfigScope.Global}
                    checked={createScope === ConfigScope.Global}
                    onChange={() => setCreateScope(ConfigScope.Global)}
                    className="accent-accent"
                  />
                  <span className="text-sm text-gray-300">Global</span>
                  <span className="font-mono text-xs text-gray-500">
                    ~/.claude/skills/
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
                {createSaving ? "Creating..." : "Create Skill"}
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
          files={skills.map((s) => ({ scope: s.scope, filePath: s.filePath }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      ) : (
        <>
          {skills.length === 0 && !showCreateForm ? (
            <PanelEmpty>No skills configured</PanelEmpty>
          ) : (
            <>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search skills..."
                itemCount={skills.length}
                filteredCount={filtered.length}
              />
              <div className="space-y-3">
                {filtered.map((skill, i) => (
                  <PanelRow
                    key={`${slug(skill.name)}-${skill.scope}`}
                    expanded={expanded.has(i)}
                    onToggle={() => toggleRow(i)}
                    label={skill.name}
                    trigger={
                      <>
                        <span className="font-semibold text-gray-200">
                          {skill.name}
                        </span>
                        <ScopeIndicator scope={skill.scope} />
                        <SourceBadge pluginName={skill.pluginName} />
                      </>
                    }
                    actions={
                      skill.source !== EntrySource.Plugin &&
                      skill.scope !== ConfigScope.Managed ? (
                        <>
                          <ScopeMoveButton
                            options={getScopeOptions(skill)}
                            saving={createSaving || deleting}
                          />
                          {(skill.scope !== ConfigScope.Global ||
                            config.allowGlobalWrites) && (
                            <DeleteButton
                              onClick={() =>
                                void handleDelete(skill.filePath, skill.name)
                              }
                              disabled={deleting}
                              title={`Delete skill "${skill.name}"`}
                            />
                          )}
                        </>
                      ) : undefined
                    }
                  >
                    <div className="space-y-3 border-t border-border px-4 py-4">
                      {(skill.userInvocable ||
                        skill.hasHooks ||
                        skill.model) && (
                        <div className="flex flex-wrap gap-2">
                          {skill.userInvocable && (
                            <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                              User Invocable
                            </span>
                          )}
                          {skill.hasHooks && (
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                              Has Hooks
                            </span>
                          )}
                          {skill.model && (
                            <span className="rounded bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400">
                              {skill.model}
                            </span>
                          )}
                        </div>
                      )}
                      {skill.description && (
                        <p className="text-sm text-gray-400">
                          {skill.description}
                        </p>
                      )}
                      {skill.allowedTools && skill.allowedTools.length > 0 && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500">
                            Allowed Tools
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {skill.allowedTools.map((tool) => (
                              <span
                                key={tool}
                                className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-gray-400"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => jumpToFile(skill.name, skill.filePath)}
                        className="block truncate font-mono text-xs text-gray-600 transition-colors hover:text-accent"
                        title={skill.filePath}
                      >
                        {skill.filePath} ↗
                      </button>
                      {skill.scope !== ConfigScope.Managed &&
                        skill.source !== EntrySource.Plugin &&
                        (expanded.has(i) && editingIdx === i ? (
                          <EditableContent
                            content={editContent}
                            filePath={skill.filePath}
                            scope={skill.scope}
                            surface="skills"
                            onRescan={() => {
                              setEditingIdx(null);
                              onRescan();
                            }}
                            readOnly={
                              skill.scope === ConfigScope.Global &&
                              !config.allowGlobalWrites
                            }
                          />
                        ) : (
                          <button
                            onClick={() => void loadContent(i, skill.filePath)}
                            disabled={loadingIdx === i}
                            className="rounded bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          >
                            {(() => {
                              if (loadingIdx === i) return "Loading...";
                              if (
                                skill.scope === ConfigScope.Global &&
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
