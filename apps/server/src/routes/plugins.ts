import { Hono } from 'hono';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { PluginAction } from '@lens/schema';
import type { PluginActionRequest, PluginActionResponse } from '@lens/schema';
import { detectProjectRoot } from '../scanner/utils.js';

const execFileAsync = promisify(execFile);

/** Read JSON, update enabledPlugins, write back. */
async function setPluginEnabled(settingsPath: string, pluginKey: string, enabled: boolean): Promise<void> {
  await mkdir(dirname(settingsPath), { recursive: true });
  let content: string;
  try { content = await readFile(settingsPath, 'utf-8'); } catch { content = '{}'; }
  const json = JSON.parse(content);
  if (!json.enabledPlugins) json.enabledPlugins = {};
  json.enabledPlugins[pluginKey] = enabled;
  await writeFile(settingsPath, JSON.stringify(json, null, 2) + '\n');
}

/** Toggle plugin in global settings, and sync project settings if they have an override. */
async function togglePlugin(pluginKey: string, enabled: boolean, projectPath: string): Promise<void> {
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
  } catch {
    // No project settings or not parseable — only global updated, which is fine
  }
}

const app = new Hono();

app.post('/', async (c) => {
  const body = await c.req.json<PluginActionRequest>();
  const { action, plugin, scope } = body;

  if (!action || !plugin) {
    return c.json<PluginActionResponse>({ success: false, error: 'Missing action or plugin' }, 400);
  }

  const validActions = [PluginAction.Enable, PluginAction.Disable, PluginAction.Install, PluginAction.Uninstall, PluginAction.Update, PluginAction.MarketplaceAdd, PluginAction.MarketplaceRemove];
  if (!validActions.includes(action)) {
    return c.json<PluginActionResponse>({ success: false, error: `Invalid action: ${action}` }, 400);
  }

  // For enable/disable, write directly to the settings file to respect scope layering
  if (action === PluginAction.Enable || action === PluginAction.Disable) {
    try {
      const projectPath = detectProjectRoot();
      await togglePlugin(plugin, action === PluginAction.Enable, projectPath);
      return c.json<PluginActionResponse>({ success: true, output: `Plugin ${action}d successfully` });
    } catch (err) {
      return c.json<PluginActionResponse>({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }, 500);
    }
  }

  // For marketplace add/remove, delegate to `claude plugin marketplace <subcommand> <source>`
  if (action === PluginAction.MarketplaceAdd || action === PluginAction.MarketplaceRemove) {
    try {
      const subcommand = action === PluginAction.MarketplaceAdd ? 'add' : 'remove';
      const { stdout, stderr } = await execFileAsync('claude', ['plugin', 'marketplace', subcommand, plugin], {
        env: { ...process.env, CLAUDECODE: '' },
        cwd: detectProjectRoot(),
        timeout: 30000,
      });
      const output = (stdout + stderr).trim();
      return c.json<PluginActionResponse>({ success: true, output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const execErr = err as { stdout?: string; stderr?: string };
      const output = ((execErr.stdout || '') + (execErr.stderr || '')).trim();
      return c.json<PluginActionResponse>({ success: false, error: msg, output: output || undefined }, 500);
    }
  }

  // For install/uninstall, use execFile (safe from shell injection)
  try {
    const args = ['plugin', action, plugin];
    if (scope) {
      args.push('--scope', scope);
    }

    const { stdout, stderr } = await execFileAsync('claude', args, {
      env: { ...process.env, CLAUDECODE: '' },
      cwd: detectProjectRoot(),
      timeout: 30000,
    });

    const output = (stdout + stderr).trim();
    return c.json<PluginActionResponse>({ success: true, output });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const execErr = err as { stdout?: string; stderr?: string };
    const output = ((execErr.stdout || '') + (execErr.stderr || '')).trim();
    return c.json<PluginActionResponse>({
      success: false,
      error: msg,
      output: output || undefined,
    }, 500);
  }
});

export default app;
