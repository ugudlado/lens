import { join, relative } from 'node:path';
import { readdir, stat, readFile } from 'node:fs/promises';
import { readJsonOrNull, readFileOrNull, GLOBAL_DIR } from './utils.js';
import { PluginScope } from '@lens/schema';
/** Read the git HEAD SHA for a directory. Returns the SHA truncated to `length` chars (0 = full). */
async function readGitSha(dir, length = 0) {
    try {
        const head = (await readFile(join(dir, '.git', 'HEAD'), 'utf8')).trim();
        let sha;
        if (head.startsWith('ref: ')) {
            const ref = head.slice(5);
            const raw = await readFile(join(dir, '.git', ref), 'utf8').catch(() => null);
            sha = raw?.trim() || undefined;
        }
        else {
            sha = head || undefined;
        }
        if (sha && length > 0)
            return sha.slice(0, length);
        return sha;
    }
    catch {
        return undefined;
    }
}
/** Read version from a plugin's .claude-plugin/plugin.json, if present. */
async function readPluginJsonVersion(pluginPath) {
    const json = await readJsonOrNull(join(pluginPath, '.claude-plugin', 'plugin.json'));
    if (json && typeof json === 'object') {
        return json.version;
    }
    return undefined;
}
/** Extract YAML frontmatter `description` from a markdown file. */
function extractFrontmatterDescription(content) {
    if (!content.startsWith('---'))
        return undefined;
    const end = content.indexOf('---', 3);
    if (end === -1)
        return undefined;
    const frontmatter = content.slice(3, end);
    // Match description: "..." or description: ... (single line)
    const match = frontmatter.match(/^description:\s*['"]?(.*?)['"]?\s*$/m);
    return match?.[1]?.trim() || undefined;
}
/** Scan skills directory: each skill is a subdirectory with SKILL.md */
async function listSkills(dir) {
    try {
        const entries = await readdir(dir);
        const items = [];
        for (const entry of entries) {
            if (entry.startsWith('.') || entry.startsWith('__'))
                continue;
            const skillDir = join(dir, entry);
            const s = await stat(skillDir).catch(() => null);
            if (!s?.isDirectory())
                continue;
            const skillMd = await readFileOrNull(join(skillDir, 'SKILL.md'));
            const description = skillMd ? extractFrontmatterDescription(skillMd) : undefined;
            items.push({ name: entry, description });
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    catch {
        return [];
    }
}
/** Scan agents or commands directory: each is a .md file with frontmatter */
async function listMdItems(dir) {
    try {
        const entries = await readdir(dir);
        const items = [];
        const seen = new Set();
        for (const entry of entries) {
            if (entry.startsWith('.') || entry.startsWith('__'))
                continue;
            const name = entry.replace(/\.(md|mdc)$/, '');
            if (seen.has(name))
                continue;
            seen.add(name);
            const content = await readFileOrNull(join(dir, entry));
            const description = content ? extractFrontmatterDescription(content) : undefined;
            items.push({ name, description });
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    catch {
        return [];
    }
}
/** Scan hooks directory: reads hooks.json for descriptions */
async function listHooks(dir) {
    try {
        const entries = await readdir(dir);
        const items = [];
        const seen = new Set();
        for (const entry of entries) {
            if (entry.startsWith('.') || entry.startsWith('__'))
                continue;
            const name = entry.replace(/\.(json|md|mdc|ts|js|py|sh|cmd)$/, '');
            if (seen.has(name))
                continue;
            seen.add(name);
            // Try to get description from hooks.json
            if (entry.endsWith('.json')) {
                const json = await readJsonOrNull(join(dir, entry));
                const desc = json && typeof json === 'object' ? json.description : undefined;
                items.push({ name, description: desc });
            }
            else {
                const content = await readFileOrNull(join(dir, entry));
                const description = content ? extractFrontmatterDescription(content) : undefined;
                items.push({ name, description });
            }
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    catch {
        return [];
    }
}
async function scanPluginContents(installPath) {
    if (!installPath)
        return undefined;
    const [skills, hooks, agents, commands] = await Promise.all([
        listSkills(join(installPath, 'skills')),
        listHooks(join(installPath, 'hooks')),
        listMdItems(join(installPath, 'agents')),
        listMdItems(join(installPath, 'commands')),
    ]);
    return (skills.length + hooks.length + agents.length + commands.length > 0)
        ? { skills, hooks, agents, commands }
        : undefined;
}
/** Read the first meaningful line from a README.md as a description (max 200 chars). */
async function extractReadmeDescription(installPath) {
    if (!installPath)
        return undefined;
    const content = await readFileOrNull(join(installPath, 'README.md'));
    if (!content)
        return undefined;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and headings
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        // Skip badge lines (common in READMEs)
        if (trimmed.startsWith('![') || trimmed.startsWith('[!['))
            continue;
        return trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
    }
    return undefined;
}
/** Read the git HEAD SHA from the plugin's .git directory (truncated to 12 chars). */
async function extractGitSha(installPath) {
    if (!installPath)
        return undefined;
    return readGitSha(installPath, 12);
}
/** Recursively list files in a directory (relative paths, max 100 files). */
async function listPluginFiles(installPath) {
    if (!installPath)
        return [];
    const result = [];
    async function walk(dir) {
        if (result.length >= 100)
            return;
        try {
            const entries = await readdir(dir);
            for (const entry of entries.sort()) {
                if (result.length >= 100)
                    break;
                if (entry.startsWith('.'))
                    continue;
                if (entry === 'node_modules')
                    continue;
                const fullPath = join(dir, entry);
                try {
                    const s = await stat(fullPath);
                    if (s.isDirectory()) {
                        await walk(fullPath);
                    }
                    else {
                        result.push(relative(installPath, fullPath));
                    }
                }
                catch { /* skip inaccessible */ }
            }
        }
        catch { /* dir not readable */ }
    }
    await walk(installPath);
    return result;
}
export async function scanPlugins(projectPath) {
    const plugins = [];
    const marketplaces = [];
    // Read known marketplaces so we can flag orphaned plugins
    const knownMarketplaces = new Set();
    const knownRaw = await readJsonOrNull(join(GLOBAL_DIR, 'plugins', 'known_marketplaces.json'));
    if (knownRaw && typeof knownRaw === 'object') {
        for (const key of Object.keys(knownRaw))
            knownMarketplaces.add(key);
    }
    // Read enabledPlugins from global and project settings to determine enabled/disabled state
    const enabledPlugins = new Map();
    const globalSettings = await readJsonOrNull(join(GLOBAL_DIR, 'settings.json'));
    if (globalSettings && typeof globalSettings.enabledPlugins === 'object' && globalSettings.enabledPlugins) {
        for (const [k, v] of Object.entries(globalSettings.enabledPlugins)) {
            enabledPlugins.set(k, v);
        }
    }
    // Project settings override global
    const projectSettings = await readJsonOrNull(join(projectPath, '.claude', 'settings.json'));
    if (projectSettings && typeof projectSettings.enabledPlugins === 'object' && projectSettings.enabledPlugins) {
        for (const [k, v] of Object.entries(projectSettings.enabledPlugins)) {
            enabledPlugins.set(k, v);
        }
    }
    const installed = await readJsonOrNull(join(GLOBAL_DIR, 'plugins', 'installed_plugins.json'));
    if (installed && typeof installed === 'object') {
        const raw = installed;
        // v2 format: { version: 2, plugins: { "name@marketplace": [{ ...entry }] } }
        // v1 format: { "name@marketplace": { ...entry } }
        const pluginsObj = (raw.version === 2 && raw.plugins && typeof raw.plugins === 'object')
            ? raw.plugins
            : raw;
        // First pass: collect plugin names that have at least one entry from a known marketplace.
        // Used to suppress orphaned duplicates (e.g. feature-dev@old-marketplace when
        // feature-dev@claude-plugins-official is also installed).
        const namesWithKnownMarketplace = new Set();
        for (const key of Object.keys(pluginsObj)) {
            if (key === 'version')
                continue;
            const [pluginName, marketplace] = key.split('@');
            if (pluginName && marketplace && knownMarketplaces.has(marketplace)) {
                namesWithKnownMarketplace.add(pluginName);
            }
        }
        for (const [key, val] of Object.entries(pluginsObj)) {
            if (key === 'version')
                continue;
            // v2: value is an array of entries; v1: value is a single entry object
            const entries = Array.isArray(val) ? val : [val];
            for (const entry of entries) {
                const v = entry;
                const [pluginName, marketplace] = key.split('@');
                const isOrphaned = marketplace ? !knownMarketplaces.has(marketplace) : false;
                // Suppress orphaned entries when the same plugin is installed from a known marketplace
                if (isOrphaned && namesWithKnownMarketplace.has(pluginName))
                    continue;
                const scopeStr = v.scope || PluginScope.User;
                const scope = scopeStr === PluginScope.Project ? PluginScope.Project : PluginScope.User;
                // For project-scoped plugins, only include if they match this project
                if (scope === PluginScope.Project && v.projectPath && v.projectPath !== projectPath)
                    continue;
                const installPath = v.installPath || '';
                const [contents, description, gitSha, files] = await Promise.all([
                    scanPluginContents(installPath),
                    extractReadmeDescription(installPath),
                    extractGitSha(installPath),
                    listPluginFiles(installPath),
                ]);
                // Check enabledPlugins map; default to true if not listed
                const enabled = enabledPlugins.get(key) !== false;
                plugins.push({
                    name: pluginName || key,
                    marketplace: marketplace || 'unknown',
                    version: v.version || 'unknown',
                    installPath,
                    installedAt: v.installedAt || '',
                    enabled,
                    scope,
                    description,
                    gitSha,
                    contents,
                    files: files.length > 0 ? files : undefined,
                });
            }
        }
    }
    const known = await readJsonOrNull(join(GLOBAL_DIR, 'plugins', 'known_marketplaces.json'));
    if (known && typeof known === 'object') {
        for (const [name, val] of Object.entries(known)) {
            const v = val;
            marketplaces.push({ name, url: v.repo || v.url || '' });
        }
    }
    // Scan marketplace directories for available plugins + compute update info
    const available = [];
    const installedNames = new Set(plugins.map(p => `${p.name}@${p.marketplace}`));
    // Map of "name@marketplace" → latestVersion for backfilling into PluginEntry
    const latestVersionMap = new Map();
    if (known && typeof known === 'object') {
        for (const [mpName, val] of Object.entries(known)) {
            const v = val;
            const installLocation = v.installLocation;
            if (!installLocation)
                continue;
            // Read the marketplace git HEAD SHA once per marketplace (used for SHA-versioned plugins)
            const marketplaceHeadSha = await readGitSha(installLocation);
            try {
                const pluginsDir = join(installLocation, 'plugins');
                const entries = await readdir(pluginsDir);
                for (const entry of entries) {
                    if (entry.startsWith('.') || entry === 'README.md')
                        continue;
                    const pluginPath = join(pluginsDir, entry);
                    const s = await stat(pluginPath);
                    if (!s.isDirectory())
                        continue;
                    const isInstalled = installedNames.has(`${entry}@${mpName}`);
                    const installedPlugin = plugins.find(p => p.name === entry && p.marketplace === mpName);
                    // Per-plugin version from plugin.json; fall back to marketplace HEAD SHA
                    const pluginJsonVersion = await readPluginJsonVersion(pluginPath);
                    const latestVersion = pluginJsonVersion || marketplaceHeadSha;
                    if (latestVersion)
                        latestVersionMap.set(`${entry}@${mpName}`, latestVersion);
                    const desc = await extractReadmeDescription(pluginPath);
                    available.push({
                        name: entry,
                        marketplace: mpName,
                        description: desc,
                        installed: isInstalled,
                        installedVersion: installedPlugin?.version,
                    });
                }
            }
            catch { /* marketplace dir not readable */ }
            // Also scan external_plugins/ — third-party MCP servers with .claude-plugin/plugin.json metadata
            try {
                const externalDir = join(installLocation, 'external_plugins');
                const entries = await readdir(externalDir);
                for (const entry of entries) {
                    if (entry.startsWith('.'))
                        continue;
                    const pluginPath = join(externalDir, entry);
                    const s = await stat(pluginPath);
                    if (!s.isDirectory())
                        continue;
                    const isInstalled = installedNames.has(`${entry}@${mpName}`);
                    const installedPlugin = plugins.find(p => p.name === entry && p.marketplace === mpName);
                    // Description comes from .claude-plugin/plugin.json rather than README.md
                    let desc;
                    const pluginJson = await readJsonOrNull(join(pluginPath, '.claude-plugin', 'plugin.json'));
                    if (pluginJson && typeof pluginJson === 'object') {
                        desc = pluginJson.description;
                    }
                    if (!desc)
                        desc = await extractReadmeDescription(pluginPath);
                    available.push({
                        name: entry,
                        marketplace: mpName,
                        description: desc,
                        installed: isInstalled,
                        installedVersion: installedPlugin?.version,
                        external: true,
                    });
                }
            }
            catch { /* external_plugins dir not readable */ }
            // Also handle single-plugin repos: if the marketplace root itself has .claude-plugin/plugin.json,
            // treat the whole repo as one installable plugin (e.g. obra/superpowers)
            try {
                const rootPluginJson = await readJsonOrNull(join(installLocation, '.claude-plugin', 'plugin.json'));
                if (rootPluginJson && typeof rootPluginJson === 'object') {
                    const pj = rootPluginJson;
                    const pluginName = pj.name || mpName;
                    const isInstalled = installedNames.has(`${pluginName}@${mpName}`);
                    const installedPlugin = plugins.find(p => p.name === pluginName && p.marketplace === mpName);
                    const desc = pj.description || await extractReadmeDescription(installLocation);
                    const pluginJsonVersion = pj.version;
                    const latestVersion = pluginJsonVersion || marketplaceHeadSha;
                    if (latestVersion)
                        latestVersionMap.set(`${pluginName}@${mpName}`, latestVersion);
                    available.push({
                        name: pluginName,
                        marketplace: mpName,
                        description: desc,
                        installed: isInstalled,
                        installedVersion: installedPlugin?.version,
                    });
                }
            }
            catch { /* no root plugin.json */ }
        }
    }
    // Backfill latestVersion + updateAvailable into each installed PluginEntry
    for (const plugin of plugins) {
        const key = `${plugin.name}@${plugin.marketplace}`;
        const latest = latestVersionMap.get(key);
        if (latest) {
            plugin.latestVersion = latest;
            // Determine the installed reference to compare against
            const installedRef = plugin.gitSha || plugin.version;
            // Only flag update available if both sides use the same versioning scheme.
            // A semver-versioned plugin (e.g. "1.0.0") must not be compared against a
            // marketplace SHA (40-char hex) — that comparison always mismatch-falsely.
            const isSemver = (v) => /^\d+\.\d+/.test(v);
            const isSha = (v) => /^[0-9a-f]{7,40}$/.test(v);
            const mixedScheme = (isSemver(installedRef) && isSha(latest)) ||
                (isSha(installedRef) && isSemver(latest));
            if (mixedScheme) {
                // Can't reliably compare — don't flag as outdated
                plugin.updateAvailable = false;
            }
            else {
                plugin.updateAvailable = !latest.startsWith(installedRef) && !installedRef.startsWith(latest);
            }
        }
    }
    return { plugins, marketplaces, available };
}
