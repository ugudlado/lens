# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.1.0] - 2026-03-06

### Added

+ SessionStart hook to auto-start Lens server on session init
+ Plugin scanning to identify orphaned plugins from known marketplaces

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
