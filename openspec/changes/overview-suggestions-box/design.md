# Design: Overview Suggestions Box

## Context

Lens scans 13 Claude Code configuration surfaces and displays them on a dashboard. Currently the dashboard is purely informational. Users must already know Claude Code best practices to identify gaps. This design adds an intelligent suggestion layer that analyzes configuration and provides actionable recommendations.

## Goals / Non-Goals

### Goals
- Detect missing/empty configurations and recommend fixes
- Provide opinionated best-practice guidance for Claude Code setup
- Identify cross-surface relationships where one config implies another
- Make suggestions actionable with direct navigation to relevant sections

### Non-Goals
- AI/LLM-powered analysis (static rules only)
- Persistent suggestion dismissal (no storage)
- Suggestion priority scoring or ranking within categories
- Custom/user-defined rules

## Technical Design

### Components

**Server:**

| File | Responsibility |
|------|----------------|
| `apps/server/src/suggestions/index.ts` | Aggregates rules from all categories, exports `getSuggestions(config)` |
| `apps/server/src/suggestions/health-rules.ts` | Rules detecting missing/empty configs |
| `apps/server/src/suggestions/best-practice-rules.ts` | Opinionated recommendation rules |
| `apps/server/src/suggestions/contextual-rules.ts` | Cross-surface relationship rules |
| `apps/server/src/routes/suggestions.ts` | `GET /api/suggestions` route handler |

**Schema:**

| File | Change |
|------|--------|
| `packages/schema/src/index.ts` | Add `SuggestionCategory`, `SuggestionSeverity` enums, `Suggestion`, `SuggestionsResponse` interfaces, `SuggestionRule` type |

**UI:**

| File | Change |
|------|--------|
| `apps/ui/src/components/SuggestionsBox.tsx` | New component — collapsible grouped suggestion list |
| `apps/ui/src/components/Dashboard.tsx` | Mount SuggestionsBox below cards grid |
| `apps/ui/src/App.tsx` | Fetch suggestions, pass to Dashboard, refresh on SSE |

### Data Flow

```
1. App.tsx mounts → fetches GET /api/suggestions?project=X
2. Route handler calls scanConfig(project) → ConfigSnapshot
3. getSuggestions(config) runs all rules → Suggestion[]
4. Response: { suggestions: Suggestion[], scannedAt: string }
5. App passes suggestions to Dashboard → SuggestionsBox
6. SSE config-changed event → re-fetch suggestions
```

### Types

```typescript
export enum SuggestionCategory {
  Health = "health",
  BestPractice = "best-practice",
  Contextual = "contextual",
}

export enum SuggestionSeverity {
  Warning = "warning",
  Info = "info",
}

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  navSection: NavSection;  // where to navigate when user clicks "Go to X"
  severity: SuggestionSeverity;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  scannedAt: string;
}

export type SuggestionRule = (config: ConfigSnapshot) => Suggestion[];
```

### Initial Rules

**Health (warning severity):**
| ID | Condition | Surface |
|----|-----------|---------|
| `health-no-claude-md` | No project-level CLAUDE.md files | claudeMd |
| `health-no-hooks` | Zero hooks across all scopes | hooks |
| `health-no-permissions` | No permission rules defined | permissions |
| `health-no-mcp` | No MCP servers configured | mcp |

**Best Practice (info severity):**
| ID | Condition | Surface |
|----|-----------|---------|
| `bp-no-project-settings` | No project-level settings file | settings |
| `bp-sandbox-disabled` | Sandbox `enabled` is `null` (not configured). Does NOT fire if explicitly set to `false`. | sandbox |
| `bp-no-memory` | No memory files exist | memory |

**Contextual (info severity):**
| ID | Condition | Surface |
|----|-----------|---------|
| `ctx-mcp-no-hooks` | Has MCP servers but no hooks. **Suppressed** when `health-no-hooks` already fires (avoids duplicate noise). | hooks |
| `ctx-commands-no-skills` | Has legacy commands but no skills — consider migrating to skills | skills |
| `ctx-plugins-no-settings` | Has plugins but no project settings | settings |

### Error Handling

- If `scanConfig()` fails, the suggestions endpoint returns `{ suggestions: [], scannedAt: "", error: "scan failed" }`
- Individual rule failures are caught and logged; other rules still execute
- UI handles empty suggestions array gracefully (success state)
- UI handles fetch failure with a subtle error message (not blocking)

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| Double scan (config + suggestions both call scanConfig) | Mitigate by parallel-fetching config and suggestions in App.tsx via `Promise.all` to halve wall-clock latency |
| Rules become stale as Claude Code evolves | Rules are simple functions — easy to update |
| Opinionated suggestions may annoy users | Use info severity for tips, keep language helpful not prescriptive |

## Open Questions

None — all design decisions resolved during brainstorming.
