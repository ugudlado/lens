---
mode: non-tdd
feature-id: import-export-sync
linear-ticket: none
---

# Specification: Sync Export and Import for Plugins + Fix Import Accessibility

## Overview

Close the export↔import gap by adding plugins to the export JSON format, enabling plugin import from JSON files, and making file-based import accessible regardless of workspace count.

## Requirements

### Functional

1. **Export plugins** — `GET /api/export` includes project-scoped plugins when the `plugins` section is requested. Each plugin exports as `{ name, marketplace }`.
2. **Export UI** — `ExportConfigModal` shows a "Plugins" section in the sidebar with project-scoped plugins listed as checkable items.
3. **Import plugins from file** — `loadFromFile()` in `WorkspaceConfigImportModal` parses `data.sections.plugins` and maps entries to `PluginEntry` objects for installation. Must also add the pre-check loop for plugins (pre-select items that don't already exist).
4. **Plugin install on import** — `handleImport()` installs checked plugins via `POST /api/plugins` with `PluginAction.Install`, same as workspace import. Must check `res.ok` and throw on failure (existing code silently ignores errors — fix as part of this change).
5. **Import button always visible** — Dashboard shows the import button unconditionally (not gated on `otherWorkspaces.length > 0`). Update button text from "Import from Workspace" to "Import Config".
6. **Generic modal title** — Import modal header shows "Import Configuration" (static string replacing hardcoded "Import from Workspace").
7. **Source-aware sidebar label** — When importing from file, sidebar shows the filename (track via new `importFileName` state); when importing from workspace, shows the workspace name.
8. **Client-side plugin filtering on export** — After fetching export data, prune unchecked plugins before download (consistent with other sections). Use `name@marketplace` as the pruning key.
9. **Fix "new count" display for plugins** — The inline switch in the checklist header's "X new" count calculation is missing the `plugins` case. Add it (or replace inline switch with `getKey()` call).

### Non-Functional

1. Existing `.claude-export.json` files without a `plugins` field remain valid (optional field).
2. No new API endpoints required — reuses existing `GET /api/export` and `POST /api/plugins`.
3. Plugin names from imported JSON are validated (no path traversal characters).
4. Plugin `marketplace` field validated — must be a non-empty string without path traversal characters.

## Architecture

### Schema (`packages/schema/src/index.ts`)

- Add `PluginExport` interface: `{ name: string; marketplace: string }`
- Add `plugins?: PluginExport[]` to `ExportSections`
- Add `'plugins'` to server-side `VALID_SECTIONS`

### Server (`apps/server/src/routes/export.ts`)

- Add `plugins` section handler that filters `config.plugins.plugins` by `PluginScope.Project` and maps to `{ name, marketplace }`

### UI — Export (`apps/ui/src/components/ExportConfigModal.tsx`)

- Add `'plugins'` to `ExportSectionId` union
- Build `pluginItems` from `config.plugins.plugins` filtered by project scope
- Add to `sectionItemsMap` and `checked` initialization
- Add client-side pruning in `handleExport()`

### UI — Import (`apps/ui/src/components/WorkspaceConfigImportModal.tsx`)

- In `loadFromFile()`: parse `data.sections.plugins` and map to `PluginEntry` objects
- Add plugins pre-check loop in `loadFromFile()` (pre-select new plugins, skip existing)
- Plugin key for file imports: `name@marketplace` (matching existing `pluginKey()`)
- Fix `handleImport()` plugin install: add `res.ok` check and throw on failure
- Fix inline switch for "new count" — add `plugins` case
- Add `importFileName` state, set it in `loadFromFile()`, display in sidebar label

### UI — Dashboard (`apps/ui/src/components/Dashboard.tsx`)

- Remove `otherWorkspaces.length > 0` condition from import button
- Keep `onRescan` condition (still needed)

## Acceptance Criteria

1. Given a project with plugins, when exporting, the JSON file contains a `plugins` array with `{ name, marketplace }` entries
2. Given a `.claude-export.json` with plugins, when importing from file, plugins appear in the checklist and can be installed
3. Given a single-workspace setup, the Import button is visible and clicking it shows the tabbed modal
4. Given a file import, the modal title says "Import Configuration" and sidebar shows the filename
5. Given an export JSON without `plugins` field, importing still works for all other sections

## Decisions

1. **Plugin export format is minimal** — Only `name` and `marketplace` are exported. Version, path, and other metadata are local state that gets resolved during installation. This matches how workspace import works.
2. **No claudeMd in this change** — Out of scope per user direction.
3. **Non-TDD mode** — Small UI-focused change with no complex logic. Validation via `pnpm type-check`.
