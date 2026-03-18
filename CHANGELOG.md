# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.5.3] - 2026-03-19

### Changed

- Added comprehensive tasks.md format documentation and gotchas to CLAUDE.md
- Updated UI build artifacts with latest asset hashes

## [1.5.2] - 2026-03-19

### Changed

- Centralized APP_VERSION to read from plugin.json via Vite define, eliminating manual version sync
- Migrated workspaces registry from .claude-config to XDG Base Directory compliant location (~/.config/lens/workspaces.json)

### Infrastructure & Tooling

- Added automatic migration logic to session-start hook for existing workspace registries

## [1.5.1] - 2026-03-15

### Changed

- Updated documentation and release prep command for consistency
- Improved Dashboard component formatting and example paths

### Infrastructure & Tooling

- Refreshed dashboard screenshots in documentation

## [1.5.0] - 2026-03-15

### UI

- Added shadcn/ui component library foundation with CSS variables and Tailwind v3 compatibility
- Added collapsible AppSidebar with Lucide icons and workspace-aware switcher
- Added SidebarProvider layout integration for improved sidebar functionality
- Added panel separator component for better visual hierarchy
- Added persistent plugin source badge visibility across UI panels
- Added inline "Fix Now" button to suggestion cards for immediate code fixes

* Improved WorkspaceSwitcher positioning and dropdown visibility
* Refactored legacy CSS overrides for cleaner styling architecture
  ! Fixed SuggestionsBox styling misalignment with main layout
  ! Fixed Tailwind v3 compatibility issues in shadcn components

### Infrastructure & Tooling

- Added project-specific release-prep command with automated version bumping
  ! Fixed memory file location (AGENTS.md → MEMORY.md) for proper agent context loading

## [1.4.0] - 2026-03-14

### Added

- Expandable suggestions box with navigation between configuration recommendations
- Always-on editing mode with separate global-edits toggle for safer workflow
- EditingContext for centralized global editing state management
- Panel add buttons moved to headers for better discoverability
- Version number displayed in sidebar

### Changed

- UI styling and component refinements across dashboard and panels
- Compiled assets updated

### Fixed

! Memory scanner always returns memory directory path to keep add button enabled

## [1.3.0] - 2026-03-13

### Added

- Settings export/import with per-key visibility control
- Settings key export to schema
- Plugins to export/import functionality

### Changed

- Modernized UI components and removed deprecated panels
- Updated UI constants and main entry point

### Fixed

! Fixed duplicate agents and skills from multiple sources by source priority
! Fixed plugin enabled state and scope preservation in export/import
! Fixed export file schema validation before import
! Fixed export filename to use project name and timestamp
! Resolved ESLint errors across server and UI

## [1.2.0] - 2026-03-12

### Added

- Configuration suggestions engine with 10 built-in rules across 3 categories (best-practice, health, contextual)
- SuggestionsBox UI component showing actionable configuration recommendations
- Plugin update progress feedback with real-time CLI output logging
- Updates banner displaying all plugins needing updates
- OpenSpec integration for spec-first development workflow

### Changed

- Improved plugin deduplication to show only latest version
- Enhanced plugin update UX with per-plugin output tracking and spinner feedback
- Improved OpenSpec template formatting

### Fixed

! Fixed duplicate plugins appearing in UI from multiple cached versions
! Fixed update button activation for plugins that don't need updates (false positives)
! Fixed MCPs being created in wrong global location (~/.mcp.json instead of ~/.claude.json)
! Fixed semantic versioning comparison for proper version detection

### Removed

- Marketplace HEAD SHA fallback in version detection

## [1.1.1] - 2026-03-06

### Fixed

! Duplicate hooks file error caused by explicit declaration conflicting with auto-discovery

## [1.1.0] - 2026-03-06

### Added

- SessionStart hook to auto-start Lens server on session init
- Plugin scanning to identify orphaned plugins from known marketplaces
- Vitest test framework with comprehensive scanner test coverage

### Changed

- Simplified /open command to rely on SessionStart hook
- Watcher now watches specific ~/.claude subdirectories to prevent file descriptor exhaustion
- Removed workspace cycling (cmd+shift+L), always show remove button
- Removed git repo validation when adding workspace

### Fixed

! Static UI files now resolve from absolute path instead of CWD (fixes lens:open blank page)
! React button nesting error in marketplace row headers

### Removed

- Sequential-thinking MCP from plugin config
- Obsolete plugin server script

## [1.0.0] - 2026-02-25

### Added

- Lens web dashboard for scanning, browsing, and editing all 13 Claude Code configuration surfaces
- Scanner modules for CLAUDE.md, settings, permissions, MCP servers, hooks, skills, agents, rules, commands, plugins, models, memory, and sandbox
- Scope-level support across managed, global, project, and local levels
- SSE-based live config reload via chokidar file watcher
- REST API for reading and writing config (`GET /api/config`, `PATCH /api/update`)
- React 19 + Vite 6 frontend with Tailwind dark theme
- Hono 4 HTTP backend on Node.js
- `/open` slash command to launch Lens in the browser
- Plugin marketplace integration and installation support
- ARCHITECTURE.md technical reference documentation

### Fixed

! Command frontmatter auto-namespacing for lens:open
