import { Hono } from 'hono';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { PluginAction } from '@lens/schema';
import { detectProjectRoot } from '../scanner/utils.js';
/** Spawn `claude` without inheriting Claude Code's sandbox file descriptors (avoids EBADF). */
function spawnClaude(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn('claude', args, {
            env: { ...process.env, CLAUDECODE: '' },
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, 30000);
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0)
                resolve({ stdout, stderr });
            else
                reject(Object.assign(new Error(`claude exited with code ${code}`), { stdout, stderr }));
        });
        child.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
}
/** Read JSON, update enabledPlugins, write back. */
async function setPluginEnabled(settingsPath, pluginKey, enabled) {
    await mkdir(dirname(settingsPath), { recursive: true });
    let content;
    try {
        content = await readFile(settingsPath, 'utf-8');
    }
    catch {
        content = '{}';
    }
    const json = JSON.parse(content);
    if (!json.enabledPlugins)
        json.enabledPlugins = {};
    json.enabledPlugins[pluginKey] = enabled;
    await writeFile(settingsPath, JSON.stringify(json, null, 2) + '\n');
}
/** Toggle plugin in global settings, and sync project settings if they have an override. */
async function togglePlugin(pluginKey, enabled, projectPath) {
    const globalPath = join(homedir(), '.claude', 'settings.json');
    const projectSettingsPath = join(projectPath, '.claude', 'settings.json');
    // Always update global
    await setPluginEnabled(globalPath, pluginKey, enabled);
    // If project settings has an enabledPlugins entry for this plugin, sync it too
    try {
        const projContent = await readFile(projectSettingsPath, 'utf-8');
        const projJson = JSON.parse(projContent);
        if (projJson.enabledPlugins && pluginKey in projJson.enabledPlugins) {
            projJson.enabledPlugins[pluginKey] = enabled;
            await writeFile(projectSettingsPath, JSON.stringify(projJson, null, 2) + '\n');
        }
    }
    catch {
        // No project settings or not parseable — only global updated, which is fine
    }
}
const app = new Hono();
app.post('/', async (c) => {
    const body = await c.req.json();
    const { action, plugin, scope } = body;
    if (!action || !plugin) {
        return c.json({ success: false, error: 'Missing action or plugin' }, 400);
    }
    const validActions = [PluginAction.Enable, PluginAction.Disable, PluginAction.Install, PluginAction.Uninstall, PluginAction.Update, PluginAction.MarketplaceAdd, PluginAction.MarketplaceRemove];
    if (!validActions.includes(action)) {
        return c.json({ success: false, error: `Invalid action: ${action}` }, 400);
    }
    // For enable/disable, write directly to the settings file to respect scope layering
    if (action === PluginAction.Enable || action === PluginAction.Disable) {
        try {
            const projectPath = detectProjectRoot();
            await togglePlugin(plugin, action === PluginAction.Enable, projectPath);
            return c.json({ success: true, output: `Plugin ${action}d successfully` });
        }
        catch (err) {
            return c.json({
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            }, 500);
        }
    }
    // For marketplace add/remove, delegate to `claude plugin marketplace <subcommand> <source>`
    if (action === PluginAction.MarketplaceAdd || action === PluginAction.MarketplaceRemove) {
        try {
            const subcommand = action === PluginAction.MarketplaceAdd ? 'add' : 'remove';
            const { stdout, stderr } = await spawnClaude(['plugin', 'marketplace', subcommand, plugin], detectProjectRoot());
            const output = (stdout + stderr).trim();
            return c.json({ success: true, output });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            const execErr = err;
            const output = ((execErr.stdout || '') + (execErr.stderr || '')).trim();
            return c.json({ success: false, error: msg, output: output || undefined }, 500);
        }
    }
    // For install/uninstall, use execFile (safe from shell injection)
    try {
        const args = ['plugin', action, plugin];
        if (scope) {
            args.push('--scope', scope);
        }
        const { stdout, stderr } = await spawnClaude(args, detectProjectRoot());
        const output = (stdout + stderr).trim();
        return c.json({ success: true, output });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        const execErr = err;
        const output = ((execErr.stdout || '') + (execErr.stderr || '')).trim();
        return c.json({
            success: false,
            error: msg,
            output: output || undefined,
        }, 500);
    }
});
export default app;
