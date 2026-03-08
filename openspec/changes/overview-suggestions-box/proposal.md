# Proposal: Overview Suggestions Box

## Why

The Lens dashboard currently shows a read-only inventory of all 13 Claude Code configuration surfaces — counts and scope breakdowns. It tells you *what exists* but not *what's missing or could be better*. Users have to know Claude Code best practices already to spot gaps. A suggestions engine turns the dashboard from a passive display into an active advisor.

## What Changes

Add a suggestions box below the overview cards grid that analyzes the current configuration and provides actionable improvement recommendations. Suggestions are grouped into three categories: health checks (missing/empty configs), best practices (opinionated recommendations), and contextual suggestions (cross-surface relationships).

## Capabilities

### New
- Server-side suggestion rule engine that inspects `ConfigSnapshot`
- `GET /api/suggestions` endpoint returning categorized suggestions
- `SuggestionsBox` UI component with collapsible category groups
- ~10 initial suggestion rules across three categories
- Navigation links from suggestions to relevant config sections
- Zero-suggestions success state ("Your configuration looks great!")

### Modified
- `Dashboard.tsx` — add SuggestionsBox below the cards grid
- `App.tsx` — fetch suggestions data, pass to Dashboard
- `@lens/schema` — add `Suggestion` type

## Alternatives Considered

- **Schema-driven rules (JSON/YAML config)**: More flexible for non-developers, but over-engineered for well-defined config surfaces that rarely change. Rule expressiveness limited for contextual cross-surface analysis.
- **AI-generated suggestions (LLM)**: Very smart but requires API key, adds latency, non-deterministic. Overkill for a config dashboard with known best practices.
- **Client-side computation**: UI already has `ConfigSnapshot`, could run rules in browser. But limits rules to count-based checks — can't inspect file contents or do deeper analysis.

**Chosen: Static rule functions on the server.** Simplest approach that supports all three categories, allows file-content inspection, and follows Lens's server-does-analysis pattern.

## Impact

- New API endpoint (`/api/suggestions`) — no breaking changes to existing endpoints
- New UI component — additive to Dashboard, no changes to existing layout above
- No database or persistence — suggestions computed on each request from live config state
- No migration needed

## Linear Ticket

none
