# Design: Sync Export and Import for Plugins + Fix Import Accessibility

## Context

The export/import feature has asymmetric section coverage. Export produces 8 sections (mcp, hooks, skills, agents, rules, commands, permissions, claudeMd) but excludes plugins. Import supports plugins from workspaces but not from JSON files. The import button is also inaccessible without multiple workspaces.

## Goals / Non-Goals

### Goals

- Complete plugin roundtrip: export → JSON → import → installed
- File import accessible regardless of workspace count
- Consistent UX between workspace and file import paths

### Non-Goals

- Exporting full plugin file contents (plugins are marketplace references)
- Adding claudeMd to import
- Changing the export JSON version number (additive change)

## Technical Design

### Components

**1. Schema — `PluginExport` type**

```typescript
// packages/schema/src/index.ts
export interface PluginExport {
  name: string;
  marketplace: string;
}

// Add to ExportSections:
export interface ExportSections {
  // ... existing fields ...
  plugins?: PluginExport[];
}
```

**2. Server — Export route plugin handler**

```typescript
// apps/server/src/routes/export.ts
// Add 'plugins' to VALID_SECTIONS
// Add handler:
if (requestedSections.includes('plugins')) {
  sections.plugins = config.plugins.plugins
    .filter(p => p.scope === PluginScope.Project)
    .map(p => ({ name: p.name, marketplace: p.marketplace }));
}
```

**3. Export Modal — Plugin section**

Add `'plugins'` to `ExportSectionId`. Build plugin items from `config.plugins.plugins` filtered by `PluginScope.Project`. Add client-side pruning for unchecked plugins in `handleExport()`.

Plugin display key: `name@marketplace` (consistent with import modal's `pluginKey`).

**4. Import Modal — File import plugin parsing**

In `loadFromFile()`, map `data.sections.plugins` to `PluginEntry` objects:

```typescript
plugins: (data.sections.plugins ?? []).map(p => ({
  name: safeName(p.name),
  marketplace: p.marketplace,
  version: '',
  installPath: '',
  installedAt: '',
  enabled: true,
  scope: PluginScope.Project,
} as PluginEntry)),
```

Fix `handleImport()` plugin install — add `res.ok` check:

```typescript
const res = await fetch('/api/plugins', { ... });
if (!res.ok) {
  const body = await res.json().catch(() => ({})) as { error?: string };
  throw new Error(body.error ?? `Plugin install failed: ${pluginKey(p)}`);
}
```

Add plugins pre-check loop in `loadFromFile()` (alongside existing loops for other sections):

```typescript
for (const p of items.plugins) {
  if (!existingKeys.plugins.has(pluginKey(p))) newChecked.plugins.add(pluginKey(p));
}
```

Fix inline switch for "new count" in checklist header — add `case 'plugins': return pluginKey(item as PluginEntry) === k;` via `POST /api/plugins`.

**5. Dashboard — Import button visibility**

Change:
```tsx
// Before:
{otherWorkspaces.length > 0 && onRescan && (
// After:
{onRescan && (
```

**6. Import Modal — Dynamic title and sidebar label**

- Track import source in state (already tracked as `importSource`)
- Track filename for file imports: `const [importFileName, setImportFileName] = useState<string>('')`
- Modal title: `"Import Configuration"` (static rename, covers both sources)
- Sidebar label: `From: {selectedWorkspace?.name}` for workspace, `From: {importFileName}` for file
- Dashboard button text: rename from "Import from Workspace" to "Import Config"

### Data Flow

```
EXPORT:
  config.plugins.plugins → filter(PluginScope.Project) → map({name, marketplace})
  → ExportData.sections.plugins → JSON download

IMPORT (from file):
  JSON file → parse → data.sections.plugins
  → map to PluginEntry[] → checklist → POST /api/plugins
  → marketplace install → onRescan()

IMPORT (from workspace):  [unchanged]
  GET /api/config → filter project plugins → checklist → POST /api/plugins
```

### Error Handling

- Plugin names from JSON validated via existing `safeName()` (rejects `/`, `\`, `..`)
- Marketplace field validated — must be non-empty string, run through `safeName()` to reject path traversal
- Plugin install failures during import caught by existing try/catch in `handleImport()`
- Missing `plugins` field in JSON gracefully handled via `?? []`

## Risks & Trade-offs

1. **Plugin availability** — An exported plugin may not exist in the target system's marketplace. The install will fail gracefully and `handleImport()` catches the error. This is acceptable — same risk exists for workspace imports.
2. **Version pinning** — We don't export/import specific versions. The import installs the latest available version. This is intentional — version pinning would add complexity for minimal value since plugins update frequently.

## Open Questions

None — design is straightforward extension of existing patterns.
