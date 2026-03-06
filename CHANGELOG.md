# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.1.1] - 2026-03-06

### Fixed

! Duplicate hooks file error caused by explicit declaration conflicting with auto-discovery

## [1.1.0] - 2026-03-06

### Added

+ SessionStart hook to auto-start Lens server on session init
+ Plugin scanning to identify orphaned plugins from known marketplaces
+ Vitest test framework with comprehensive scanner test coverage

### Changed

* Simplified /open command to rely on SessionStart hook
* Watcher now watches specific ~/.claude subdirectories to prevent file descriptor exhaustion
* Removed workspace cycling (cmd+shift+L), always show remove button
* Removed git repo validation when adding workspace

### Fixed

! Static UI files now resolve from absolute path instead of CWD (fixes lens:open blank page)
! React button nesting error in marketplace row headers

### Removed

- Sequential-thinking MCP from plugin config
- Obsolete plugin server script

## [1.0.0] - 2026-02-25

### Added

+ Lens web dashboard for scanning, browsing, and editing all 13 Claude Code configuration surfaces
+ Scanner modules for CLAUDE.md, settings, permissions, MCP servers, hooks, skills, agents, rules, commands, plugins, models, memory, and sandbox
+ Scope-level support across managed, global, project, and local levels
+ SSE-based live config reload via chokidar file watcher
+ REST API for reading and writing config (`GET /api/config`, `PATCH /api/update`)
+ React 19 + Vite 6 frontend with Tailwind dark theme
+ Hono 4 HTTP backend on Node.js
+ `/open` slash command to launch Lens in the browser
+ Plugin marketplace integration and installation support
+ ARCHITECTURE.md technical reference documentation

### Fixed

! Command frontmatter auto-namespacing for lens:open
