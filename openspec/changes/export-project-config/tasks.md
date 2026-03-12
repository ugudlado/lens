# Export Project-Level Configuration — Tasks

## Phase 1: Server (Export Endpoint)

### Task 1.1: [x] Add ExportData Types to Schema
**File**: `packages/schema/src/index.ts`
**Deliverable**: TypeScript interfaces for export format
**Details**:
- `ExportData` (root type with version, timestamp, sections)
- `ExportSections` (container for section data with optional fields)
- Section types: `McpServerExport`, `HookExport`, `SkillExport`, `AgentExport`, `RuleExport`, `CommandExport`, `PermissionExport`, `ClaudeMdExport`
- Export all for use in server + UI
- **CRITICAL**: Make all section fields in `ExportSections` optional (`mcpServers?: ...`, `hooks?: ...`, etc.)
- **CRITICAL**: Remove `SettingsExport` entirely (no settings blob export)
- **IMPORTANT**: Verify `HookExport.type` includes all valid types: `'command' | 'prompt' | 'agent'`
- **IMPORTANT**: Verify `PermissionExport.type` includes all valid types: `'allow' | 'deny' | 'ask'`

**Acceptance Criteria**:
- ✓ All types compile with TypeScript strict mode
- ✓ Types accurately represent JSON structure from spec
- ✓ ExportSections has no required fields (all optional)
- ✓ SettingsExport removed from interface
- ✓ HookExport.type includes 'agent' type
- ✓ PermissionExport.type includes 'ask' type
- ✓ Imported by server and UI with no issues

---

### Task 1.2: Create Export Route (GET /api/export)
**File**: `apps/server/src/routes/export.ts` (new)
**Deliverable**: Hono route handler for config export
**Details**:
- Query param: `sections` (comma-separated section names, optional)
- Query param: `project` (project path override, optional)
- Call `scanConfig(projectPath)` to get current ConfigSnapshot (correct function signature)
- Filter to project-scoped items only
- For file-based sections (skills, agents, rules, commands, CLAUDE.md), read file content
- Build `ExportData` object with version, timestamp, sections
- Return as application/json
- **CRITICAL SECURITY**: Add explicit path validation before calling `scanConfig`:
  - Use `resolve(projectOverride)` to get absolute path
  - Use `realpathSync(homedir())` to get home directory
  - Check: `isAllowed = abs.startsWith(realHome + '/') || abs === realHome`
  - Return 403 with `{ error: 'Path not allowed' }` if validation fails
  - Match pattern from `update.ts:25-30` exactly

**Acceptance Criteria**:
- ✓ Endpoint responds to GET /api/export
- ✓ Returns valid JSON matching ExportData schema
- ✓ Filters to project scope (ConfigScope.Project only)
- ✓ Handles missing sections (returns empty arrays)
- ✓ Handles file read errors gracefully (empty content or skip)
- ✓ Path validation works correctly (rejects paths outside home dir)
- ✓ Returns 403 for disallowed paths
- ✓ Returns 500 with error message on failure
- ✓ Uses `scanConfig(projectPath)` with correct signature

---

### Task 1.3: Mount Export Route in Server Index
**File**: `apps/server/src/index.ts`
**Deliverable**: Integration of export route
**Details**:
- Import export route
- Mount at `/api/export` using `app.route()`
- Ensure no conflicts with existing routes

**Acceptance Criteria**:
- ✓ Endpoint is accessible at GET /api/export
- ✓ Server starts without errors
- ✓ Type-check passes

---

## Phase 2: UI Components (Export Modal & Import Enhancement)

### Task 2.1: Create ExportConfigModal Component
**File**: `apps/ui/src/components/ExportConfigModal.tsx` (new)
**Deliverable**: Modal for selecting and exporting config
**Details**:
- Accept `config: ConfigSnapshot` and `onClose` callback
- Implement state machine: checklist → exporting → (success/error)
- Section sidebar showing item counts
- Main panel with checklist of items in active section
- Select-all button per section
- All items pre-checked by default
- Fetch GET /api/export with selected sections (only request sections if at least one item checked)
- **CLIENT-SIDE ITEM FILTERING (CRITICAL)**: After fetching, prune JSON to remove unchecked items:
  - Filter `exportData.sections.mcp` to keep only checked items
  - Filter `exportData.sections.hooks` to keep only checked items
  - Repeat for all sections with checked items
  - Only unchecked items are excluded from final download
- Trigger browser download of `.claude-export.json`
- Handle errors (show message, return to checklist)
- Download anchor DOM pattern: append to document.body before click, remove after

