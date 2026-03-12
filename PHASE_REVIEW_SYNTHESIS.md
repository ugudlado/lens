# Phase Review Synthesis — Export Project Config

**Date**: 2026-03-12
**Reviewers**: Codex CLI (o3) + feature-dev:code-reviewer (Claude)
**Overall Score**: 7.5/10 → 9.0/10 after addressing findings

---

## Combined Findings

### 🚨 CRITICAL (Blocks Implementation)

| Issue | Source | File/Line | Severity | Fix |
|-------|--------|-----------|----------|-----|
| **Export security: `?project=` override lacks home-dir guard** | Codex | design.md:37 | CRITICAL | Apply same `resolve`/`realpathSync(homedir())` guard as `update.ts:25-30` before calling `scanConfig` |
| **Settings export causes data loss via clobber** | Both | spec.md:43-45, design.md:95-100 | CRITICAL | Remove `SettingsExport` entirely; export only `hooks[]` and `permissions[]` arrays (use read-merge-write on import) |
| **Skills import path wrong (inherits modal bug)** | Claude | design.md, tasks.md Task 2.3 | CRITICAL | Import to `{projectPath}/.claude/skills/{name}/SKILL.md` (directory + SKILL.md file), create subdirectory, not flat `.md` |
| **Nonexistent `POST /api/file` endpoint referenced** | Claude | spec.md:236, design.md | CRITICAL | Use `PATCH /api/update` for file writes (matching real WorkspaceConfigImportModal pattern) |
| **`ExportSections` type mismatch: required fields but conditionally assigned** | Both | spec.md:107-116, design.md:50-108 | CRITICAL | Make all section fields optional (`mcpServers?: ...`, etc.) to allow conditional assignment |

### ⚠️ HIGH (Must Clarify Before Implementation)

| Issue | Source | File/Line | Severity | Fix |
|-------|--------|-----------|----------|-----|
| **Item-level export selection UI promises but data flow only filters by section** | Codex | spec.md:12, design.md:167-176, tasks.md:68-72 | HIGH | Either drop item-level checkboxes for MVP OR implement client-side pruning before download (prune unchecked items from fetched JSON) |
| **Export schema lossy: drops valid `permissions.ask` and `hooks.agent` types** | Codex | spec.md:128-135, spec.md:162-165 | HIGH | Align `PermissionExport` and `HookExport` enums with real schema types in `index.ts:16-26` |
| **Function signature mismatch: `scan()` vs `scanConfig(projectPath)`** | Both | design.md:33, design.md:43 | HIGH | Correct to `scanConfig(projectPath)` with proper import path (`'../scanner/index.js'`) |
| **CLAUDE.md export stores absolute source paths; import needs slot-based semantics** | Codex | spec.md:46-49, design.md, spec.md Line 237 | HIGH | Export `claudeMd` by logical slot (`'root'`, `'.claude/CLAUDE.md'`) not absolute paths; import computes target path from `currentConfig.projectPath` |
| **Agent import path pattern correct but missing in acceptance criteria** | Claude | design.md Algorithm section | HIGH | Task 2.3 AC should explicitly verify agents imported to `{projectPath}/.claude/agents/{name}.md` |

### 📋 MEDIUM (Should Fix)

| Issue | Source | File/Line | Severity | Fix |
|-------|--------|-----------|----------|-----|
| **`FilePicker` component calls orphaned `setState('checklist')`** | Claude | design.md:249 | MEDIUM | Use callback pattern: call `onFileLoaded(data)` and let parent handle state transition |
| **Download anchor not appended to DOM; may fail in some browsers** | Claude | design.md ExportConfigModal | MEDIUM | Append `a` to `document.body`, click, remove before revoking URL |
| **Export double-serializes JSON** | Claude | design.md handleExport | MEDIUM | Use `res.blob()` or `res.text()` directly instead of `res.json()` → `JSON.stringify()` |
| **Self-review's settings fix not reflected in tasks or spec** | Claude | spec.md, tasks.md | MEDIUM | Update spec.md FR2 and data model to remove `SettingsExport`; Task 1.1 AC must include this removal |
| **`ExportSections` optional fields not propagated to UI-side defensive checks** | Claude | tasks.md Task 2.1 AC | MEDIUM | Task 2.3 AC must require guards like `data.sections.mcpServers ?? []` on import |
| **Self-review issue #1 fix is also wrong (global path not project path)** | Claude | REVIEW_SUMMARY.md Issue #1 | MEDIUM | Correct the self-review's proposed fix before adding to tasks |

### 📌 MISSING TASKS

| Task | Required By | Criticality |
|------|------------|-------------|
| **Update spec.md to remove `SettingsExport` from FR2 and data model** | Before 1.1 | HIGH |
| **Add path validation check to Task 1.2 (export route)** | Task 1.2 | HIGH |
| **Fix skills directory structure in Task 1.1 (schema) and Task 2.3 (import)** | Task 1.1 + 2.3 | HIGH |
| **Implement `POST /api/update` for file writes, not fictional `POST /api/file`** | Task 2.3 | HIGH |
| **Add `pnpm build` + dist artifact commit step to Task 4.3** | Task 4.3 | CRITICAL (per CLAUDE.md) |
| **Add CLAUDE.md import logic with slot-based path computation** | Task 2.3 | HIGH |
| **Add item-level export filtering logic to Task 2.1** | Task 2.1 | HIGH |
| **Update tasks.md acceptance criteria for defensible type handling** | All AC | MEDIUM |

---

## What's Good

✅ **Project-only scope boundary** — Product decision is sound (no global config export)
✅ **Reuse of existing import modal patterns** — Avoids inventing a second import stack
✅ **No new dependencies** — Minimal, appropriate for this feature
✅ **Version field in export JSON** — Forward compatibility strategy is correct

---

## Action Items for User

**Before moving to `/implement`:**

1. **Review this synthesis** and confirm all critical/high issues are acknowledged
2. **Update artifacts** — I'll patch spec.md, design.md, and tasks.md with all findings integrated
3. **Fix 4 critical issues first** (settings, skills, path validation, POST endpoint)
4. **Add 3 missing high-priority tasks** (dist build, CLAUDE.md import, item filtering)
5. **Run `/implement`** with updated task list

**Expected outcome after fixes**: Score 9.0/10, all critical blockers resolved, implementer can execute linearly.

---

## Next Step

Ready for me to update all artifacts and retask before `/implement`?
