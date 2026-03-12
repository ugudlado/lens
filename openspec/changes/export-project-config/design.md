# Export Project-Level Configuration — Technical Design

## Overview

This design adds two new capabilities to Lens:
1. **Server endpoint** for assembling project config into an export-safe JSON bundle
2. **UI components** for export and import-from-file workflows

No database, no external dependencies, no changes to existing config scanning logic.

## Server Architecture

### New Route: GET /api/export

**Signature**
```
GET /api/export?sections=mcp,hooks,skills,agents,rules,commands,permissions,claudeMd
Response: application/json
Content-Type: application/json
```

**Parameters**
- `sections` (optional, comma-separated): Which sections to include. Default: all. Note: section-level filtering only; item-level filtering happens client-side.
- `project` (optional): Project path override. **MUST be validated against home directory before use (see security below)**.

**Implementation** (`apps/server/src/routes/export.ts`)

```typescript
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { resolve, realpathSync } from 'node:path';
import { homedir } from 'node:os';
import { ConfigScope } from '@lens/schema';
import type { ExportData, ExportSections } from '@lens/schema';
import { scanConfig } from '../scanner/index.js';

const app = new Hono();

app.get('/', async (c) => {
  const sectionsParam = c.req.query('sections') || '';
  const projectOverride = c.req.query('project');

  try {
    // Path validation (critical security check — matches update.ts pattern)
    let projectPath: string;
    if (projectOverride) {
      const abs = resolve(projectOverride);
      let realHome: string;
      try { realHome = realpathSync(homedir()); } catch { realHome = homedir(); }
      const isAllowed = abs.startsWith(realHome + '/') || abs === realHome;
      if (!isAllowed) {
        return c.json({ error: 'Path not allowed' }, 403);
      }
      projectPath = abs;
    } else {
      // Use active project from context (requires middleware to set this)
      projectPath = c.env.activeProjectPath || homedir();
    }

    // Get current project config
    const config = await scanConfig(projectPath);

    // Parse requested sections
    const requestedSections = sectionsParam
      ? sectionsParam.split(',').map(s => s.trim())
      : ['mcp', 'hooks', 'skills', 'agents', 'rules', 'commands', 'permissions', 'claudeMd'];

    // Build export data (all fields optional for conditional assignment)
    const sections: ExportSections = {};

    // MCP Servers
    if (requestedSections.includes('mcp')) {
      sections.mcpServers = config.mcp.servers
        .filter(s => s.scope === ConfigScope.Project)
        .map(s => ({
          name: s.name,
          type: s.type,
          command: s.command,
          args: s.args,
          url: s.url,
          env: s.env,
        }));
    }

    // Hooks (include all types: command, prompt, agent)
    if (requestedSections.includes('hooks')) {
      sections.hooks = config.hooks.hooks
        .filter(h => h.scope === ConfigScope.Project)
        .map(h => ({
          event: h.event,
          type: h.type,  // includes 'agent' type
          command: h.command,
          prompt: h.prompt,
          matcher: h.matcher,
          timeout: h.timeout,
        }));
    }

    // Skills (directory-based: {name}/ contains SKILL.md)
    if (requestedSections.includes('skills')) {
      sections.skills = await Promise.all(
        config.skills.skills
          .filter(s => s.scope === ConfigScope.Project)
          .map(async s => ({
            name: s.name,
            content: await readFile(s.filePath, 'utf-8'),
          }))
      );
    }

    // ... similar for agents, rules, commands

    // Permissions (include all types: allow, deny, ask)
    if (requestedSections.includes('permissions')) {
      sections.permissions = config.permissions.rules.map(p => ({
        type: p.type,  // includes 'ask' type
        rule: p.rule,
      }));
    }

    // CLAUDE.md (by logical slot, not absolute path)
    if (requestedSections.includes('claudeMd')) {
      sections.claudeMd = config.claudeMd.files
        .filter(f => f.scope === ConfigScope.Project)
        .map(f => ({
          slot: f.filePath.endsWith('.claude/CLAUDE.md') ? '.claude/CLAUDE.md' : 'root',
          content: f.content,
        }));
    }

    // Build root ExportData
    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projectPath: config.projectPath,
      sections,
    };

    return c.json(exportData);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      500
    );
  }
});

export default app;
```

**Critical notes**:
- Use `scanConfig(projectPath)` — NOT fictional `scan()` function
- **Path validation REQUIRED** before calling `scanConfig` (matches `update.ts:25-30` pattern)
- `ExportSections` fields are all optional — only assign if section is requested
- Skills export only `content` (path is `{name}/SKILL.md`, computed on import)
- Hooks/permissions include all types from schema (`agent`, `ask`)
- CLAUDE.md uses logical `slot` not absolute `filePath`

**Route mounting** in `apps/server/src/index.ts`
```typescript
import exportRoute from './routes/export.js';
app.route('/api/export', exportRoute);
```

## UI Components

### ExportConfigModal.tsx

**Location**: `apps/ui/src/components/ExportConfigModal.tsx`

**Props**
```typescript
interface ExportConfigModalProps {
  config: ConfigSnapshot;
  onClose: () => void;
}
```

