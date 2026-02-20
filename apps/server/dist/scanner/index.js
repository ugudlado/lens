import { GLOBAL_DIR, getAllowGlobalWrites } from './utils.js';
import { scanClaudeMd } from './claude-md.js';
import { scanSettings } from './settings.js';
import { scanPermissions } from './permissions.js';
import { scanMcp } from './mcp.js';
import { scanHooks } from './hooks.js';
import { scanPlugins } from './plugins.js';
import { scanSkills } from './skills.js';
import { scanAgents } from './agents.js';
import { scanRules } from './rules.js';
import { scanCommands } from './commands.js';
import { scanModels } from './models.js';
import { scanMemory } from './memory.js';
import { extractSandbox } from './sandbox.js';
import { scanPluginMcpServers } from './plugin-mcp.js';
import { scanKeybindings } from './keybindings.js';
export async function scanConfig(projectPath) {
    // Scan plugins first to extract install paths for other scanners
    const [plugins, claudeMd, settings, permissions, mcp, rules, memory, keybindings] = await Promise.all([
        scanPlugins(projectPath),
        scanClaudeMd(projectPath),
        scanSettings(projectPath),
        scanPermissions(projectPath),
        scanMcp(projectPath),
        scanRules(projectPath),
        scanMemory(projectPath),
        scanKeybindings(),
    ]);
    const pluginPaths = plugins.plugins.map(p => ({ name: p.name, installPath: p.installPath, enabled: p.enabled }));
    // Scan plugin-provided MCP servers and merge into MCP surface
    const pluginMcpServers = await scanPluginMcpServers(pluginPaths);
    const existingNames = new Set(mcp.servers.map(s => s.name));
    for (const server of pluginMcpServers) {
        if (!existingNames.has(server.name)) {
            mcp.servers.push(server);
        }
    }
    // Scan surfaces that depend on plugin paths
    const [hooks, skills, agents] = await Promise.all([
        scanHooks(projectPath, pluginPaths),
        scanSkills(projectPath, pluginPaths),
        scanAgents(projectPath, pluginPaths),
    ]);
    const commands = await scanCommands(projectPath, skills, pluginPaths);
    const models = await scanModels(settings.effective);
    const sandbox = extractSandbox(settings);
    return {
        scanTime: new Date().toISOString(),
        projectPath,
        globalPath: GLOBAL_DIR,
        allowGlobalWrites: getAllowGlobalWrites(),
        claudeMd, settings, permissions, mcp, hooks, skills, agents, rules, commands, plugins, models, memory, sandbox, keybindings,
    };
}
