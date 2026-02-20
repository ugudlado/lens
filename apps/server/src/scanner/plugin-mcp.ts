import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { readJsonOrNull, GLOBAL_DIR, isEditable } from './utils.js';
import { ConfigScope, McpServerType } from '@lens/schema';
import type { McpServer } from '@lens/schema';

interface PluginRef {
  name: string;
  installPath: string;
  enabled: boolean;
}

/** Extract MCP server entries from a plugin's .mcp.json */
function parseMcpJson(
  mcpJson: Record<string, unknown>,
  pluginName: string,
  filePath: string,
  pluginEnabled: boolean,
  pluginInstalled: boolean,
): McpServer[] {
  const entries: McpServer[] = [];
  const mcpServers = (mcpJson.mcpServers as Record<string, unknown>) || mcpJson;

  for (const [name, config] of Object.entries(mcpServers)) {
    if (typeof config !== 'object' || config === null) continue;
    const cfg = config as Record<string, unknown>;
    const serverDisabled = cfg.disabled === true;
    entries.push({
      name: `plugin:${pluginName}:${name}`,
      scope: ConfigScope.Global,
      filePath,
      editable: isEditable(ConfigScope.Global),
      type: (cfg.type as McpServerType) || McpServerType.Stdio,
      command: cfg.command as string | undefined,
      args: cfg.args as string[] | undefined,
      url: cfg.url as string | undefined,
      env: cfg.env as Record<string, string> | undefined,
      enabled: pluginInstalled && pluginEnabled && !serverDisabled,
      pluginName,
      pluginInstalled,
    });
  }
  return entries;
}

/** Scan .mcp.json files from installed plugin directories. */
export async function scanPluginMcpServers(plugins: PluginRef[]): Promise<McpServer[]> {
  const servers: McpServer[] = [];

  const results = await Promise.all(
    plugins.map(async (plugin) => {
      if (!plugin.installPath) return [];
      const filePath = join(plugin.installPath, '.mcp.json');
      const mcpJson = await readJsonOrNull(filePath);
      if (!mcpJson || typeof mcpJson !== 'object') return [];
      return parseMcpJson(mcpJson as Record<string, unknown>, plugin.name, filePath, plugin.enabled, true);
    })
  );

  for (const entries of results) {
    servers.push(...entries);
  }

  // Also scan cached but not-installed plugins for available MCP servers
  const installedNames = new Set(plugins.map(p => p.name));
  const available = await scanAvailablePluginMcps(installedNames);
  servers.push(...available);

  return servers;
}

/** Scan cache directories for plugins that have .mcp.json but aren't installed. */
async function scanAvailablePluginMcps(installedNames: Set<string>): Promise<McpServer[]> {
  const servers: McpServer[] = [];
  const cacheDir = join(GLOBAL_DIR, 'plugins', 'cache');

  try {
    const marketplaces = await readdir(cacheDir);
    for (const mp of marketplaces) {
      const mpDir = join(cacheDir, mp);
      const mpStat = await stat(mpDir).catch(() => null);
      if (!mpStat?.isDirectory()) continue;

      const pluginDirs = await readdir(mpDir);
      for (const pluginName of pluginDirs) {
        if (installedNames.has(pluginName)) continue;

        // Find the latest version directory
        const pluginDir = join(mpDir, pluginName);
        const pStat = await stat(pluginDir).catch(() => null);
        if (!pStat?.isDirectory()) continue;

        const versions = await readdir(pluginDir);
        if (versions.length === 0) continue;

        // Use the first (or only) version directory
        const versionDir = join(pluginDir, versions[0]);
        const vStat = await stat(versionDir).catch(() => null);
        if (!vStat?.isDirectory()) continue;

        const filePath = join(versionDir, '.mcp.json');
        const mcpJson = await readJsonOrNull(filePath);
        if (!mcpJson || typeof mcpJson !== 'object') continue;

        const entries = parseMcpJson(mcpJson as Record<string, unknown>, pluginName, filePath, false, false);
        servers.push(...entries);
      }
    }
  } catch {
    // Cache dir not readable
  }

  return servers;
}
