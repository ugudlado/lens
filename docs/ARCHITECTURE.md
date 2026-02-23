# Lens Architecture

## Overview

Lens is a pnpm monorepo with three packages:

```
├── packages/schema/    @lens/schema — shared TypeScript types
├── apps/server/        @lens/server — Hono 4 backend, scanner, file watcher
└── apps/ui/            @lens/ui — React 19 + Vite 6 dashboard
```

## Backend

Hono 4 on Node.js. Pure filesystem reads/writes — no database. SSE for live reload.

**Scanner** (`apps/server/src/scanner/`):
- Individual scanner modules for each of the 13 config surfaces
- Each scanner knows file paths for all scope levels (managed, global, project, local)
- Returns typed config objects with source file metadata

**Watcher** (`apps/server/src/watcher.ts`):
- chokidar watches config file paths for changes
- Triggers SSE events to connected clients on file changes

**Key patterns:**
- Route files export `new Hono()` instances mounted in `index.ts`
- Scanner modules export scan functions returning typed config objects
- SSE stream for live config reload (no WebSocket)

## Frontend

React 19 SPA with Tailwind CSS. No router library — `useState`-based navigation with History API (`pushState`/`popstate`).

**State:** Local `useState` only — no global state library.

**API calls:** Native `fetch()` with relative URLs. Vite proxies `/api` and `/events` to `localhost:37001`.

**SSE:** EventSource connection to `/api/events` for live config reload when files change on disk.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Scan and return all config surfaces |
| `/api/update` | PATCH | Write config changes back to files |
| `/api/events` | GET | SSE stream for live config reload |

## Config Surfaces

Lens reads and writes 13 Claude Code configuration surfaces:

| Surface | Description |
|---------|-------------|
| CLAUDE.md | Project instructions and guidance |
| settings.json | Configuration preferences |
| Permissions | Tool and resource access control |
| MCP Servers | Tool server integrations |
| Hooks | Event-driven automations |
| Skills | Reusable agent capabilities |
| Agents | Configured sub-agents |
| Rules | Path-scoped behavior rules |
| Commands | Custom slash commands |
| Memory | Persistent context storage |
| Plugins | Marketplace extensions |
| Models | Model configuration |
| Sandbox | Sandbox configuration |

## Scope Levels

Each surface is read across all scope levels, merged to compute effective values:

1. **Managed** — System-level (read-only)
2. **Global** — `~/.claude/` (read-only by default, toggle to enable writes)
3. **Project** — `.claude/` in project root
4. **Local** — `.claude/` local overrides (gitignored)

## Build

```
pnpm build   # schema → server → UI (order matters)
```

Dist artifacts (`apps/server/dist/`, `apps/ui/dist/`, `packages/schema/dist/`) are committed to git for zero-build-step plugin installation.
