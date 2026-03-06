import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope, McpServerType } from '@lens/schema';
let tmpDir;
let globalDir;
beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'lens-plugin-mcp-test-'));
    globalDir = join(tmpDir, 'global-claude');
    await mkdir(globalDir, { recursive: true });
    process.env.__TEST_GLOBAL_DIR = globalDir;
    vi.resetModules();
});
afterEach(async () => {
    delete process.env.__TEST_GLOBAL_DIR;
    await rm(tmpDir, { recursive: true, force: true });
});
async function getScanPluginMcpServers() {
    const { scanPluginMcpServers } = await import('../plugin-mcp.js');
    return scanPluginMcpServers;
}
describe('scanPluginMcpServers', () => {
    it('returns empty array for empty plugin list', async () => {
        const scanPluginMcpServers = await getScanPluginMcpServers();
        const result = await scanPluginMcpServers([]);
        expect(result).toEqual([]);
    });
    it('returns correct McpServer entry for plugin with .mcp.json', async () => {
        const pluginDir = join(tmpDir, 'my-plugin');
        await mkdir(pluginDir, { recursive: true });
        const mcpJson = {
            mcpServers: {
                'my-server': {
                    type: 'stdio',
                    command: 'node',
                    args: ['server.js'],
                },
            },
        };
        await writeFile(join(pluginDir, '.mcp.json'), JSON.stringify(mcpJson));
        const scanPluginMcpServers = await getScanPluginMcpServers();
        const result = await scanPluginMcpServers([
            { name: 'my-plugin', installPath: pluginDir, enabled: true },
        ]);
        expect(result).toHaveLength(1);
        const server = result[0];
        expect(server.name).toBe('plugin:my-plugin:my-server');
        expect(server.scope).toBe(ConfigScope.Global);
        expect(server.type).toBe(McpServerType.Stdio);
        expect(server.command).toBe('node');
        expect(server.args).toEqual(['server.js']);
        expect(server.enabled).toBe(true);
        expect(server.pluginName).toBe('my-plugin');
        expect(server.pluginInstalled).toBe(true);
        expect(server.filePath).toBe(join(pluginDir, '.mcp.json'));
    });
    it('sets enabled: false when server config has disabled: true', async () => {
        const pluginDir = join(tmpDir, 'disabled-server-plugin');
        await mkdir(pluginDir, { recursive: true });
        const mcpJson = {
            mcpServers: {
                'disabled-server': {
                    type: 'stdio',
                    command: 'node',
                    disabled: true,
                },
            },
        };
        await writeFile(join(pluginDir, '.mcp.json'), JSON.stringify(mcpJson));
        const scanPluginMcpServers = await getScanPluginMcpServers();
        const result = await scanPluginMcpServers([
            { name: 'disabled-server-plugin', installPath: pluginDir, enabled: true },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0].enabled).toBe(false);
    });
    it('returns pluginInstalled: false and enabled: false for cached but not-installed plugin', async () => {
        const marketplace = 'test-marketplace';
        const pluginName = 'available-plugin';
        const version = '1.0.0';
        const versionDir = join(globalDir, 'plugins', 'cache', marketplace, pluginName, version);
        await mkdir(versionDir, { recursive: true });
        const mcpJson = {
            mcpServers: {
                'cache-server': {
                    type: 'stdio',
                    command: 'python',
                    args: ['server.py'],
                },
            },
        };
        await writeFile(join(versionDir, '.mcp.json'), JSON.stringify(mcpJson));
        const scanPluginMcpServers = await getScanPluginMcpServers();
        // Pass empty installed plugins list so available-plugin is not installed
        const result = await scanPluginMcpServers([]);
        expect(result).toHaveLength(1);
        const server = result[0];
        expect(server.name).toBe('plugin:available-plugin:cache-server');
        expect(server.pluginInstalled).toBe(false);
        expect(server.enabled).toBe(false);
        expect(server.pluginName).toBe('available-plugin');
    });
});
