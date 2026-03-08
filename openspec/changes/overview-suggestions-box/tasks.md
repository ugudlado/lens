# Tasks: Overview Suggestions Box

## Phase 1: Schema & Types

- [x] T-1 Add types to `packages/schema/src/index.ts`: `SuggestionCategory` enum, `SuggestionSeverity` enum, `Suggestion` interface (with `navSection: NavSection` field — NOT `surface`), `SuggestionsResponse` interface, `SuggestionRule` type (depends: T-1)
- [ ] T-2 Run `pnpm type-check` to validate schema changes
- [ ] T-3 Review checkpoint (phase gate)

## Phase 2: Server — Rule Engine & Endpoint

- [x] T-4 Create `apps/server/src/suggestions/health-rules.ts` with 4 health check rules (depends: T-1)
- [x] T-5 Create `apps/server/src/suggestions/best-practice-rules.ts` with 3 best-practice rules [P] (depends: T-1). Note: `bp-sandbox-disabled` fires only when `enabled === null` (not configured), NOT when explicitly `false`.
- [x] T-6 Create `apps/server/src/suggestions/contextual-rules.ts` with 3 contextual rules [P] (depends: T-1). Note: `ctx-mcp-no-hooks` is suppressed when `health-no-hooks` already fires. `ctx-commands-no-skills` replaces original `ctx-skills-no-commands` (reversed logic).
- [x] T-7 Create `apps/server/src/suggestions/index.ts` — aggregator that runs all rules with error isolation and deduplication (suppress contextual rules when a health rule already covers the same navSection) (depends: T-4, T-5, T-6)
- [x] T-8 Create `apps/server/src/routes/suggestions.ts` — `GET /api/suggestions` endpoint (depends: T-7)
- [x] T-9 Mount suggestions route at `app.route('/api/suggestions', suggestionsRoutes)` in `apps/server/src/index.ts` (depends: T-8)
- [x] T-10 Run `pnpm type-check` to validate server changes
- [x] T-11 Review checkpoint (phase gate)

## Phase 3: UI — SuggestionsBox Component

- [x] T-12 Create `apps/ui/src/components/SuggestionsBox.tsx` — collapsible grouped list with navigation links and loading/skeleton state (depends: T-1)
- [x] T-13 Update `apps/ui/src/components/Dashboard.tsx` — mount SuggestionsBox below cards grid (depends: T-12)
- [x] T-14 Update `apps/ui/src/App.tsx` — add `fetchSuggestions` as `useCallback` keyed on `activeProject` (mirrors `fetchConfig` pattern), parallel-fetch config+suggestions via `Promise.all`, refresh in existing SSE `config-changed` handler (NOT a second EventSource) (depends: T-12)
- [x] T-15 Run `pnpm type-check` to validate UI changes
- [x] T-16 Review checkpoint (phase gate)

## Phase 4: Build & Verify

- [→] T-17 Run `pnpm build` to produce dist artifacts (depends: T-15)
- [ ] T-18 Verify suggestions endpoint returns expected data for current project
- [ ] T-19 Visual verification — confirm SuggestionsBox renders correctly in the dashboard
- [ ] T-20 Final review checkpoint

<!-- Status markers: [ ] pending, [→] in-progress, [x] done -->
<!-- [P] = parallelizable, (depends: T-xxx) = dependency -->
