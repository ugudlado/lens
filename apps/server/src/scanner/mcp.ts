import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonOrNull, GLOBAL_DIR, MANAGED_DIR, isEditable } from './utils.js';
import { ConfigScope, McpServerType } from '@lens/schema';
import type { McpSurface, McpServer } from '@lens/schema';

export async function scanMcp(projectPath: string): Promise<McpSurface> {
  const servers: McpServer[] = [];
  const home = homedir();

  const projectMcp = await readJsonOrNull(join(projectPath, '.mcp.json'));
  if (projectMcp?.mcpServers) {
    addServers(projectMcp.mcpServers as Record<string, unknown>, ConfigScope.Project, join(projectPath, '.mcp.json'));
  }

  const dotClaudeJson = await readJsonOrNull(join(home, '.claude.json'));
  if (dotClaudeJson?.mcpServers) {
    addServers(dotClaudeJson.mcpServers as Record<string, unknown>, ConfigScope.Global, join(home, '.claude.json'));
  }

  const managedMcp = await readJsonOrNull(join(MANAGED_DIR, 'managed-mcp.json'));
  if (managedMcp?.mcpServers) {
    addServers(managedMcp.mcpServers as Record<string, unknown>, ConfigScope.Managed, join(MANAGED_DIR, 'managed-mcp.json'));
  }

  return { servers };

  function addServers(mcpServers: Record<string, unknown>, scope: ConfigScope, filePath: string) {
    for (const [name, config] of Object.entries(mcpServers)) {
      const cfg = config as Record<string, unknown>;
      servers.push({
        name,
        scope,
        filePath,
        editable: isEditable(scope),
        type: (cfg.type as McpServerType) || McpServerType.Stdio,
        command: cfg.command as string | undefined,
        args: cfg.args as string[] | undefined,
        url: cfg.url as string | undefined,
        env: cfg.env as Record<string, string> | undefined,
        enabled: cfg.disabled !== true,
      });
    }
  }
}
