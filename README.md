# Lens

A web dashboard for Claude Code that lets you view and edit all 13 configuration surfaces — CLAUDE.md files, settings, permissions, MCP servers, hooks, skills, agents, rules, commands, plugins, models, memory, and sandbox config — across all scope levels (managed, global, project, local).

## Install as Claude Code Plugin

```bash
/plugins install github:ugudlado/lens
```

Then open the dashboard:

```
/lens:open
```

> Global config (`~/.claude/`) is read-only by default. Use the toggle in the top-right corner of the dashboard to enable global writes.

## Prerequisites (for development)

- Node.js 18+
- pnpm 8+

## Development

```bash
git clone https://github.com/ugudlado/lens.git
cd lens
pnpm install
pnpm dev
```

Opens the UI at `http://localhost:3000` with the backend on `http://localhost:37001`.

```bash
pnpm build        # Build all packages (schema → server → UI)
pnpm type-check   # Type-check all packages
```

## Features

- **13 config surfaces** — CLAUDE.md, settings.json, permissions, MCP servers, hooks, skills, agents, rules, commands, plugins, models, memory, sandbox
- **4 scope levels** — Managed, global, project, and local with effective value merging
- **Live reload** — File watcher pushes config changes to the UI via SSE
- **Edit in place** — Modify config values directly in the dashboard
- **Dark theme** — Tailwind CSS with purple accents

## Architecture

```
├── packages/schema/    @lens/schema — shared TypeScript types
├── apps/server/        @lens/server — Hono 4 backend, scanner, file watcher
└── apps/ui/            @lens/ui — React 19 + Vite 6 dashboard
```

**Backend**: Hono 4 on Node.js. Pure filesystem reads/writes — no database. SSE for live reload.

**Frontend**: React 19 SPA with Tailwind CSS. No router library — `useState`-based navigation.

**API**:
- `GET /api/config` — Scan and return all config surfaces
- `PATCH /api/update` — Write config changes back to files
- `GET /api/events` — SSE stream for live config reload

## Contributing

1. Fork the repo and create a feature branch
2. `pnpm install && pnpm dev`
3. Make your changes — validate with `pnpm type-check`
4. Open a pull request

## License

MIT — see [LICENSE](./LICENSE)
