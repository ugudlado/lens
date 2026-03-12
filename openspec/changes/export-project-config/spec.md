# Export Project-Level Configuration — Specification

## Requirements

### Functional Requirements

**FR1: Export Modal**
- Modal displays all project-scoped config sections in a checklist
- Sections: MCP Servers, Hooks, Skills, Agents, Rules, Commands, Permissions, CLAUDE.md
- All items pre-checked by default (export all by default)
- Shows count of items per section
- User can deselect sections or individual items
- Deselected items/sections are filtered client-side before download (server returns all, UI prunes)

**FR2: Export File Format**
```json
{
  "version": 1,
  "exportedAt": "2026-03-12T18:30:00Z",
  "projectPath": "/path/to/project",
  "sections": {
    "mcpServers": [
      { "name": "...", "type": "stdio|http|sse", "command": "...", "args": ["..."], "url": "...", "env": {...} }
    ],
    "hooks": [
      { "event": "...", "type": "command|prompt|agent", "command": "...", "prompt": "...", "matcher": "...", "timeout": 5000 }
    ],
    "skills": [
      { "name": "...", "content": "..." }
    ],
    "agents": [
      { "name": "...", "content": "..." }
    ],
    "rules": [
      { "name": "...", "content": "...", "ext": "md|mdc" }
    ],
    "commands": [
      { "name": "...", "content": "..." }
    ],
    "permissions": [
      { "type": "allow|deny|ask", "rule": "..." }
    ],
    "claudeMd": [
      { "slot": "root|.claude/CLAUDE.md", "content": "..." }
    ]
  }
}
```

**Key changes from schema**:
- Removed `settings` blob (see Data Model section)
- Skills/agents/rules/commands export `content` only (no filePath — that's implementation detail)
- CLAUDE.md uses `slot` (logical location) not absolute `filePath`
- Hooks and permissions include all valid types from schema (`agent`, `ask`)

**FR3: Export Button**
- Button placed in Dashboard header next to existing "Import from Workspace" button
- Label: "↑ Export Config"
- Style: matches existing button (accent color, hover states)
- Only visible if project has config items to export

**FR4: File Download**
- Clicking "Export" in modal generates JSON and triggers browser download
- Filename: `.claude-export.json`
- File is human-readable (formatted JSON)

**FR5: Import from File (Enhancement)**
- Extend existing import modal to support file upload
- Import modal updated to:
  - Tab 1: "From Workspace" (existing)
  - Tab 2: "From File" (new) with file input
- When file selected, parse JSON and populate sections
- Same checklist UX as workspace import
- Imports to project scope only

**FR6: Error Handling**
- Invalid JSON: Show error and allow re-upload
- Missing required fields in JSON: Graceful error message
- File validation: Check `version` field matches current schema
- Network errors during import: Show user message

### Non-Functional Requirements

**NFR1: Performance**
- Export modal renders in <100ms
- Export file generation <500ms
- Import modal parses JSON file <200ms
- No visible lag on large projects (100+ items)

**NFR2: File Size**
- Typical export: <50KB (reasonable for email/Slack)
- Baseline: smaller than a screenshot

**NFR3: Compatibility**
- JSON file is self-contained (no external references)
- Can be imported into different Lens versions (forward compatibility via `version` field)

## Data Model

**ExportData** (root)
```typescript
interface ExportData {
  version: number;                    // Schema version (1)
  exportedAt: string;                 // ISO timestamp
  projectPath: string;                // For reference, not used on import
  sections: ExportSections;
}

interface ExportSections {
  mcpServers?: McpServerExport[];
  hooks?: HookExport[];
  skills?: SkillExport[];
  agents?: AgentExport[];
  rules?: RuleExport[];
  commands?: CommandExport[];
  permissions?: PermissionExport[];
  claudeMd?: ClaudeMdExport[];
}

interface McpServerExport {
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

interface HookExport {
  event: string;
  type: 'command' | 'prompt' | 'agent';
  command?: string;
  prompt?: string;
  matcher?: string;
  timeout?: number;
}

interface SkillExport {
  name: string;
  content: string;  // SKILL.md file content
}

interface AgentExport {
  name: string;
  content: string;  // .md file content
}

interface RuleExport {
  name: string;
  content: string;  // .md or .mdc file content
  ext: 'md' | 'mdc';
}

interface CommandExport {
  name: string;
  content: string;  // .md file content
}

interface PermissionExport {
  type: 'allow' | 'deny' | 'ask';
  rule: string;
}

interface ClaudeMdExport {
  slot: 'root' | '.claude/CLAUDE.md';
  content: string;  // File content (path is derived from slot on import)
}
```

## Architecture

### Server Changes

**New Route: `GET /api/export`**
- Query param: `sections` (comma-separated list of section names to export)
- Returns: `application/json` with ExportData
- Path validation: ensures project path is within home directory
- No file written — data streamed to client

**Server Logic**
- Filter ConfigSnapshot to project-scope items only
- Build ExportData object
- Serialize to JSON
- Include timestamps and version for forward compatibility

**No database changes** — all data comes from existing ConfigSnapshot

### UI Changes

**Dashboard.tsx**
- Add "Export Config" button next to "Import from Workspace"
- Button triggers export modal

**New Component: ExportConfigModal.tsx**
- Mirror of WorkspaceConfigImportModal but in reverse
- State machine: (initial) → (loading) → (ready-to-export)
- Section checklist with select-all per section
- Shows count of items per section
- "Export" button downloads file

**WorkspaceConfigImportModal.tsx (Enhancement)**
- Add tab UI to switch between "From Workspace" and "From File"
- File input on "From File" tab
- Parse uploaded JSON file
- Same checklist flow as workspace import

**App.tsx**
- Add state for export modal visibility
- Pass export callback to Dashboard

## Algorithm: Export

1. Call `GET /api/export?sections=mcp,hooks,skills,...`
2. Server filters ConfigSnapshot to project scope
3. For each section, extract items and build ExportSections
4. For file-based sections (skills, agents, rules, commands, CLAUDE.md), read file content
5. Build ExportData and return JSON
6. Browser downloads as `.claude-export.json`

## Algorithm: Import from File

1. User uploads `.claude-export.json`
2. Parse JSON and validate schema version
3. Extract sections and populate checklist UI
4. User selects items
5. For each selected item:
   - MCP: PATCH `/api/update` with mcpServers key
   - Hooks/Permissions: PATCH settings.json
   - Skills/Agents/Rules/Commands: Write file via `POST /api/file`
   - CLAUDE.md: Write file
6. Call `/api/config/rescan` to reload

## Security & Validation

- **Path validation:** Export only reads from project path (already enforced)
- **File upload validation:** Whitelist JSON extension, max 1MB file size
- **JSON validation:** Parse with error boundaries, check required `version` field
- **Import scope:** Always writes to project scope, never global (already enforced by update route)
- **No eval:** File contents treated as data, no code execution

## Testing Strategy

**Unit Tests (if test runner added)**
- Export file generation (missing sections, empty sections, large files)
- Import JSON parsing (valid, invalid, malformed)
- Section filtering (project-scope only)

**Manual Testing**
- Export with various section combinations
- Download file and verify JSON format
- Import file into different project
- Verify items appear in correct locations
- Error cases: invalid JSON, missing fields, file too large
