import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { readJsonOrNull, readFileOrNull, GLOBAL_DIR, settingsLocations } from './utils.js';
import type { PluginPath } from './utils.js';
import { ConfigScope, HookEvent, HookType, HookSource } from '@lens/schema';
import type { HooksSurface, HookEntry } from '@lens/schema';

export async function scanHooks(
  projectPath: string,
  pluginPaths: PluginPath[] = [],
): Promise<HooksSurface> {
  const hooks: HookEntry[] = [];
  let disableAllHooks = false;

  for (const { path, scope } of settingsLocations(projectPath)) {
    const raw = await readJsonOrNull(path);
    if (!raw) continue;
    if (raw.disableAllHooks === true) disableAllHooks = true;
    const hooksConfig = raw.hooks as Record<string, unknown[]> | undefined;
    if (!hooksConfig) continue;
    for (const [event, matchers] of Object.entries(hooksConfig)) {
      if (!Array.isArray(matchers)) continue;
      for (const matcherGroup of matchers) {
        const mg = matcherGroup as Record<string, unknown>;
        const hookList = mg.hooks as Record<string, unknown>[] | undefined;
        if (!Array.isArray(hookList)) continue;
        for (const hook of hookList) {
          hooks.push({
            event: event as HookEvent,
            matcher: mg.matcher as string | undefined,
            type: (hook.type as HookType) || HookType.Command,
            command: hook.command as string | undefined,
            prompt: hook.prompt as string | undefined,
            timeout: hook.timeout as number | undefined,
            scope,
            filePath: path,
            source: HookSource.Settings,
          });
        }
      }
    }
  }

  // Scan hookify files
  try {
    const globalFiles = await readdir(GLOBAL_DIR);
    for (const file of globalFiles) {
      if (file.startsWith('hookify.') && file.endsWith('.local.md')) {
        const content = await readFileOrNull(join(GLOBAL_DIR, file));
        if (!content) continue;
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) continue;
        const fm: Record<string, string> = {};
        for (const line of frontmatterMatch[1].split('\n')) {
          const [key, ...rest] = line.split(':');
          if (key && rest.length) fm[key.trim()] = rest.join(':').trim();
        }
        if (fm.enabled === 'false') continue;
        hooks.push({
          event: (fm.event as HookEvent) || HookEvent.PreToolUse,
          matcher: fm.pattern,
          type: HookType.Command,
          command: `hookify: ${fm.action || 'block'}`,
          scope: ConfigScope.Global,
          filePath: join(GLOBAL_DIR, file),
          source: HookSource.Hookify,
        });
      }
    }
  } catch { /* no hookify files */ }

  // Scan plugin hooks
  for (const plugin of pluginPaths) {
    const hooksJsonPath = join(plugin.installPath, 'hooks', 'hooks.json');
    const raw = await readJsonOrNull(hooksJsonPath);
    if (!raw) continue;
    const hooksConfig = (raw as Record<string, unknown>).hooks as Record<string, unknown[]> | undefined;
    if (!hooksConfig) continue;
    for (const [event, matchers] of Object.entries(hooksConfig)) {
      if (!Array.isArray(matchers)) continue;
      for (const matcherGroup of matchers) {
        const mg = matcherGroup as Record<string, unknown>;
        const hookList = mg.hooks as Record<string, unknown>[] | undefined;
        if (!Array.isArray(hookList)) continue;
        for (const hook of hookList) {
          const command = hook.command as string | undefined;
          hooks.push({
            event: event as HookEvent,
            matcher: mg.matcher as string | undefined,
            type: (hook.type as HookType) || HookType.Command,
            command: command
              ? command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, plugin.installPath)
              : undefined,
            prompt: hook.prompt as string | undefined,
            timeout: hook.timeout as number | undefined,
            scope: ConfigScope.Global,
            filePath: hooksJsonPath,
            source: HookSource.Plugin,
            pluginName: plugin.name,
          });
        }
      }
    }
  }

  return { hooks, disableAllHooks };
}
