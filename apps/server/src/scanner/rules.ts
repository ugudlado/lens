import { join } from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
import { ConfigScope } from '@lens/schema';
import type { RulesSurface, RuleEntry } from '@lens/schema';

export async function scanRules(projectPath: string): Promise<RulesSurface> {
  const rules: RuleEntry[] = [];
  await discoverRules(join(projectPath, '.claude', 'rules'), ConfigScope.Project);
  await discoverRules(join(GLOBAL_DIR, 'rules'), ConfigScope.Global);
  return { rules };

  async function discoverRules(dir: string, scope: ConfigScope) {
    try {
      const files = await glob('**/*.{md,mdc}', { cwd: dir, absolute: true });
      for (const filePath of files) {
        const content = await readFileOrNull(filePath);
        if (!content) continue;
        const { data, content: body } = matter(content);
        const name = filePath.split('/').pop()?.replace(/\.mdc?$/, '') || 'unknown';
        rules.push({
          name, scope, filePath,
          paths: data.paths as string[] | undefined,
          content: body.trim(),
          lineCount: content.split('\n').length,
        });
      }
    } catch { /* directory doesn't exist */ }
  }
}
