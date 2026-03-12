# Export Project-Level Configuration — Proposal

## Problem Statement

Teams using Lens across multiple projects need a way to **share and replicate project-level configuration** without manual copy-paste or manual file organization. Currently:

- Project configuration (CLAUDE.md, hooks, rules, skills, agents, commands, MCP servers) lives across the filesystem
- Sharing requires manually collecting files from `.claude/` and root files
- Onboarding new team members to a project means manually setting up configuration in each project
- No single-click way to export a "configuration snapshot" for version control or distribution

This creates friction when:
- A team wants to standardize configuration across projects
- A developer needs to replicate project setup in a new environment
- Configuration is shared via Slack/email and needs manual reconstruction

## Solution Overview

Add an **Export Config** feature that creates a portable JSON bundle (`.claude-export.json`) containing all selected project-scoped configuration items. This mirrors the existing **Import from Workspace** flow, making the UX familiar.

### User Flow

**Export:**
1. Click "↑ Export Config" button in Dashboard header
2. Modal shows all project-scoped config sections (MCP, hooks, skills, agents, rules, commands, settings, CLAUDE.md)
3. User selects which sections to export (all pre-checked by default)
4. Click "Export" — browser downloads `.claude-export.json`
5. User commits file to git or shares with team

**Import:**
1. User has a `.claude-export.json` file (from git, email, Slack, etc.)
2. Click "↓ Import from File" (existing import button enhanced)
3. Modal shows exported config with section tabs
4. User selects items to import, imports to project scope
5. SSE notification triggers rescan

## Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **JSON Bundle** | Single file, diffs in git, selective import, easy to share | Markdown files stringified (not human-editable in JSON) |
| ZIP Archive | Files preserved exactly, can unzip directly | Binary format doesn't diff, needs archiver dependency, can't cherry-pick import |
| Directory copy (.claude/) | Already works this way for manual sharing | No selection, no import UI, requires manual file navigation |
| Manual git checkin (docs) | Leverages existing version control | No UI, requires discipline, error-prone |

**Selected: JSON Bundle** because it balances portability, diffability, and UX with the existing import modal pattern.

## Trade-offs

- **Stringified markdown:** Rule/skill/agent/command files are stored as strings in JSON. Import reconstructs them as files. This is fine because JSON is an interchange format, not meant for human editing.
- **Project scope only:** Global config (plugins, models, keybindings) not included. This scope boundary is intentional — global config is user-specific and shouldn't be forced on teammates.
- **No automatic conflict resolution:** If importing into a project where items already exist, the import modal shows items as "exists" and unchecks them. No merge strategy.

## Success Criteria

✓ User can export selected project config sections as a single JSON file
✓ File can be imported into another project via the enhanced import modal
✓ Export file is valid JSON and can be version-controlled
✓ All project-scoped surfaces are covered: MCP, hooks, skills, agents, rules, commands, settings, CLAUDE.md
✓ UI mirrors import modal for consistency
✓ No dependencies added (use native Node.js JSON)

## Scope Boundaries

**In MVP:**
- Export all project-scoped sections (user-selectable)
- JSON file format
- Export button in Dashboard header
- Enhancement to import modal to accept files
- No automatic merge/conflict resolution

**Out of Scope:**
- Global scope (plugins, keybindings, global CLAUDE.md)
- Local scope (.local.md, .local.json)
- Managed scope (read-only)
- Encryption/signing
- Cloud storage or external service integration