**Acceptance Criteria**:
- ✓ Modal renders with section tabs
- ✓ Item counts display correctly
- ✓ Select/deselect works (checkboxes update state)
- ✓ Select-all per section works
- ✓ Only sections with at least one checked item are sent to server
- ✓ Unchecked items are filtered from downloaded JSON (client-side pruning works)
- ✓ Clicking "Export" fetches API and downloads file
- ✓ Downloaded file is valid JSON with only selected items
- ✓ Modal closes after successful export
- ✓ Error messages display on failure
- ✓ Styling matches Dashboard buttons
- ✓ Download works in multiple browsers (anchor appended to DOM)

---

### Task 2.2: Update Dashboard Component for Export Button
**File**: `apps/ui/src/components/Dashboard.tsx`
**Deliverable**: Add export button and state
**Details**:
- Import ExportConfigModal
- Add state: `showExport: boolean`
- Add export button next to import button in header
  - Label: "↑ Export Config"
  - Matches button styling (accent color, hover)
- Render ExportConfigModal when `showExport === true`
- Pass `config` and `onClose` handler

**Acceptance Criteria**:
- ✓ Export button appears in Dashboard header
- ✓ Button styling matches import button
- ✓ Clicking button opens ExportConfigModal
- ✓ Modal closes when user clicks cancel or exports
- ✓ No layout shifts or style conflicts

---

### Task 2.3: Add File Import Tab to WorkspaceConfigImportModal
**File**: `apps/ui/src/components/WorkspaceConfigImportModal.tsx`
**Deliverable**: File upload interface for import
**Details**:
- Add tab UI at top of modal: "From Workspace" / "From File"
- Add state: `importSource: 'workspace' | 'file'`
- Create FilePicker sub-component:
  - File input (accept .json)
  - Parse JSON and validate version field (must equal 1)
  - On success, populate sourceItems from file data
  - Call parent callback `onFileLoaded(data)` to let parent handle state transition (callback pattern, NOT orphaned setState)
  - Handle parse errors gracefully
- Update import logic to work with both sources
- Same checklist/import flow for file as workspace
- **SKILLS DIRECTORY STRUCTURE (CRITICAL)**: Import skills to `{projectPath}/.claude/skills/{name}/SKILL.md`
  - Create directory structure on import (via patchFile → mkdir recursive)
  - Do NOT write flat `~/.claude/skills/{name}.md` files
  - Verify skills appear in scanner results after rescan
