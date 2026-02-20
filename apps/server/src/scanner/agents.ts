import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import matter from 'gray-matter';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
import type { PluginPath } from './utils.js';
import { ConfigScope, EntrySource, AgentMemory } from '@lens/schema';
import type { AgentsSurface, AgentEntry } from '@lens/schema';

export async function scanAgents(
  projectPath: string,
  pluginPaths: PluginPath[] = [],
): Promise<AgentsSurface> {
  const agents: AgentEntry[] = [];
  await discoverAgents(join(projectPath, '.claude', 'agents'), ConfigScope.Project, EntrySource.Project);
  await discoverAgents(join(GLOBAL_DIR, 'agents'), ConfigScope.Global, EntrySource.Global);

  for (const plugin of pluginPaths) {
    await discoverAgents(join(plugin.installPath, 'agents'), ConfigScope.Global, EntrySource.Plugin, plugin.name);
  }

  return { agents };

  async function discoverAgents(
    dir: string,
    scope: ConfigScope,
    source: EntrySource,
    pluginName?: string,
  ) {
    try {
      const entries = await readdir(dir);
      for (const file of entries) {
        if (!file.endsWith('.md')) continue;
        const filePath = join(dir, file);
        const content = await readFileOrNull(filePath);
        if (!content) continue;
        const { data } = matter(content);
        agents.push({
          name: (data.name as string) || file.replace('.md', ''),
          description: (data.description as string) || '',
          scope,
          filePath,
          source,
          pluginName,
          model: data.model as string | undefined,
          tools: data.tools ? String(data.tools).split(',').map((s: string) => s.trim()) : undefined,
          disallowedTools: data.disallowedTools ? String(data.disallowedTools).split(',').map((s: string) => s.trim()) : undefined,
          permissionMode: data.permissionMode as string | undefined,
          memory: data.memory as AgentMemory | undefined,
        });
      }
    } catch { /* directory doesn't exist */ }
  }
}
