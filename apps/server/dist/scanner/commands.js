import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
import { ConfigScope, EntrySource } from '@lens/schema';
export async function scanCommands(projectPath, skills, pluginPaths = []) {
    const commands = [];
    const skillNames = new Set(skills.skills.map((s) => s.name));
    await discoverCommands(join(projectPath, '.claude', 'commands'), ConfigScope.Project, EntrySource.Project);
    await discoverCommands(join(GLOBAL_DIR, 'commands'), ConfigScope.Global, EntrySource.Global);
    for (const plugin of pluginPaths) {
        await discoverCommands(join(plugin.installPath, 'commands'), ConfigScope.Global, EntrySource.Plugin, plugin.name);
    }
    return { commands };
    async function discoverCommands(dir, scope, source, pluginName) {
        try {
            const entries = await readdir(dir);
            for (const file of entries) {
                if (!file.endsWith('.md'))
                    continue;
                const filePath = join(dir, file);
                const content = await readFileOrNull(filePath);
                if (!content)
                    continue;
                const name = file.replace('.md', '');
                commands.push({ name, scope, filePath, source, pluginName, content, supersededBySkill: skillNames.has(name) });
            }
        }
        catch { /* directory doesn't exist */ }
    }
}
