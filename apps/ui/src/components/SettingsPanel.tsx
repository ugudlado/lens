import { useState } from "react";
import { ConfigScope } from "@lens/schema";
import { useEditing } from "../context/EditingContext.js";
import type { ConfigSnapshot, ScopedItem, SettingsFile } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator";
import { RawJsonView } from "./RawJsonView";
import { useConfigUpdate } from "../hooks/useConfigUpdate";
import { SearchBar } from "./SearchBar";
import {
  PanelShell,
  PanelEmpty,
  DeleteButton,
  AddButton,
} from "./panel/index.js";
import { ScopeMoveButton, type ScopeMoveOption } from "./ScopeMoveButton.js";
import { slug } from "../constants.js";

interface Props {
  config: ConfigSnapshot;
  onRescan: () => void;
}

type View = "effective" | "by-file";

const SCOPE_SORT_ORDER: Record<string, number> = {
  [ConfigScope.Local]: 0,
  [ConfigScope.Project]: 1,
  [ConfigScope.Global]: 2,
  [ConfigScope.Managed]: 3,
};

interface JumpTarget {
  filePath: string;
  key: string;
}

const COPYABLE_SCOPES: ConfigScope[] = [
  ConfigScope.Global,
  ConfigScope.Project,
  ConfigScope.Local,
];