- **CLAUDE.md SLOT-BASED IMPORT (IMPORTANT)**: Compute target path from logical slot, not source filePath
  - `slot === 'root'` → write to `{projectPath}/CLAUDE.md`
  - `slot === '.claude/CLAUDE.md'` → write to `{projectPath}/.claude/CLAUDE.md`
  - Ignore exported `filePath` (it's for reference only)
- **DEFENSIVE TYPE HANDLING**: Guard optional section fields with `?? []`
  - e.g., `(data.sections.mcp ?? []).forEach(...)`

**Acceptance Criteria**:
- ✓ Tabs appear at top of modal
- ✓ Switching tabs changes view (workspace picker ↔ file picker)
- ✓ File input accepts .json files
- ✓ Valid export files parse successfully
- ✓ Parsed items populate checklist correctly
- ✓ Invalid JSON shows error message
- ✓ Missing version field shows error
- ✓ Import flow from file works (writes to project scope)
- ✓ Imported skills appear in correct directory (`~/.claude/skills/{name}/SKILL.md`)
- ✓ Imported agents appear in correct directory (`~/.claude/agents/{name}.md`)
- ✓ Imported CLAUDE.md files go to correct slot-based paths
- ✓ After import + rescan, all items discovered correctly
- ✓ All existing workspace import functionality still works

---

## Phase 3: Integration & Testing

### Task 3.1: Type-Check All Changes
**File**: N/A (validation step)
**Deliverable**: Clean TypeScript compilation
**Details**:
- Run `pnpm type-check` in monorepo
- Fix any type errors in schema, server, UI

**Acceptance Criteria**:
- ✓ `pnpm type-check` passes with no errors
- ✓ No eslint violations (if configured)
- ✓ Build succeeds

---

### Task 3.2: Manual Testing — Export Workflow
**Deliverable**: Verified export functionality
**Details**:
- Open Dashboard with a project that has config
- Click "Export Config" button
- Modal appears with sections checked
- Uncheck some sections (e.g., hooks)
- Click "Export"
- Verify file downloads as `.claude-export.json`
- Open file in editor and verify JSON format
- Verify version field = 1
- Verify structure matches ExportData schema
- Test with empty sections (no items)
- Test with large files (ensure performance)

**Acceptance Criteria**:
- ✓ Export button opens modal
- ✓ Section checkboxes work
- ✓ File downloads with correct name
- ✓ JSON is valid and formatted
- ✓ Only selected sections are included
- ✓ File size is reasonable (<1MB for typical project)
- ✓ No console errors during export

---

### Task 3.3: Manual Testing — Import from File Workflow
**Deliverable**: Verified import functionality
**Details**:
- Obtain a .claude-export.json file (from task 3.2)
- Open a different project in Lens
- Click "Import from Workspace" button
- Click "From File" tab
- Upload the export file
- Verify sections appear in checklist
- Uncheck some items
- Click "Import"
- Verify items appear in the target project
- Check that items were written to project scope only
- Test with invalid JSON (should show error)
- Test with missing version field (should show error)

**Acceptance Criteria**:
- ✓ File tab appears in import modal
- ✓ File upload works
- ✓ Valid export file parses and populates checklist
- ✓ Checklist shows correct item counts
- ✓ Import writes to project scope
- ✓ Imported items appear in UI sections
- ✓ Invalid files show appropriate errors
- ✓ Can toggle between workspace and file tabs

---

### Task 3.4: Test Error Cases
**Deliverable**: Verified error handling
**Details**:
- Try to export from project with no config (should succeed with empty sections)
- Try to import invalid JSON (should show error)
- Try to import file with missing `version` field (should show error)
- Try to import file with very old version (should show error)
- Network failure during export (should show error)
- File too large (>1MB, if size limit added)

**Acceptance Criteria**:
- ✓ All error cases handled gracefully
- ✓ User sees meaningful error messages
- ✓ No unhandled exceptions in console
- ✓ Modal remains usable after error

---

### Task 3.5: Cross-Project Export/Import Test
**Deliverable**: End-to-end verification
**Details**:
- Project A: Create export with all sections
- Download file
- Project B: Import file
- Verify all items from A appear in B with same content
- Test with partial export (e.g., only MCP + rules)
- Test with items that already exist in B (verify "exists" state in checklist)

**Acceptance Criteria**:
- ✓ Export from A, import to B successfully
- ✓ All items transferred correctly
- ✓ File contents match (no data loss)
- ✓ Partial exports work
- ✓ Existing item detection works
- ✓ No duplicate items created

---

## Phase 4: Refinement & Documentation

### Task 4.1: Code Review & Cleanup
**Deliverable**: Production-ready code
**Details**:
- Review ExportConfigModal for styling/UX consistency
- Review export route for error handling
- Ensure no console warnings
- Clean up unused imports
- Add JSDoc comments to exported functions

**Acceptance Criteria**:
- ✓ Code follows project conventions
- ✓ No console warnings
- ✓ Styling matches design system
- ✓ Error messages are user-friendly

---

### Task 4.2: Update CLAUDE.md with Export Feature
**File**: `CLAUDE.md`
**Deliverable**: Documentation for export/import
**Details**:
- Add section explaining export/import functionality
- Document file format (version, schema)
- Provide examples of export JSON structure
- Explain scope boundaries (project only, no global)
- Provide troubleshooting tips

**Acceptance Criteria**:
- ✓ Documentation is clear and complete
- ✓ Examples are accurate
- ✓ Instructions are easy to follow

---

### Task 4.3: Commit & Verify
**Deliverable**: Clean commit history and built distribution artifacts
**Details**:
- Commit schema types (Task 1.1)
- Commit export route (Task 1.2 + 1.3)
- Commit UI components (Task 2.1 + 2.2 + 2.3)
- Each commit has clear message
- **CRITICAL (per CLAUDE.md)**: Run `pnpm build` after all code changes
- **CRITICAL**: Add distribution artifacts to git:
  - `apps/server/dist/`
  - `apps/ui/dist/`
  - `packages/schema/dist/`
- Create final commit: `"build: rebuild distribution artifacts after export feature"`
- No uncommitted changes

**Acceptance Criteria**:
- ✓ Git history is clean
- ✓ All changes committed
- ✓ No build/type-check failures
- ✓ `pnpm build` completes without errors
- ✓ Distribution artifacts are updated in dist/ directories
- ✓ All dist artifacts are committed (required for zero-build-step plugin install)

---

## Dependency Graph

```
Task 1.1 (Schema Types)
  ↑
  └─── Task 1.2 (Export Route) ← Task 1.3 (Mount Route)

  └─── Task 2.1 (Export Modal)
        ↑
        └─── Task 2.2 (Dashboard Button)

Task 2.3 (Import File Tab) [independent]

All → Task 3.1 (Type-check)
    ↓
    └─→ Task 3.2 (Export Testing)
        └─→ Task 3.3 (Import Testing)
        └─→ Task 3.4 (Error Cases)
        └─→ Task 3.5 (E2E Testing)

All → Task 4.1 (Review)
    └─→ Task 4.2 (Docs)
    └─→ Task 4.3 (Commit)
```

**Critical Path**: 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 3.1 → 3.5

**Can Parallelize**: 2.3 and 3.2-3.4 (after 1.3 and 2.2 complete)
