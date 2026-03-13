---
mode: non-tdd
feature-id: suggestions-inline-fix
linear-ticket: none
---

# Specification: Suggestions Inline Fix

## Overview

Add one-click "Fix Now" actions to 5 of the 10 suggestion rules in the Lens suggestions panel. Fixable suggestions gain an optional `fix` metadata field; a new server endpoint executes fix handlers by suggestion ID; and the UI renders a "Fix Now" button with loading → dismiss flow alongside the existing "Go to Section" navigation.

## Requirements

### Functional

1. The `Suggestion` interface gains an optional `fix?: { label: string }` field. Its presence signals the suggestion is auto-fixable.
2. The following suggestion IDs are fixable:
   - `health-no-claude-md` — creates `<project>/CLAUDE.md` from a minimal starter template
   - `bp-no-project-settings` — creates `<project>/.claude/settings.json` with `{}`
   - `bp-sandbox-disabled` — creates-or-merges `<project>/.claude/settings.json` with `{ "sandbox": true }`
   - `bp-no-memory` — creates `<project>/.claude/memory/AGENTS.md` with a placeholder
   - `ctx-plugins-no-settings` — same behavior as `bp-no-project-settings`
3. The remaining 5 suggestions (`health-no-hooks`, `health-no-permissions`, `health-no-mcp`, `ctx-mcp-no-hooks`, `ctx-commands-no-skills`) remain navigate-only and are not modified.
4. A new endpoint `POST /api/suggestions/:id/fix?project=/path` executes the fix for the given suggestion ID.
5. Fix handlers must not overwrite existing files (except `bp-sandbox-disabled` which merges).
6. Path validation on the fix endpoint: resolved path must start with `realpathSync(homedir()) + "/"`.
7. Unknown suggestion IDs return HTTP 400.
8. The CLAUDE.md starter template includes a visible blockquote suggesting `claude-md-management` and `claude-code-setup` plugins, followed by three section headers with HTML comment placeholders.
9. The UI "Fix Now" button shows a loading spinner during the request. On success the card is dismissed. On failure an inline error message appears and the button re-enables for retry.
10. The fix button appears in both `SuggestionsBox` (grouped info cards) and `Dashboard` urgent banner (warning cards).

### Non-Functional

- Fix endpoint response time < 500ms for all handlers (all are simple file operations)
- No new npm dependencies introduced
- Schema change is additive and non-breaking — existing consumers unaffected
- Path validation matches the existing `PATCH /api/update` security model exactly

## Architecture

```
packages/schema/src/index.ts
  Suggestion.fix?: { label: string }          ← new optional field

apps/server/src/suggestions/
  fix-handlers.ts                              ← new: 4 handler functions + Map
  health-rules.ts                              ← add fix metadata to health-no-claude-md
  best-practice-rules.ts                       ← add fix metadata to 3 bp-* rules
  contextual-rules.ts                          ← add fix metadata to ctx-plugins-no-settings
  (index.ts unchanged)

apps/server/src/routes/suggestions.ts
  POST /:id/fix                                ← new route handler

apps/ui/src/components/SuggestionsBox.tsx
  "Fix Now" button with useState loading/error per card

apps/ui/src/components/Dashboard.tsx
  "Fix →" button on urgent banner cards updated with same loading/error treatment
```

## Acceptance Criteria

**Schema**

- `Suggestion` type compiles with optional `fix` field; existing code using `Suggestion` without `fix` is unaffected

**Fix endpoint**

- `POST /api/suggestions/health-no-claude-md/fix?project=<tmpdir>` → creates CLAUDE.md, returns `{ success: true }`
- Calling it twice → second call is a no-op, returns `{ success: true }` (file exists guard)
- `POST /api/suggestions/bp-sandbox-disabled/fix?project=<tmpdir>` → creates/merges settings.json with `{ "sandbox": true }`
- `POST /api/suggestions/unknown-id/fix` → 400
- `POST /api/suggestions/health-no-claude-md/fix?project=/etc` → 403
- `POST /api/suggestions/health-no-hooks/fix` → 400 (navigate-only suggestion)

**UI**

- Fixable suggestion cards show "Fix Now" button; navigate-only cards do not
- Clicking "Fix Now" disables the button and shows a spinner
- On success the card disappears
- On failure an error message appears inline and the button re-enables

**CLAUDE.md template**

- Contains the plugin recommendation blockquote
- Contains `## Build & Development Commands`, `## Architecture`, `## Conventions` sections

## Decisions

- **Non-TDD mode**: Fixes are simple file operations; overhead of test-first for filesystem I/O in this codebase isn't justified given no existing test infrastructure for server routes.
- **`fix` metadata on Suggestion, not in a separate registry**: The UI needs to know fixability at render time. Attaching it to the suggestion object avoids a second API call or separate lookup.
- **Spinner → dismiss on response (not optimistic)**: Fix can fail; optimistic dismiss would require rollback logic. Response is fast enough that the spinner is imperceptible in practice.
- **Shared handler for `bp-no-project-settings` and `ctx-plugins-no-settings`**: Both fixes are identical — create settings.json with `{}`. Sharing a handler is simpler than duplicating.
- **`bp-sandbox-disabled` is idempotent via merge**: Unlike other handlers that guard with "file exists" check, sandbox fix always merges — so it's safe to call multiple times and correctly handles the case where settings.json already exists for other keys. Target is always `<projectPath>/.claude/settings.json` (project-scope only).
- **`bp-sandbox-disabled` will not re-trigger after fix if user sets `sandbox: false`**: The rule only fires when `sandbox.enabled === null` (key was never set). After the fix writes `true`, the user can override to `false` consciously — this is expected behavior and outside scope of the fix.
- **Fix endpoint allow-list is the handler map itself**: The handler map contains exactly the 5 fixable IDs. Any other ID (including navigate-only suggestions) returns 400. No runtime config re-check is needed — if a suppressed suggestion's ID is posted, the fix is harmless (idempotent file creation).
- **Fix response type reuses `ConfigUpdateResponse`**: `{ success: boolean; error?: string }` — consistent with the existing update endpoint.
- **Local dismiss takes priority over SSE re-render**: If SSE fires while a card is in `dismissed` state, the card remains dismissed. The next full re-render from the suggestions refetch will naturally exclude the resolved suggestion.
- **Fix endpoint is idempotent, returns 200 on repeated calls**: All handlers guard against overwrite or merge safely. A second POST for the same ID returns `{ success: true }` even if the file already exists.
