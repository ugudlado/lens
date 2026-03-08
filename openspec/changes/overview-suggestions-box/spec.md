---
mode: non-tdd
feature-id: 2026-03-09-overview-suggestions-box
linear-ticket: none
---

# Specification: Overview Suggestions Box

## Overview

Add a configuration suggestions engine to the Lens overview page. A server-side rule engine analyzes the scanned `ConfigSnapshot` and returns categorized suggestions (health checks, best practices, contextual) via a new API endpoint. The UI renders these as a collapsible grouped list below the existing dashboard cards.

## Requirements

### Functional

1. Server exposes `GET /api/suggestions?project=<path>` returning typed suggestions
2. Each suggestion has: id, category, title, description, navSection (for navigation), severity
3. Rules are organized into three categories: health, best-practice, contextual
4. Health rules detect missing/empty configurations (e.g., no hooks, no CLAUDE.md)
5. Best-practice rules provide opinionated recommendations (e.g., enable sandbox)
6. Contextual rules detect cross-surface relationships (e.g., MCP servers without hooks)
7. UI displays suggestions grouped by category with collapsible headers
8. Each suggestion shows severity icon (warning/info), title, description, and navigation link
9. "Go to X" buttons navigate to the relevant config section
10. Zero-suggestions state shows success message
11. Suggestions refresh on SSE `config-changed` events

### Non-Functional

1. Suggestion computation should complete in <100ms (rules are simple inspections)
2. No persistent storage — suggestions derived from current config state
3. Follow existing Lens dark theme and component patterns

## Architecture

```
┌────────────┐     GET /api/suggestions      ┌──────────────────┐
│  Dashboard │ ──────────────────────────────→│  suggestions.ts  │
│  (UI)      │                                │  (route)         │
│            │     { suggestions[] }          │                  │
│  ┌────────┐│ ←──────────────────────────────│  scanConfig()    │
│  │Suggest-││                                │       ↓          │
│  │ionsBox ││                                │  getSuggestions() │
│  └────────┘│                                │  ├─ health       │
└────────────┘                                │  ├─ best-practice│
                                              │  └─ contextual   │
                                              └──────────────────┘
```

- Route calls existing `scanConfig()` then pipes result through rule engine
- Rule engine runs all rules and returns flat suggestion array
- UI groups suggestions by `category` field

## Acceptance Criteria

1. Given a project with no hooks configured, when loading the overview, then a health suggestion "No hooks configured" appears
2. Given a project with MCP servers but no hooks, when loading the overview, then a contextual suggestion about adding hooks appears
3. Given a project with all surfaces well-configured, when loading the overview, then a success state "Your configuration looks great!" is shown
4. Given a config file change detected via SSE, when the event fires, then suggestions refresh automatically
5. Given a suggestion with surface "hooks", when clicking "Go to Hooks", then the app navigates to the hooks section

## Decisions

| Decision | Rationale |
|----------|-----------|
| Server-side rules | Allows file-content inspection, single source of truth, follows Lens pattern |
| Static rule functions | Simple, testable, sufficient for well-defined config surfaces |
| No persistence | Suggestions reflect live state — fix config, suggestion disappears |
| Non-TDD mode | Prototype/spike — no test runner configured in Lens |
| Two severity levels | Warning (gap/problem) and info (tip) — keeps it simple |
| Enum style | Use `export enum` (not `as const`) to match all existing schema enums |
| NavSection field | `navSection: NavSection` (not `surface`) — clarifies this is for UI navigation |
| Contextual deduplication | Suppress contextual rules when a health rule already covers the same navSection |
| Sandbox rule | Only fires when `enabled === null` (not configured), not when explicitly `false` |
| Parallel fetch | Config and suggestions fetched via `Promise.all` in App.tsx to reduce latency |