**State Machine**
```
Initial (show checklist)
  ↓ (user clicks Export)
  ↓
Exporting (loading spinner)
  ↓
  ├→ Success (download triggered, modal closes)
  └→ Error (show error, return to checklist)
```

**UI Structure**
- Modal header: "Export Configuration"
- Body: Section tabs (same pattern as import modal)
  - Sidebar: list of sections with item counts
  - Main: checklist of items in selected section
  - Select-all button per section
- Footer: "Cancel" and "Export" buttons

**Key Algorithm**
```typescript
async function handleExport() {
  setState('exporting');

  // Build sections query string from checked items
  const sections = [];
  if (checked.mcp.size > 0) sections.push('mcp');
  if (checked.hooks.size > 0) sections.push('hooks');
  // ... etc

  try {
    const res = await fetch(
      `/api/export?sections=${sections.join(',')}`
    );
    const data = await res.json();

    // Trigger download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.claude-export.json';
    a.click();
    URL.revokeObjectURL(url);

    onClose();
  } catch (err) {
    setError(err.message);
    setState('checklist');
  }
}
```

**Styling**: Match Dashboard buttons (accent color, hover states, dark theme)

### WorkspaceConfigImportModal.tsx (Enhanced)

**Changes to existing file**

Add tab UI above workspace selector:
```typescript
const [importSource, setImportSource] = useState<'workspace' | 'file'>('workspace');
const [uploadedFile, setUploadedFile] = useState<ExportData | null>(null);

// Tab buttons
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setImportSource('workspace')}
    className={importSource === 'workspace' ? 'active' : ''}
  >
    From Workspace
  </button>
  <button
    onClick={() => setImportSource('file')}
    className={importSource === 'file' ? 'active' : ''}
  >
    From File
  </button>
</div>

// Conditional rendering
{importSource === 'workspace' && <WorkspacePicker />}
{importSource === 'file' && <FilePicker onFileLoaded={setUploadedFile} />}
```

**FilePicker sub-component**
```typescript
function FilePicker({ onFileLoaded }: { onFileLoaded: (data: ExportData) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text) as ExportData;

        // Validate schema version
        if (data.version !== 1) {
          throw new Error(`Unsupported export format version ${data.version}`);
        }

        onFileLoaded(data);
        setState('checklist');
      } catch (err) {
        setError(`Invalid export file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-400">
        Select a .claude-export.json file to import configuration from.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="..."
      />
    </div>
  );
}
```

### Dashboard.tsx (Updated)

Add export button next to existing import button:
```typescript
const [showExport, setShowExport] = useState(false);

// In header, next to import button:
<button
  onClick={() => setShowExport(true)}
  className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30"
>
  <span>↑</span> Export Config
</button>

// Modal
{showExport && (
  <ExportConfigModal
    config={config}
    onClose={() => setShowExport(false)}
  />
)}
```

## Data Flow

### Export Flow
```
User clicks "Export Config"
  ↓
ExportConfigModal renders with section checklist
  ↓
User selects sections and clicks "Export"
  ↓
Fetch GET /api/export?sections=...
  ↓
Server scans project config, filters to project-scope, builds JSON
  ↓
Browser downloads .claude-export.json
  ↓
Modal closes
```

### Import Flow
```
User clicks "Import from File" tab
  ↓
Selects .claude-export.json file
  ↓
Browser parses JSON locally
  ↓
Import modal shows sections checklist (populated from file)
  ↓
User selects items to import
  ↓
Click "Import"
  ↓
Existing import logic writes to project scope (same as workspace import)
  ↓
Rescan and update UI
```

## Files Modified

| File | Change |
|------|--------|
| `apps/server/src/routes/export.ts` | **New** — Export endpoint |
| `apps/server/src/index.ts` | Mount export route |
| `apps/ui/src/components/ExportConfigModal.tsx` | **New** — Export modal UI |
| `apps/ui/src/components/Dashboard.tsx` | Add export button |
| `apps/ui/src/components/WorkspaceConfigImportModal.tsx` | Add file import tab |
| `packages/schema/src/index.ts` | **New types** — ExportData, ExportSections, etc. |

## Dependencies

**Added**: None (uses native Node.js readFile, browser JSON APIs)

**Notes**:
- No archiver library (staying with JSON)
- No validation library (inline JSON.parse error handling)
- Re-uses existing import modal patterns

## Performance Characteristics

- **Export endpoint**: O(n) where n = number of items to export. File reads are sequential (could parallelize if needed).
- **Import modal**: O(n) to parse JSON and build checklist. Negligible for typical exports.
- **File size**: Typical project ~20-50KB (easily email-able)
- **Memory**: Export data held in memory during request (not streamed)

## Forward Compatibility

- JSON includes `version: 1` field
- Future versions can check this and adapt parsing
- If schema changes, new version gets new export endpoint or versioned payload

## Testing Considerations

**Manual**
- Export empty project (no errors)
- Export project with all sections
- Export with partial sections selected
- Download file and verify format
- Import exported file into different project
- Verify items appear in correct UI sections
- Error cases: invalid JSON, missing version, file too large

**Edge Cases**
- Projects with special characters in rule/skill names
- Large settings.json files (>1MB)
- Markdown with special formatting/frontmatter
- CLAUDE.md with code blocks
