# Export Project-Level Configuration — Review Summary

## Architecture Review: 7.5/10

**Status**: Design is fundamentally sound with **8 issues identified**. 4 are critical (must fix before implementation), 4 are non-critical (important to clarify).

---

## Critical Issues (MUST FIX)

### 1. Skills Directory Structure Mismatch ⚠️

**Problem**: Skills are stored as directories (`~/.claude/skills/{name}/SKILL.md`), not flat files. The export schema treats them as `{ name, filePath, content }` (single file). On import, we'd write `~/.claude/skills/{name}.md`, which the scanner won't find.

**Fix**:
- Update `SkillExport` to capture the directory path and ensure import writes to `~/.claude/skills/{name}/SKILL.md`
- Create the directory structure on import

**Task Impact**: Task 1.1 (schema types) must be revised.

---

### 2. Wrong Function Signature in Design ⚠️

**Problem**: Design code snippet calls `scan({ projectPath })` but the real scanner function is `scanConfig(projectPath)`.

**Fix**: Update design.md server code snippet to use correct function signature.

**Task Impact**: Task 1.2 (export route) implementer must use real API.

---

### 3. Missing Path Traversal Validation ⚠️

**Problem**: `GET /api/export` accepts `?project=/arbitrary/path` but design doesn't show the security check. The `update.ts` route has `realpathSync(homedir())` validation (line 27-28).

**Fix**: Add explicit path validation to export route:
```typescript
const abs = resolve(filePath);
let realHome: string;
try { realHome = realpathSync(homedir()); } catch { realHome = homedir(); }
const isAllowed = abs.startsWith(realHome + '/') || abs === realHome;
if (!isAllowed) {
  return c.json({ error: 'Path not allowed' }, 403);
}
```

**Task Impact**: Task 1.2 (export route) must include this validation.

---

### 4. Optional Fields in ExportSections ⚠️

**Problem**: TypeScript interface defines all fields as required (`mcpServers: McpServerExport[]`), but filtered exports will have missing keys. Strict-mode TypeScript will fail.

**Fix**: Make all section fields optional:
```typescript
interface ExportSections {
  mcpServers?: McpServerExport[];
  hooks?: HookExport[];
  skills?: SkillExport[];
  agents?: AgentExport[];
  rules?: RuleExport[];
  commands?: CommandExport[];
  permissions?: PermissionExport[];
  settings?: SettingsExport;
  claudeMd?: ClaudeMdExport[];
}
```

**Task Impact**: Task 1.1 (schema types).

---

## Non-Critical Issues (IMPORTANT TO CLARIFY)

### 5. Settings Export Clobber Risk

**Problem**: `SettingsExport.content` is the entire `settings.json` as a string. Importing it as-is would replace the target's entire settings file, losing existing project config.

**Solution**: Remove `settings` key from `ExportSections`. Instead, rely on `hooks[]` and `permissions[]` arrays (already properly typed). These are the only settings-backed items users need to export/import. The rest of settings.json is implementation-specific and shouldn't be clobbered.

**Impact**: Update spec.md + design.md to remove `SettingsExport`.

---

### 6. Plugins Scope Mismatch

**Problem**: Export excludes plugins (out of scope), but `WorkspaceConfigImportModal` includes `plugins` in `ALL_SECTIONS`. On file import, `sourceItems.plugins` will always be empty, creating asymmetry.

**Solution**: Document explicitly in spec.md that plugins are intentionally excluded from export (global-only, not project-scoped). The import modal handles this gracefully.

**Impact**: Update spec.md "Scope Boundaries" section.

---

### 7. CLAUDE.md Absolute Paths in Export

**Problem**: `ClaudeMdExport.filePath` contains absolute paths like `/Users/alice/my-project/CLAUDE.md`. On import to a different machine, this path is meaningless and shouldn't be written as-is.

**Solution**: On import, always compute target path from `currentConfig.projectPath`, not from exported `filePath`. The `filePath` is for reference only (UI labeling).

**Impact**: Update tasks.md Task 3.3 (import testing) to clarify this behavior.

---

### 8. Server Sends Unused Data for Item-Level Filtering

**Problem**: Export modal lets users deselect individual items within a section (e.g., 2 of 5 MCP servers). But the server returns all items for each section (`?sections=mcp,hooks,...`). Individual filtering happens client-side.

**Solution**: Document this in spec.md — "section-level filtering happens server-side (query params), item-level filtering happens client-side (modal checkboxes)". This is fine architecturally but should be explicit.

**Impact**: Update spec.md "Algorithm: Export" section.

---

## Strengths

✓ **Correct pattern reuse** — Mirrors `WorkspaceConfigImportModal` structure perfectly
✓ **Minimal server side** — Lean new route, no scan logic changes
✓ **Scope boundary is defensible** — Project-only, no global config
✓ **No dependency creep** — Uses native Node.js + browser APIs
✓ **Forward compatibility strategy** — Version field in export JSON

---

## Pre-Implementation Checklist

Before starting Task 1.1 (schema types), address these critical issues:

- [ ] Fix skills directory path (export/import)
- [ ] Correct function signature in design.md
- [ ] Add path traversal validation to export route spec
- [ ] Make ExportSections fields optional
- [ ] Remove settings from export (rely on hooks/permissions arrays)
- [ ] Document plugins scope exclusion
- [ ] Clarify CLAUDE.md path handling on import
- [ ] Document item-level vs section-level filtering

---

## Updated Tasks

**All critical fixes should be incorporated into:**
- Task 1.1: Schema types (ExportSections optional fields, remove settings)
- Task 1.2: Export route (path validation, correct function signature)
- Task 2.3: Import logic (skills directory, CLAUDE.md paths)
- Spec.md: Update algorithms and scope clarifications

---

## Recommendation

**Score: 7.5/10 → 9.5/10 after fixes**

The architecture is solid. The 4 critical issues are fixable in hours, not days. None require design rethinking. Once these are addressed, the spec is ready for implementation.
