import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import matter from 'gray-matter';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
import { ConfigScope, EntrySource } from '@lens/schema';
export async function scanAgents(projectPath, pluginPaths = []) {
    const agents = [];
    await discoverAgents(join(projectPath, '.claude', 'agents'), ConfigScope.Project, EntrySource.Project);
    await discoverAgents(join(GLOBAL_DIR, 'agents'), ConfigScope.Global, EntrySource.Global);
    for (const plugin of pluginPaths) {
        await discoverAgents(join(plugin.installPath, 'agents'), ConfigScope.Global, EntrySource.Plugin, plugin.name);
    }
    return { agents };
    async function discoverAgents(dir, scope, source, pluginName) {
        try {
            const entries = await readdir(dir);
            for (const file of entries) {
                if (!file.endsWith('.md'))
                    continue;
                const filePath = join(dir, file);
                const content = await readFileOrNull(filePath);
                if (!content)
                    continue;
                const { data } = matter(content);
                agents.push({
                    name: data.name || file.replace('.md', ''),
                    description: data.description || '',
                    scope,
                    filePath,
                    source,
                    pluginName,
                    model: data.model,
                    tools: data.tools ? String(data.tools).split(',').map((s) => s.trim()) : undefined,
                    disallowedTools: data.disallowedTools ? String(data.disallowedTools).split(',').map((s) => s.trim()) : undefined,
                    permissionMode: data.permissionMode,
                    memory: data.memory,
                });
            }
        }
        catch { /* directory doesn't exist */ }
    }
}
