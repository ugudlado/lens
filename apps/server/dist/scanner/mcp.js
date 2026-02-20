import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonOrNull, MANAGED_DIR, isEditable } from './utils.js';
import { ConfigScope, McpServerType } from '@lens/schema';
export async function scanMcp(projectPath) {
    const servers = [];
    const home = homedir();
    const projectMcp = await readJsonOrNull(join(projectPath, '.mcp.json'));
    if (projectMcp?.mcpServers) {
        addServers(projectMcp.mcpServers, ConfigScope.Project, join(projectPath, '.mcp.json'));
    }
    const dotClaudeJson = await readJsonOrNull(join(home, '.claude.json'));
    if (dotClaudeJson?.mcpServers) {
        addServers(dotClaudeJson.mcpServers, ConfigScope.Global, join(home, '.claude.json'));
    }
    const managedMcp = await readJsonOrNull(join(MANAGED_DIR, 'managed-mcp.json'));
    if (managedMcp?.mcpServers) {
        addServers(managedMcp.mcpServers, ConfigScope.Managed, join(MANAGED_DIR, 'managed-mcp.json'));
    }
    return { servers };
    function addServers(mcpServers, scope, filePath) {
        for (const [name, config] of Object.entries(mcpServers)) {
            const cfg = config;
            servers.push({
                name,
                scope,
                filePath,
                editable: isEditable(scope),
                type: cfg.type || McpServerType.Stdio,
                command: cfg.command,
                args: cfg.args,
                url: cfg.url,
                env: cfg.env,
                enabled: cfg.disabled !== true,
            });
        }
    }
}
