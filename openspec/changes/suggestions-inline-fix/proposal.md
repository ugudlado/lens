# Proposal: Suggestions Inline Fix

## Why

The suggestions panel currently surfaces configuration issues but requires users to navigate to the relevant section and figure out the fix themselves. For several suggestions, the remediation is mechanical and deterministic (create a file, write a JSON key) — the user has no real choice to make. Making users navigate away and act manually adds unnecessary friction, especially for new users setting up a project for the first time.

Adding one-click "Fix Now" actions for auto-fixable suggestions turns passive diagnostics into an active setup assistant.

## What Changes

- Selected suggestions gain an optional `fix` metadata field (button label + description) that signals they are auto-fixable
- A new `POST /api/suggestions/:id/fix` endpoint executes the fix server-side
- A new `fix-handlers.ts` module maps suggestion IDs to fix functions
- The UI renders a "Fix Now" button for fixable suggestions, with loading and success states
- On success, the card dismisses and a config-changed SSE event triggers a rescan

## Capabilities

### New

- **Inline fix actions** for 5 of 10 suggestion rules:
  - `health-no-claude-md` — creates a starter CLAUDE.md with section scaffolding and plugin recommendations
  - `bp-no-project-settings` — creates `.claude/settings.json` with `{}`
  - `bp-sandbox-disabled` — creates-or-merges `.claude/settings.json` with `{ "sandbox": true }`
  - `bp-no-memory` — creates `.claude/memory/AGENTS.md` placeholder
  - `ctx-plugins-no-settings` — same handler as `bp-no-project-settings`
- **Fix metadata on Suggestion schema** — `fix?: { label: string }` field visible to the UI
- **Fix API endpoint** — `POST /api/suggestions/:id/fix?project=/path`

### Modified

- `Suggestion` interface in `@lens/schema` — gains optional `fix` field
- Health, best-practice, and contextual rule files — fixable suggestions include fix metadata
- `SuggestionsBox.tsx` — renders "Fix Now" button with spinner/dismiss flow
- `Dashboard.tsx` urgent banner — same button treatment for warning-severity suggestions

## Alternatives Considered

- **Client-side fixes** — writing files directly from the browser is not possible without a backend endpoint; ruled out
- **Dedicated fix wizard / multi-step modal** — over-engineered for what are single-operation fixes; ruled out in favor of inline button
- **Optimistic dismiss** — removes the card before confirming success; rejected because fix failures would leave stale UI state; spinner → dismiss on confirmed success is more reliable
- **Fix logic inside rule functions** — keeping rules pure (ConfigSnapshot → Suggestion[]) is a core architectural property; fix handlers live in a separate module

## Impact

- Non-breaking schema change (`fix` is optional — existing consumers unaffected)
- No new dependencies
- Fix handlers write files using the same path-validation logic as the existing update route (home-directory check)
- The 5 remaining navigate-only suggestions are unchanged

## Linear Ticket

none
