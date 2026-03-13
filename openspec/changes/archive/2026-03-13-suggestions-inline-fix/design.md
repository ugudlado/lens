# Design: Suggestions Inline Fix

## Context

The suggestions system is a pure rule engine: 10 rules evaluate a `ConfigSnapshot` and return `Suggestion[]`. The UI renders those suggestions as cards. Currently the only action is navigation. For 5 of 10 rules, the fix is a single deterministic file operation (create or patch a file). We want to expose that as a button without compromising the rule engine's purity.

## Goals / Non-Goals

### Goals

- Add optional `fix` metadata to the `Suggestion` schema so the UI can conditionally render a "Fix Now" button
- Add `POST /api/suggestions/:id/fix` endpoint that executes fix handlers by suggestion ID
- Implement 5 fix handlers with correct path validation and file operations
- UI: spinner → dismiss on success; inline error on failure
- Reuse existing path-safety logic (home-directory check) from the update route

### Non-Goals

- Fixing all 10 suggestions (5 remain navigate-only)
- Multi-step fix wizards or confirmation dialogs
- Fix history or undo
- Client-side file operations

## Technical Design

### Components

```
packages/schema/src/index.ts
  └── Suggestion interface
        + fix?: { label: string }   ← new optional field

apps/server/src/suggestions/
  ├── fix-handlers.ts               ← new: Map<id, FixHandler>
  ├── health-rules.ts               ← add fix metadata to health-no-claude-md
  ├── best-practice-rules.ts        ← add fix metadata to bp-* rules
  └── contextual-rules.ts           ← add fix metadata to ctx-plugins-no-settings

apps/server/src/routes/
  └── suggestions.ts                ← add POST /:id/fix route

apps/server/src/index.ts            ← no change (suggestions route already mounted)

apps/ui/src/components/
  ├── SuggestionsBox.tsx            ← "Fix Now" button + loading/error state
  └── Dashboard.tsx                 ← same for urgent banner cards
```

### Fix Handlers

```typescript
// fix-handlers.ts
type FixHandler = (projectPath: string) => Promise<void>;

const handlers: Map<string, FixHandler> = new Map([
  ["health-no-claude-md", fixCreateClaudeMd],
  ["bp-no-project-settings", fixCreateProjectSettings],
  ["bp-sandbox-disabled", fixEnableSandbox],
  ["bp-no-memory", fixCreateMemory],
  ["ctx-plugins-no-settings", fixCreateProjectSettings], // same handler
]);
```

**`fixCreateClaudeMd(projectPath)`**

- Writes `<projectPath>/CLAUDE.md` (only if not exists — guard with try/stat)
- Content: minimal template with Build Commands / Architecture / Conventions sections
- Includes a visible blockquote at top suggesting `claude-md-management` and `claude-code-setup` plugins
- Does NOT overwrite if file already exists (race-condition safety)

**`fixCreateProjectSettings(projectPath)`**

- Writes `<projectPath>/.claude/settings.json` with `{}`
- Uses `mkdir -p` equivalent before writing
- Does NOT overwrite if file already exists

**`fixEnableSandbox(projectPath)`**

- Target file: always `<projectPath>/.claude/settings.json` (project-scope only — never global)
- Reads the file (or starts with `{}` if missing), merges `{ "sandbox": true }`, writes back
- Create-or-merge, not a guard — idempotent on repeated calls
- Note: after this fix fires, `bp-sandbox-disabled` will not re-trigger even if the user later sets `sandbox: false`, because the rule only fires when `sandbox.enabled === null` (never configured). Explicitly setting `false` is a conscious user decision, outside this fix's scope.

**`fixCreateMemory(projectPath)`**

- Creates `<projectPath>/.claude/memory/` directory
- Writes `<projectPath>/.claude/memory/AGENTS.md` placeholder with minimal content
- Does NOT overwrite if file already exists

### Data Flow

```
UI: user clicks "Fix Now"
  → POST /api/suggestions/:id/fix?project=/path
  → route validates: id exists in handler map, path within home dir
  → calls handler(projectPath)
  → handler writes file(s)
  → returns { success: true }
  → UI dismisses card
  → (SSE config-changed fires from chokidar watcher → full rescan)
```

On failure:

```
  → handler throws
  → route catches, returns { success: false, error: "..." }
  → UI shows inline error text on the card, button re-enables
```

### API Endpoint

```
POST /api/suggestions/:id/fix
  Query: ?project=/abs/path (optional, falls back to detectProjectRoot())
  Body: (none)

Response 200: { success: true }
Response 400: { success: false, error: "Unknown suggestion ID" }
Response 403: { success: false, error: "Path not allowed" }
Response 500: { success: false, error: "<message>" }
```

Path validation mirrors `update.ts`: resolve to absolute, check starts with `realpathSync(homedir()) + "/"`.

### UI State Machine (per card)

```
idle
  → click "Fix Now" → loading
loading
  → success response → dismissed (card removed from DOM)
  → error response   → error (shows message, button re-enabled)
error
  → click "Fix Now" → loading (retry)
```

The fix button state is local to each card (`useState`). No global state changes — the card either stays (error) or disappears (success). The SSE-driven rescan handles updating the full suggestion list.

### CLAUDE.md Starter Template

```markdown
# Project

> **Getting started:** Consider installing these plugins to improve this file:
>
> - `claude-md-management` — audit and improve CLAUDE.md files
> - `claude-code-setup` — get automation recommendations for your project

## Build & Development Commands

<!-- Add commands here, e.g. npm run dev, pnpm build -->

## Architecture

<!-- Brief description of the codebase structure -->

## Conventions

<!-- Coding standards, naming conventions, etc. -->
```

### Error Handling

- Fix handler map lookup: unknown IDs return 400 (not 404, to avoid leaking handler existence)
- Path validation: same as update route — rejects paths outside home dir with 403
- File write errors: propagate as 500 with message
- "Already exists" cases: most handlers guard with `access()` check; sandbox handler uses create-or-merge (idempotent)
- Network errors on UI side: displayed as inline error, card stays visible

## Risks & Trade-offs

- **Race condition on CLAUDE.md fix**: if user creates the file between suggestion load and fix button click, the handler silently no-ops (file already exists guard). The SSE rescan will then correctly remove the suggestion.
- **`ctx-plugins-no-settings` and `bp-no-project-settings` share a handler**: if both fire simultaneously and user clicks both fixes, second call is a no-op (file already exists). Acceptable.
- **No undo**: fixes are permanent file writes. Given they're all additive (create new files), this is low risk.

## Open Questions

None — all design decisions resolved during exploration.
