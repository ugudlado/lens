# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev                    # Run server + UI concurrently
pnpm dev:server             # Server only (tsx watch, port 37001)
pnpm dev:ui                 # UI only (Vite, port 3000)
pnpm build                  # Build all (schema → server → UI, order matters)
pnpm type-check             # Type-check all packages (tsc --noEmit)
pnpm --filter @lens/server type-check  # Type-check server only
pnpm --filter @lens/ui type-check      # Type-check UI only
```

No test runner is configured. No linter is configured. Validate with `pnpm type-check`.

**Environment variables** (server):
- `PORT` — port to listen on (default: `37001`)

## Architecture

This is **Lens** — a web dashboard that scans, displays, and edits all 13 Claude Code configuration surfaces (CLAUDE.md, settings, permissions, MCP servers, hooks, skills, agents, rules, commands, plugins, models, memory, sandbox) across all scope levels (managed, global, project, local).

### Packages

- **`packages/schema/`** (`@lens/schema`) — Shared TypeScript types. No JS output — the build step only runs `tsc --noEmit`. Consumers import source directly via `@lens/schema`. Must run first in the build chain.
- **`apps/server/`** (`@lens/server`) — Hono 4 HTTP backend on Node.js. Pure filesystem reads/writes, no database.
- **`apps/ui/`** (`@lens/ui`) — React 19 + Vite 6 frontend. Vite proxies `/api` and `/events` to `localhost:37001`.

### Data Flow

1. UI fetches config data via REST (`GET /api/config`)
2. Scanner modules read all 13 config surfaces from the filesystem across scope levels
3. Server returns aggregated config with effective values (merged across scopes)
4. UI displays config in a browsable dashboard with scope-level detail
5. User edits config → `PATCH /api/update` writes changes back to the appropriate file
6. File watcher (chokidar) detects changes and pushes updates via SSE (`GET /api/events`)

### Server Internals

**Storage**: Pure filesystem — no database. Reads/writes Claude Code config files directly.

**Scanner** (`src/scanner/`):
- Individual scanner modules for each config surface (CLAUDE.md, settings.json, MCP configs, hooks, etc.)
- Each scanner knows the file paths for all scope levels (managed, global, project, local)
- Returns typed config objects with source file metadata

**Watcher** (`src/watcher.ts`):
- Uses chokidar to watch config file paths for changes
- Triggers SSE events to connected clients on file changes

**Key patterns**:
- Route files export `new Hono()` instances mounted in `index.ts`
- Scanner modules export scan functions that return typed config objects
- SSE stream for live config reload (no WebSocket)

### UI Internals

**No router library** — navigation is `useState`-based. URL routing via History API (`pushState`/`popstate`).

**State**: Local `useState` only. No global state library.

**API calls**: Native `fetch()` with relative URLs. Vite proxy handles routing to backend.

**SSE**: EventSource connection to `/api/events` for live config reload when files change on disk.

## Conventions

- **pnpm monorepo** with `@lens/` package scope
- **TypeScript strict mode** across all packages
- **File naming**: `kebab-case.ts` for all source files
- **Imports**: `.js` extensions for intra-package ESM imports; `@lens/*` for cross-package
- **Tailwind dark theme**: bg `#0a0a0f`, accent purple `#6c5ce7`
- **Error responses**: `c.json({ error: "message" }, statusCode)` in API routes
- **Committed dist artifacts** — `apps/server/dist/`, `apps/ui/dist/`, and `packages/schema/dist/` are intentionally committed (allowlisted in `.gitignore`). Required for zero-build-step plugin install. Do not delete or gitignore them. Run `pnpm build` after source changes and commit the updated dist.

## Agent Restrictions

When running as a spawned agent:

- **NO git push** — Never push to any remote. Commits are local only.
- **NO dev servers** — Never run `pnpm dev`, `npm run dev`, `npx vite`, or any server. The dev server is managed externally.
- **NO process management** — Never run `kill`, `killall`, `pkill`, or similar.
- **NO destructive operations** — Never `rm -rf /`, `rm -rf ~`, or delete files outside the project.
- **Type-check only** — For validation, use `pnpm type-check` instead of starting servers.
- **Write within project** — Only write files within this repository.

## Linear Issue Tracking

- **Team Name:** Home Labs
- **Team ID:** 80452c36-1579-49d6-9e6e-59afbb82bce5
- **Ticket Prefix:** HL
