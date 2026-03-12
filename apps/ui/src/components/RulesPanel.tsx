import { useState } from "react";
import { ConfigScope } from "@lens/schema";
import type { ConfigSnapshot } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator";
import { EditableContent } from "./EditableContent";
import { RawJsonView } from "./RawJsonView";
import { useConfigUpdate } from "../hooks/useConfigUpdate";
import { useFileDelete } from "../hooks/useFileDelete";
import { SearchBar } from "./SearchBar";
import { ScopeMoveButton } from "./ScopeMoveButton.js";
import { PanelRow, DeleteButton } from "./panel/index.js";
import { slug } from "../constants.js";

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

type ViewTab = "rules" | "raw";

function CreateRuleForm({
  config,
  onRescan,
  onClose,
}: {
  config: ConfigSnapshot;
  onRescan: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ConfigScope.Project | ConfigScope.Global>(
    ConfigScope.Project,
  );

  const { update, saving, error } = useConfigUpdate(() => {
    onRescan();
    onClose();
  });

  const sanitizedName = name.trim().replace(/\.mdc?$/, "");
  const filePath =
    scope === ConfigScope.Project
      ? `${config.projectPath}/.claude/rules/${sanitizedName}.mdc`
      : `${config.globalPath}/rules/${sanitizedName}.mdc`;

  function handleSave() {
    if (!sanitizedName) return;
    void update({
      surface: "rules",
      scope,
      filePath,
      value: "# " + sanitizedName + "\n\nTODO: Add rule content here.\n",
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">New Rule</h3>

      {error && (
        <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Rule name (becomes filename, e.g.{" "}
            <code className="font-mono">my-rule</code> →{" "}
            <code className="font-mono">my-rule.mdc</code>)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-rule"
            className="w-full rounded border border-border bg-bg px-3 py-1.5 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Scope</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope(ConfigScope.Project)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                scope === ConfigScope.Project
                  ? "border border-accent/40 bg-accent/20 text-accent"
                  : "border border-border bg-bg text-gray-400 hover:bg-white/5"
              }`}
            >
              Project
            </button>
            <button
              onClick={() => setScope(ConfigScope.Global)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                scope === ConfigScope.Global
                  ? "border border-accent/40 bg-accent/20 text-accent"
                  : "border border-border bg-bg text-gray-400 hover:bg-white/5"
              }`}
            >
              Global
            </button>
          </div>
        </div>

        {/* Resolved path preview */}
        {sanitizedName && (
          <div className="truncate rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-gray-500">
            {filePath}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !sanitizedName}
            className="rounded bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Rule"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded bg-gray-500/20 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-500/30 disabled:opacity-50"
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
  const [viewTab, setViewTab] = useState<ViewTab>("rules");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [jumpTarget, setJumpTarget] = useState<{
    filePath: string;
    key: string;
  } | null>(null);

  const { update, saving } = useConfigUpdate(onRescan);
  const { deleteFile, deleting } = useFileDelete(onRescan);

  function jumpToFile(name: string, filePath: string) {
    setJumpTarget({ filePath, key: name });
    setViewTab("raw");
  }

  async function handleDelete(filePath: string, ruleName: string) {
    if (
      !window.confirm(
        `Delete rule "${ruleName}"?\n\nThis will permanently delete:\n${filePath}`,
      )
    )
      return;
    await deleteFile(filePath);
  }

  function getScopeOptions(rule: (typeof rules)[number]) {
    if (rule.scope === ConfigScope.Managed) return [];
    if (rule.scope === ConfigScope.Project) {
      return config.allowGlobalWrites
        ? [
            {
              label: "Global",
              scope: ConfigScope.Global,
              onCopy: async () => {
                await update({
                  surface: "rules",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/rules/${rule.name}.mdc`,
                  value: rule.content,
                });
              },
              onMove: async () => {
                await update({
                  surface: "rules",
                  scope: ConfigScope.Global,
                  filePath: `${config.globalPath}/rules/${rule.name}.mdc`,
                  value: rule.content,
                });
                await deleteFile(rule.filePath);
              },
            },
          ]
        : [];
    }
    if (rule.scope === ConfigScope.Global) {
      return [
        {
          label: "Project",
          scope: ConfigScope.Project,
          onCopy: async () => {
            await update({
              surface: "rules",
              scope: ConfigScope.Project,
              filePath: `${config.projectPath}/.claude/rules/${rule.name}.mdc`,
              value: rule.content,
            });
          },
          onMove: config.allowGlobalWrites
            ? async () => {
                await update({
                  surface: "rules",
                  scope: ConfigScope.Project,
                  filePath: `${config.projectPath}/.claude/rules/${rule.name}.mdc`,
                  value: rule.content,
                });
                await deleteFile(rule.filePath);
              }
            : undefined,
        },
      ];
    }
    return [];
  }

  const filteredRules = rules
    .filter((r) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.paths ?? []).some((p) => p.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const SCOPE_ORDER: Record<string, number> = {
        local: 0,
        project: 1,
        global: 2,
        managed: 3,
      };
      const sd = (SCOPE_ORDER[a.scope] ?? 9) - (SCOPE_ORDER[b.scope] ?? 9);
      return sd !== 0 ? sd : a.name.localeCompare(b.name);
    });

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Collect unique file refs for raw view
  const rawFiles = rules.map((r) => ({ scope: r.scope, filePath: r.filePath }));

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold">Rules</h2>
      <p className="mb-4 text-sm text-gray-400">
        Rules are{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">
          .md
        </code>{" "}
        or{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">
          .mdc
        </code>{" "}
        files in{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">
          .claude/rules/
        </code>{" "}
        that provide modular instructions to Claude. They can target specific
        file paths using a{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">
          paths
        </code>{" "}
        frontmatter field.
      </p>

      {/* Tab toggle + Create button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg p-0.5">
          <button
            onClick={() => {
              setViewTab("rules");
              setJumpTarget(null);
            }}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewTab === "rules"
                ? "bg-accent/20 text-accent"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => setViewTab("raw")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewTab === "raw"
                ? "bg-accent/20 text-accent"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Raw Files
          </button>
        </div>

        {viewTab === "rules" && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/30"
          >
            + New Rule
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && viewTab === "rules" && (
        <CreateRuleForm
          config={config}
          onRescan={onRescan}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Raw Files tab */}
      {viewTab === "raw" && (
        <RawJsonView
          files={rawFiles}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      )}

      {/* Rules tab */}
      {viewTab === "rules" && (
        <>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search rules..."
            itemCount={rules.length}
            filteredCount={filteredRules.length}
          />
          {rules.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-gray-500">
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
                      <span className="font-medium text-gray-200">
                        {rule.name}
                      </span>
                      <ScopeIndicator scope={rule.scope} />
                      <span className="shrink-0 rounded bg-bg px-2 py-0.5 text-xs text-gray-500">
                        {rule.lineCount} lines
                      </span>
                      {rule.paths && rule.paths.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rule.paths.map((p) => (
                            <span
                              key={p}
                              className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent"
                            >
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
                        <ScopeMoveButton
                          options={getScopeOptions(rule)}
                          saving={saving || deleting}
                        />
                        {(rule.scope !== ConfigScope.Global ||
                          config.allowGlobalWrites) && (
                          <DeleteButton
                            onClick={() =>
                              void handleDelete(rule.filePath, rule.name)
                            }
                            disabled={deleting}
                            title="Delete rule"
                          />
                        )}
                      </>
                    ) : undefined
                  }
                >
                  <div className="border-t border-border px-4 py-3">
                    <pre className="max-h-96 overflow-x-auto overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
                      {rule.content}
                    </pre>
                    <button
                      onClick={() => jumpToFile(rule.name, rule.filePath)}
                      className="mt-3 block truncate font-mono text-xs text-gray-600 transition-colors hover:text-accent"
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
                        readOnly={
                          rule.scope === ConfigScope.Global &&
                          !config.allowGlobalWrites
                        }
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
