# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
PORT=3000 pnpm dev          # Run server + UI concurrently
pnpm dev:server             # Server only (tsx watch, port 37001)
pnpm dev:ui                 # UI only (Vite, port 3000)
pnpm build                  # Build all (schema → server → UI, order matters)
pnpm type-check             # Type-check all packages (tsc --noEmit)
pnpm --filter @lens/server type-check  # Type-check server only
pnpm --filter @lens/ui type-check      # Type-check UI only
pnpm lint                   # ESLint across all workspaces (type-checked)
pnpm format                 # Prettier format all source files
pnpm format:check           # Check formatting without writing
pnpm knip                   # Detect unused files, exports, and dependencies
pnpm knip:fix               # Auto-fix knip findings
```

Validate with `pnpm type-check && pnpm lint`.

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

## Export / Import Feature

Lens supports exporting and importing project-level config via a JSON bundle.

**Export** (`GET /api/export`): Returns an `ExportData` JSON object with all project-scoped config sections. Optional `?sections=mcp,hooks,...` query param to limit sections. Optional `?project=/path` to override the project path (validated against home directory).

**Export file format** (version 1):

```json
{ "version": 1, "exportedAt": "ISO timestamp", "projectPath": "/path", "sections": { "mcpServers": [...], "hooks": [...], "skills": [...], "agents": [...], "rules": [...], "commands": [...], "permissions": [...], "claudeMd": [...] } }
```

**Scope**: Export only reads project-scoped items. Import always writes to project scope only.

**Security**: Name fields from imported JSON are validated — reject names containing `/`, `\`, or `..` before constructing filesystem paths.

**UI**: Dashboard header has "↑ Export Config" button → `ExportConfigModal`. Import modal has "From Workspace" / "From File" tabs.

## Gotchas

- **`tsx watch` hot-reloads from source** — No rebuild needed during `pnpm dev`. Changes to `apps/server/src/` are live immediately at `localhost:3000`. `dist/` is only read by the Claude Code plugin loader, not the dev server.
- **`EditingContext.allowGlobalWrites`** — Gates writes to global/managed-scope files only. Edit buttons for project/local scope must always be visible regardless of this toggle. Two separate concerns.
- **MCP scope writes** — When copying MCPs to global/user scope, the target file is `.claude.json`, not `.mcp.json`.
- **`installed_plugins.json` v2** — Stores version history as arrays. Use `allEntries[allEntries.length - 1]` for the latest entry. Cache dirs have one subdir per cached version — pick by most-recently-modified.
- **Release prep** — Always bump `.claude-plugin/plugin.json` and `$HOME/code/claude-marketplace/.claude-plugin/marketplace.json` in the same release commit as `CHANGELOG.md`.

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

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.

<!-- /rtk-instructions -->
