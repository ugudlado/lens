# Tasks: Sync Export and Import for Plugins + Fix Import Accessibility

## Phase 1: Schema + Server

- [x] T-1 Add `PluginExport` interface and `plugins?` field to `ExportSections` in `packages/schema/src/index.ts`
- [x] T-2 Add `plugins` to `VALID_SECTIONS` and plugin export handler in `apps/server/src/routes/export.ts` (import `PluginScope`)
- [x] T-3 Type-check (`pnpm type-check`)

## Phase 2: Export UI

- [x] T-4 Add `plugins` section to `ExportConfigModal` — section type, items (key: `name@marketplace`), checked state, client-side pruning in `handleExport()` (depends: T-1)
- [x] T-5 Type-check (`pnpm type-check`)

## Phase 3: Import UI + Dashboard

- [x] T-6 Parse `data.sections.plugins` in `loadFromFile()`, map to `PluginEntry[]`, validate both `name` and `marketplace` via `safeName()`, add plugins pre-check loop (depends: T-1)
- [x] T-7 Fix `handleImport()` plugin install — add `res.ok` check and throw on failure (pre-existing bug)
- [x] T-8 Fix inline switch for "new count" in checklist header — add `plugins` case (pre-existing bug) [P]
- [x] T-9 Add `importFileName` state, set in `loadFromFile()`, display in sidebar label; rename modal title to "Import Configuration" [P]
- [x] T-10 Remove `otherWorkspaces.length > 0` gate from Dashboard import button; rename button text to "Import Config" [P]
- [x] T-11 Type-check (`pnpm type-check`)

## Phase 4: Build + Verify

- [→] T-12 Run `pnpm build` and commit updated dist artifacts
- [ ] T-13 Manual smoke test: export JSON with plugins → import from file → verify plugins appear pre-selected and install succeeds
- [ ] T-14 Review checkpoint (phase gate)

<!-- Status markers: [ ] pending, [→] in-progress, [x] done -->
<!-- [P] = parallelizable, (depends: T-xxx) = dependency -->
