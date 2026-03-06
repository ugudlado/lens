import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginScope } from '@lens/schema';
let tmpDir;
let globalDir;
let projectDir;
beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'lens-plugins-test-'));
    globalDir = join(tmpDir, 'global-claude');
    projectDir = join(tmpDir, 'project');
    await mkdir(join(globalDir, 'plugins'), { recursive: true });
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    process.env.__TEST_GLOBAL_DIR = globalDir;
    vi.resetModules();
});
afterEach(async () => {
    delete process.env.__TEST_GLOBAL_DIR;
    await rm(tmpDir, { recursive: true, force: true });
});
async function getScanPlugins() {
    const { scanPlugins } = await import('../plugins.js');
    return scanPlugins;
}
describe('scanPlugins', () => {
    it('returns empty result when no plugins are installed', async () => {
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        expect(result).toEqual({ plugins: [], marketplaces: [], available: [] });
    });
    it('parses v2 format installed_plugins.json', async () => {
        const installPath = join(tmpDir, 'my-plugin-install');
        await mkdir(installPath, { recursive: true });
        const installedJson = {
            version: 2,
            plugins: {
                'my-plugin@test-marketplace': [
                    {
                        installPath,
                        version: '1.2.3',
                        installedAt: '2024-01-01T00:00:00.000Z',
                        scope: 'user',
                    },
                ],
            },
        };
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedJson));
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        expect(result.plugins).toHaveLength(1);
        const plugin = result.plugins[0];
        expect(plugin.name).toBe('my-plugin');
        expect(plugin.marketplace).toBe('test-marketplace');
        expect(plugin.version).toBe('1.2.3');
        expect(plugin.installPath).toBe(installPath);
        expect(plugin.installedAt).toBe('2024-01-01T00:00:00.000Z');
        expect(plugin.scope).toBe(PluginScope.User);
        expect(plugin.enabled).toBe(true);
    });
    it('parses v1 (legacy) format installed_plugins.json', async () => {
        const installPath = join(tmpDir, 'v1-plugin-install');
        await mkdir(installPath, { recursive: true });
        const installedJson = {
            'legacy-plugin@old-marketplace': {
                installPath,
                version: '0.1.0',
                installedAt: '2023-06-01T00:00:00.000Z',
                scope: 'user',
            },
        };
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedJson));
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        expect(result.plugins).toHaveLength(1);
        const plugin = result.plugins[0];
        expect(plugin.name).toBe('legacy-plugin');
        expect(plugin.marketplace).toBe('old-marketplace');
        expect(plugin.version).toBe('0.1.0');
        expect(plugin.scope).toBe(PluginScope.User);
        expect(plugin.installPath).toBe(installPath);
        expect(plugin.installedAt).toBe('2023-06-01T00:00:00.000Z');
        expect(plugin.enabled).toBe(true);
    });
    it('suppresses orphaned plugin entry when same plugin exists from known marketplace', async () => {
        const knownInstallPath = join(tmpDir, 'known-install');
        const orphanInstallPath = join(tmpDir, 'orphan-install');
        await mkdir(knownInstallPath, { recursive: true });
        await mkdir(orphanInstallPath, { recursive: true });
        await writeFile(join(globalDir, 'plugins', 'known_marketplaces.json'), JSON.stringify({
            'known-marketplace': { repo: 'https://github.com/example/known', installLocation: knownInstallPath },
        }));
        const installedJson = {
            version: 2,
            plugins: {
                'shared-plugin@known-marketplace': [
                    { installPath: knownInstallPath, version: '1.0.0', installedAt: '', scope: 'user' },
                ],
                'shared-plugin@old-marketplace': [
                    { installPath: orphanInstallPath, version: '0.9.0', installedAt: '', scope: 'user' },
                ],
            },
        };
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedJson));
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        expect(result.plugins).toHaveLength(1);
        expect(result.plugins[0].marketplace).toBe('known-marketplace');
        expect(result.plugins[0].version).toBe('1.0.0');
    });
    it('applies enabledPlugins: project settings override global settings', async () => {
        const installPath = join(tmpDir, 'toggled-plugin-install');
        await mkdir(installPath, { recursive: true });
        const installedJson = {
            version: 2,
            plugins: {
                'toggled-plugin@test-marketplace': [
                    { installPath, version: '1.0.0', installedAt: '', scope: 'user' },
                ],
            },
        };
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedJson));
        // Global settings: plugin disabled
        await writeFile(join(globalDir, 'settings.json'), JSON.stringify({ enabledPlugins: { 'toggled-plugin@test-marketplace': false } }));
        // Verify global disables the plugin
        vi.resetModules();
        const scanPlugins1 = await (await import('../plugins.js')).scanPlugins;
        const result1 = await scanPlugins1(projectDir);
        expect(result1.plugins[0].enabled).toBe(false);
        // Project settings: override to enabled
        await writeFile(join(projectDir, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'toggled-plugin@test-marketplace': true } }));
        // Must reset modules again so the new settings file is picked up
        vi.resetModules();
        const { scanPlugins: scanPlugins2 } = await import('../plugins.js');
        const result2 = await scanPlugins2(projectDir);
        expect(result2.plugins[0].enabled).toBe(true);
    });
    it('scans marketplace plugins/ directory and marks installed status', async () => {
        const marketplaceDir = join(tmpDir, 'marketplace');
        const pluginADir = join(marketplaceDir, 'plugins', 'plugin-a');
        const pluginBDir = join(marketplaceDir, 'plugins', 'plugin-b');
        await mkdir(pluginADir, { recursive: true });
        await mkdir(pluginBDir, { recursive: true });
        await writeFile(join(pluginADir, 'README.md'), 'The description for plugin-a.');
        await writeFile(join(pluginBDir, 'README.md'), 'The description for plugin-b.');
        await writeFile(join(globalDir, 'plugins', 'known_marketplaces.json'), JSON.stringify({
            'test-marketplace': {
                repo: 'https://github.com/example/marketplace',
                installLocation: marketplaceDir,
            },
        }));
        const pluginAInstallPath = join(tmpDir, 'plugin-a-install');
        await mkdir(pluginAInstallPath, { recursive: true });
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
            version: 2,
            plugins: {
                'plugin-a@test-marketplace': [
                    { installPath: pluginAInstallPath, version: '1.0.0', installedAt: '', scope: 'user' },
                ],
            },
        }));
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        expect(result.available).toHaveLength(2);
        const a = result.available.find(p => p.name === 'plugin-a');
        const b = result.available.find(p => p.name === 'plugin-b');
        expect(a?.installed).toBe(true);
        expect(a?.description).toBe('The description for plugin-a.');
        expect(b?.installed).toBe(false);
        expect(b?.description).toBe('The description for plugin-b.');
        expect(result.marketplaces).toHaveLength(1);
        expect(result.marketplaces[0].name).toBe('test-marketplace');
        expect(result.marketplaces[0].url).toBe('https://github.com/example/marketplace');
    });
    it('sets updateAvailable correctly based on version comparison', async () => {
        const marketplaceDir = join(tmpDir, 'versioned-marketplace');
        const semverPluginMarketplaceDir = join(marketplaceDir, 'plugins', 'semver-plugin');
        await mkdir(semverPluginMarketplaceDir, { recursive: true });
        await mkdir(join(semverPluginMarketplaceDir, '.claude-plugin'), { recursive: true });
        await writeFile(join(semverPluginMarketplaceDir, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '2.0.0' }));
        const semverInstallPath = join(tmpDir, 'semver-plugin-install');
        await mkdir(semverInstallPath, { recursive: true });
        const upToDatePluginDir = join(marketplaceDir, 'plugins', 'up-to-date-plugin');
        await mkdir(upToDatePluginDir, { recursive: true });
        await mkdir(join(upToDatePluginDir, '.claude-plugin'), { recursive: true });
        await writeFile(join(upToDatePluginDir, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '1.0.0' }));
        const upToDateInstallPath = join(tmpDir, 'up-to-date-install');
        await mkdir(upToDateInstallPath, { recursive: true });
        await writeFile(join(globalDir, 'plugins', 'known_marketplaces.json'), JSON.stringify({
            'versioned-marketplace': {
                repo: 'https://github.com/example/versioned',
                installLocation: marketplaceDir,
            },
        }));
        await writeFile(join(globalDir, 'plugins', 'installed_plugins.json'), JSON.stringify({
            version: 2,
            plugins: {
                'semver-plugin@versioned-marketplace': [
                    { installPath: semverInstallPath, version: '1.0.0', installedAt: '', scope: 'user' },
                ],
                'up-to-date-plugin@versioned-marketplace': [
                    { installPath: upToDateInstallPath, version: '1.0.0', installedAt: '', scope: 'user' },
                ],
            },
        }));
        const scanPlugins = await getScanPlugins();
        const result = await scanPlugins(projectDir);
        const semver = result.plugins.find(p => p.name === 'semver-plugin');
        const upToDate = result.plugins.find(p => p.name === 'up-to-date-plugin');
        expect(semver?.latestVersion).toBe('2.0.0');
        expect(semver?.updateAvailable).toBe(true);
        expect(upToDate?.latestVersion).toBe('1.0.0');
        expect(upToDate?.updateAvailable).toBe(false);
        // available[] should contain both marketplace plugins
        expect(result.available).toHaveLength(2);
        const availableSemver = result.available.find(p => p.name === 'semver-plugin');
        const availableUpToDate = result.available.find(p => p.name === 'up-to-date-plugin');
        expect(availableSemver?.installed).toBe(true);
        expect(availableUpToDate?.installed).toBe(true);
    });
});
