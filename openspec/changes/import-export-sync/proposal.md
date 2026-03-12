# Proposal: Sync Export and Import for Plugins + Fix Import Accessibility

## Why

The export feature produces a `.claude-export.json` bundle with 8 config sections, but plugins are missing from the export. Meanwhile, the import modal supports installing plugins from workspaces but not from exported JSON files. Additionally, the "Import" button is hidden when no other workspaces exist — making the "From File" tab completely unreachable for single-workspace setups.

These gaps break the export→import roundtrip for plugins and prevent file-based import from being used at all in some environments.

## What Changes

1. **Add plugins to export** — Export project-scoped plugins (name + marketplace identifier) in the JSON bundle
2. **Add plugins to file import** — Parse plugin entries from exported JSON and install them via the existing `POST /api/plugins` endpoint
3. **Make import button always visible** — Remove the `otherWorkspaces.length > 0` gate so file import is always accessible
4. **Update modal title dynamically** — Show "Import Configuration" instead of hardcoded "Import from Workspace" since both sources are supported
5. **Fix sidebar label for file imports** — Show the filename instead of empty workspace name

## Capabilities

### New

- Plugins included in exported JSON bundles
- Plugins from JSON files can be imported (installed from marketplace)
- File-based import accessible even with no other workspaces

### Modified

- Export modal gains a "Plugins" section in its checklist
- Export server route handles `plugins` as a valid section
- Import modal title and sidebar label adapt to the import source
- Dashboard import button no longer gated on workspace count

## Alternatives Considered

- **Export full plugin contents (files, configs)** — Rejected. Plugins are marketplace-installable packages, not serializable config. Exporting `name@marketplace` is sufficient for reinstallation, matching how workspace import already works.
- **Separate "Import from File" button** — Rejected. The existing tabbed modal is the right pattern; just needs to be reachable.

## Impact

- No breaking changes to the export JSON format (additive — new `plugins` field in `ExportSections`)
- Existing `.claude-export.json` files without `plugins` continue to work (field is optional)
- Single-workspace users gain access to file import for the first time

## Linear Ticket

none
