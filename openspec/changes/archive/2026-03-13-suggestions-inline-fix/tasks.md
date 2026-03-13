# Tasks: Suggestions Inline Fix

## Phase 1: Schema + Server

- [x] T-1 Add `fix?: { label: string }` to `Suggestion` interface in `packages/schema/src/index.ts`
- [x] T-2 Create `apps/server/src/suggestions/fix-handlers.ts` with 4 handlers: `fixCreateClaudeMd`, `fixCreateProjectSettings`, `fixEnableSandbox`, `fixCreateMemory`; export handler `Map<string, FixHandler>`; CLAUDE.md template must include plugin recommendation blockquote (`claude-md-management`, `claude-code-setup`) and three section headers with HTML comment placeholders; `fixEnableSandbox` target is always `<projectPath>/.claude/settings.json`
- [x] T-3 Add `fix` metadata to `health-no-claude-md` in `health-rules.ts` (label: "Create CLAUDE.md") [P]
- [x] T-4 Add `fix` metadata to `bp-no-project-settings`, `bp-sandbox-disabled`, `bp-no-memory` in `best-practice-rules.ts` [P]
- [x] T-5 Add `fix` metadata to `ctx-plugins-no-settings` in `contextual-rules.ts` [P]
- [x] T-6 Add `POST /:id/fix` route to `apps/server/src/routes/suggestions.ts` — extend the existing exported `app`, do NOT create a new Hono instance; path validation mirrors `update.ts`; response type is `{ success: boolean; error?: string }`; unknown IDs return 400
- [x] T-7 Run `pnpm type-check && pnpm lint` — verify no errors
- [x] T-8 Review checkpoint (phase gate)

## Phase 2: UI

- [x] T-9 Update `SuggestionsBox.tsx`: add per-card `fixState: 'idle' | 'loading' | 'error'` state; render "Fix Now" button when `suggestion.fix` is present; implement spinner → dismiss → inline error flow; dismissed cards must remain dismissed even if parent re-renders from SSE before the suggestion is gone from the list (depends: T-1)
- [x] T-10 Update `Dashboard.tsx` urgent banner: same "Fix Now" button treatment for warning-severity cards with `suggestion.fix` (depends: T-1)
- [x] T-11 Run `pnpm type-check && pnpm lint` — verify no errors
- [~] T-12 Smoke test in browser: trigger each fixable suggestion, click "Fix Now", verify card dismisses and file is created; verify error state by temporarily breaking a handler
- [x] T-13 Review checkpoint (phase gate)

<!-- Status markers: [ ] pending, [→] in-progress, [x] done -->
<!-- [P] = parallelizable, (depends: T-xxx) = dependency -->
