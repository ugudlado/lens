import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import matter from 'gray-matter';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
import { ConfigScope, EntrySource } from '@lens/schema';
export async function scanSkills(projectPath, pluginPaths = []) {
    const skills = [];
    await discoverSkills(join(projectPath, '.claude', 'skills'), ConfigScope.Project, EntrySource.Project);
    await discoverSkills(join(GLOBAL_DIR, 'skills'), ConfigScope.Global, EntrySource.Global);
    for (const plugin of pluginPaths) {
        await discoverSkills(join(plugin.installPath, 'skills'), ConfigScope.Global, EntrySource.Plugin, plugin.name);
    }
    return { skills };
    async function discoverSkills(dir, scope, source, pluginName) {
        try {
            const entries = await readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const skillFile = join(dir, entry.name, 'SKILL.md');
                const content = await readFileOrNull(skillFile);
                if (!content)
                    continue;
                const { data } = matter(content);
                skills.push({
                    name: data.name || entry.name,
                    description: data.description || '',
                    scope,
                    filePath: skillFile,
                    source,
                    pluginName,
                    userInvocable: data['user-invocable'] !== false,
                    allowedTools: data['allowed-tools']
                        ? String(data['allowed-tools']).split(',').map((s) => s.trim())
                        : undefined,
                    model: data.model,
                    hasHooks: !!data.hooks,
                });
            }
        }
        catch { /* directory doesn't exist */ }
    }
}