function EditableValue({
  settingKey,
  item,
  onSave,
  saving,
}: {
  settingKey: string;
  item: ScopedItem<unknown>;
  onSave: (key: string, item: ScopedItem<unknown>, newValue: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  let displayValue: string;
  if (typeof item.value === "object" && item.value !== null) {
    displayValue = JSON.stringify(item.value);
  } else if (item.value === null || item.value === undefined) {
    displayValue = "";
  } else {
    displayValue = String(item.value as string | number | boolean);
  }
  const [editValue, setEditValue] = useState(displayValue);

  function startEdit() {
    if (!item.editable || item.scope === ConfigScope.Managed) return;
    setEditValue(displayValue);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (editValue === displayValue) return;
    onSave(settingKey, item, editValue);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        disabled={saving}
        className="flex-1 rounded border border-accent/50 bg-bg px-2 py-0.5 font-mono text-sm text-accent focus:border-accent focus:outline-none"
      />
    );
  }

  return (
    <code
      onClick={startEdit}
      className={`flex-1 truncate font-mono text-sm text-accent ${
        item.editable && item.scope !== ConfigScope.Managed
          ? "-mx-1 cursor-pointer rounded px-1 hover:bg-white/5"
          : ""
      }`}
      title={
        item.editable && item.scope !== ConfigScope.Managed
          ? "Click to edit"
          : undefined
      }
    >
      {displayValue}
    </code>
  );
}

function AddSettingForm({
  files,
  onAdd,
  onCancel,
  saving,
}: {
  files: SettingsFile[];
  onAdd: (key: string, value: unknown, file: SettingsFile) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const editableFiles = files.filter((f) => f.editable);
  const [keyName, setKeyName] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSave() {
    const trimmedKey = keyName.trim();
    if (!trimmedKey) {
      setFormError("Key name is required");
      return;
    }
    if (!editableFiles[selectedFileIdx]) {
      setFormError("No editable file selected");
      return;
    }

    // Parse value: try JSON first, fallback to string
    let parsed: unknown;
    try {
      parsed = JSON.parse(valueStr);
    } catch {
      parsed = valueStr;
    }

    setFormError(null);
    onAdd(trimmedKey, parsed, editableFiles[selectedFileIdx]);
  }

  if (editableFiles.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-gray-500">
        No editable settings files available.
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-accent/30 bg-card p-4">
      <div className="text-sm font-medium text-gray-200">Add New Setting</div>
      {formError && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
          {formError}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="w-14 flex-shrink-0 text-xs text-gray-500">
            Key
          </label>
          <input
            autoFocus
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="e.g. model, apiProvider"
            className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-gray-200 focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-14 flex-shrink-0 text-xs text-gray-500">
            Value
          </label>
          <input
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
            placeholder='e.g. true, "string", {"key": "val"}'
            className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-gray-200 focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-14 flex-shrink-0 text-xs text-gray-500">
            File
          </label>
          <select
            value={selectedFileIdx}
            onChange={(e) => setSelectedFileIdx(Number(e.target.value))}
            className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-gray-200 focus:border-accent/50 focus:outline-none"
          >
            {editableFiles.map((f, i) => (
              <option key={f.filePath} value={i}>
                [{f.scope}] {f.filePath.split("/").pop()}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-accent/20 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded bg-gray-500/20 px-3 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-500/30 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({ config, onRescan }: Props) {
  const { files, effective } = config.settings;
  const editingMode = useEditing();
  const [view, setView] = useState<View>("effective");
  const [showAddForm, setShowAddForm] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const { update, saving, error } = useConfigUpdate(onRescan);

  function jumpToFile(key: string, filePath: string) {
    setJumpTarget({ filePath, key });
    setView("by-file");
  }

  function saveValue(key: string, item: ScopedItem<unknown>, newValue: string) {
    // Try to parse as JSON first (for objects/arrays/numbers/booleans)
    let parsed: unknown;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      parsed = newValue;
    }

    void update({
      surface: "settings",
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: parsed,
    });
  }

  async function copyToScope(
    key: string,
    value: unknown,
    targetFile: SettingsFile,
  ) {
    await update({
      surface: "settings",
      scope: targetFile.scope,
      filePath: targetFile.filePath,
      key,
      value,
    });
  }

  async function moveToScope(
    key: string,
    value: unknown,
    targetFile: SettingsFile,
    sourceItem: ScopedItem<unknown>,
  ) {
    // First write to target
    await update({
      surface: "settings",
      scope: targetFile.scope,
      filePath: targetFile.filePath,
      key,
      value,
    });
    // Then delete from source
    await update({
      surface: "settings",
      scope: sourceItem.scope,
      filePath: sourceItem.filePath,
      key,
      value: null,
      delete: true,
    });
  }

  function deleteSetting(key: string, item: ScopedItem<unknown>) {
    if (!confirm(`Delete setting "${key}" from ${item.scope} scope?`)) return;
    void update({
      surface: "settings",
      scope: item.scope,
      filePath: item.filePath,
      key,
      value: null,
      delete: true,
    });
  }

  function addSetting(key: string, value: unknown, file: SettingsFile) {
    void update({
      surface: "settings",
      scope: file.scope,
      filePath: file.filePath,
      key,
      value,
    });
    setShowAddForm(false);
  }

  const [search, setSearch] = useState("");
  const effectiveEntries = Object.entries(effective);

  const filteredEntries = effectiveEntries
    .filter(([key, item]) => {
      const q = search.toLowerCase();
      if (!q) return true;
      let valStr: string;
      if (typeof item.value === "object" && item.value !== null) {
        valStr = JSON.stringify(item.value);
      } else if (item.value === null || item.value === undefined) {
        valStr = "";
      } else {
        valStr = String(item.value as string | number | boolean);
      }
      return key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q);
    })
    .sort(([keyA, a], [keyB, b]) => {
      const sd =
        (SCOPE_SORT_ORDER[a.scope] ?? 9) - (SCOPE_SORT_ORDER[b.scope] ?? 9);
      return sd !== 0 ? sd : keyA.localeCompare(keyB);
    });

  return (
    <PanelShell
      title="Settings"
      subtitle={`${effectiveEntries.length} effective settings from ${files.length} file${files.length !== 1 ? "s" : ""}`}
      actions={
        editingMode && view === "effective" ? (
          <AddButton variant="header" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Cancel" : "+ Add Setting"}
          </AddButton>
        ) : undefined
      }
      view={view}
      onViewChange={(v) => {
        setView(v as View);
        setJumpTarget(null);
      }}
      viewOptions={[
        {
          value: "effective",
          label: "Effective",
          title: "Merged view of all active config across scopes",
        },
        {
          value: "by-file",
          label: "Files",
          title: "Per-file breakdown showing which scope defines each value",
        },
      ]}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {view === "effective" ? (
        <>
          {showAddForm && (
            <AddSettingForm
              files={files}
              onAdd={addSetting}
              onCancel={() => setShowAddForm(false)}
              saving={saving}
            />
          )}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search settings..."
            itemCount={effectiveEntries.length}
            filteredCount={filteredEntries.length}
          />
          {effectiveEntries.length === 0 ? (
            <PanelEmpty>No settings configured</PanelEmpty>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {filteredEntries.map(([key, item]) => (
                <div
                  key={key}
                  id={`setting-${slug(key)}-${item.scope}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-shrink-0 text-sm font-medium text-gray-200">
                    {key}
                  </span>
                  <EditableValue
                    settingKey={key}
                    item={item}
                    onSave={saveValue}
                    saving={saving}
                  />
                  <ScopeIndicator scope={item.scope} />
                  {editingMode && (
                    <ScopeMoveButton
                      saving={saving}
                      options={COPYABLE_SCOPES.filter(
                        (s) => s !== item.scope,
                      ).flatMap((scope) => {
                        const file = files.find((f) => f.scope === scope);
                        if (!file?.editable) return [];
                        const option: ScopeMoveOption = {
                          label: scope,
                          scope,
                          filePath: file.filePath,
                          onCopy: () => copyToScope(key, item.value, file),
                          onMove:
                            item.editable && item.scope !== ConfigScope.Managed
                              ? async () =>
                                  moveToScope(key, item.value, file, item)
                              : undefined,
                        };
                        return [option];
                      })}
                    />
                  )}
                  {editingMode &&
                    item.editable &&
                    item.scope !== ConfigScope.Managed && (
                      <DeleteButton
                        onClick={() => deleteSetting(key, item)}
                        disabled={saving}
                        title={`Delete "${key}" from ${item.scope} scope`}
                      />
                    )}
                  <button
                    onClick={() => jumpToFile(key, item.filePath)}
                    className="max-w-[180px] truncate font-mono text-xs text-gray-600 transition-colors hover:text-accent"
                    title={`View in file: ${item.filePath}`}
                  >
                    {item.filePath.split("/").pop()} ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <RawJsonView
          files={files.map((f) => ({ scope: f.scope, filePath: f.filePath }))}
          onRescan={onRescan}
          autoExpandFile={jumpTarget?.filePath}
          highlightKey={jumpTarget?.key}
        />
      )}
    </PanelShell>
  );
}
