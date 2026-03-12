import { useState } from "react";
import { ConfigScope } from "@lens/schema";
import type { ConfigSnapshot, ScopedItem, SettingsFile } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator";
import { useConfigUpdate } from "../hooks/useConfigUpdate";
import { RawJsonView } from "./RawJsonView";

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

function ScopePicker({
  files,
  onPick,
  onCancel,
}: {
  files: SettingsFile[];
  onPick: (scope: ConfigScope, filePath: string) => void;
  onCancel: () => void;
}) {
  const editableFiles = files.filter((f) => f.editable);
  const projectFile = editableFiles.find(
    (f) => f.scope === ConfigScope.Project,
  );
  const globalFile = editableFiles.find((f) => f.scope === ConfigScope.Global);
  const options = [projectFile, globalFile].filter(Boolean) as SettingsFile[];

  if (options.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-gray-500">Scope:</span>
      {options.map((f) => (
        <button
          key={f.scope}
          onClick={() => onPick(f.scope, f.filePath)}
          className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent transition-colors hover:bg-accent/20"
        >
          {f.scope}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="px-2 py-0.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  );
}

function BooleanCard({
  label,
  item,
  settingsKey,
  onToggle,
  onInitialize,
  settingsFiles,
  saving,
}: {
  label: string;
  item: ScopedItem<boolean> | null;
  settingsKey: string;
  onToggle: (key: string, item: ScopedItem<boolean>) => void;
  onInitialize: (
    key: string,
    scope: ConfigScope,
    filePath: string,
    value: boolean,
  ) => void;
  settingsFiles: SettingsFile[];
  saving: boolean;
}) {
  const [showScopePicker, setShowScopePicker] = useState(false);

  if (!item) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-1 text-sm text-gray-400">{label}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Not configured</span>
          {!showScopePicker && (
            <button
              onClick={() => setShowScopePicker(true)}
              disabled={saving}
              className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              Initialize
            </button>
          )}
        </div>
        {showScopePicker && (
          <ScopePicker
            files={settingsFiles}
            onPick={(scope, filePath) => {
              onInitialize(settingsKey, scope, filePath, false);
              setShowScopePicker(false);
            }}
            onCancel={() => setShowScopePicker(false)}
          />
        )}
      </div>
    );
  }
  const canEdit = item.scope !== ConfigScope.Managed;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <ScopeIndicator scope={item.scope} />
      </div>
      <div className="flex items-center gap-2">
        {canEdit ? (
          <button
            onClick={() => onToggle(settingsKey, item)}
            disabled={saving}
            className={`relative h-5 w-10 rounded-full transition-colors disabled:opacity-50 ${
              item.value ? "bg-green-500/40" : "bg-gray-600/40"
            }`}
            title={`Click to ${item.value ? "disable" : "enable"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                item.value ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        ) : (
          <span
            className={`h-2 w-2 rounded-full ${item.value ? "bg-green-400" : "bg-gray-600"}`}
          />
        )}
        <span
          className={`text-sm font-medium ${item.value ? "text-green-400" : "text-gray-500"}`}
        >
          {item.value ? "Enabled" : "Disabled"}
        </span>
      </div>
    </div>
  );
}

export function SandboxPanel({ config, onRescan }: Props) {
  const { enabled, autoAllowBashIfSandboxed } = config.sandbox;
  const { update, saving, error } = useConfigUpdate(onRescan);
  const [view, setView] = useState<"effective" | "json">("effective");
  const [jumpTarget, setJumpTarget] = useState<{
    filePath: string;
    key: string;
  } | null>(null);

  function _jumpToFile(key: string, filePath: string) {
    setJumpTarget({ filePath, key });
    setView("json");
  }

  function toggleBoolean(key: string, item: ScopedItem<boolean>) {
    void update({
      surface: "sandbox",
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: !item.value,
    });
  }

  function initializeSetting(
    key: string,
    scope: ConfigScope,
    filePath: string,
    value: unknown,
  ) {
    void update({
      surface: "sandbox",
      scope,
      filePath,
      key,
      value,
    });
  }

  function _addListItem(
    key: string,
    item: ScopedItem<string[]>,
    value: string,
  ) {
    void update({
      surface: "sandbox",
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: [...item.value, value],
    });
  }

  function _removeListItem(
    key: string,
    item: ScopedItem<string[]>,
    index: number,
  ) {
    const newValue = item.value.filter((_, i) => i !== index);
    void update({
      surface: "sandbox",
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: newValue,
    });
  }

  const settingsFiles = config.settings.files;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-bold">Sandbox</h2>
        <div className="flex overflow-hidden rounded-lg border border-border bg-card">
          <button
            onClick={() => {
              setView("effective");
              setJumpTarget(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "effective" ? "bg-accent/20 text-accent" : "text-gray-400 hover:text-gray-200"}`}
          >
            Effective
          </button>
          <button
            onClick={() => setView("json")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "json" ? "bg-accent/20 text-accent" : "text-gray-400 hover:text-gray-200"}`}
          >
            JSON
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Process isolation and network restrictions
      </p>

      {view === "json" ? (
        <RawJsonView
          files={config.settings.files.map((f) => ({
            scope: f.scope,
            filePath: f.filePath,
          }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BooleanCard
              label="Sandbox Enabled"
              item={enabled}
              settingsKey="sandbox.enabled"
              onToggle={toggleBoolean}
              onInitialize={initializeSetting}
              settingsFiles={settingsFiles}
              saving={saving}
            />
            <BooleanCard
              label="Auto-allow Bash if Sandboxed"
              item={autoAllowBashIfSandboxed}
              settingsKey="sandbox.autoAllowBashIfSandboxed"
              onToggle={toggleBoolean}
              onInitialize={initializeSetting}
              settingsFiles={settingsFiles}
              saving={saving}
            />
          </div>
        </>
      )}
    </div>
  );
}
