import { join } from 'node:path';
import { readFileOrNull, GLOBAL_DIR, MANAGED_DIR } from './utils.js';
import { ConfigScope } from '@lens/schema';
import type { ClaudeMdHierarchy, ClaudeMdFile } from '@lens/schema';

export async function scanClaudeMd(projectPath: string): Promise<ClaudeMdHierarchy> {
  const files: ClaudeMdFile[] = [];
  const loadOrder: string[] = [];

  const managedPath = join(MANAGED_DIR, 'CLAUDE.md');
  await tryAdd(managedPath, ConfigScope.Managed, false);

  const globalPath = join(GLOBAL_DIR, 'CLAUDE.md');
  await tryAdd(globalPath, ConfigScope.Global, false);

  const projectRoot = join(projectPath, 'CLAUDE.md');
  await tryAdd(projectRoot, ConfigScope.Project, false);

  const projectDotClaude = join(projectPath, '.claude', 'CLAUDE.md');
  await tryAdd(projectDotClaude, ConfigScope.Project, false);

  const localRoot = join(projectPath, 'CLAUDE.local.md');
  await tryAdd(localRoot, ConfigScope.Local, true);

  return { files, loadOrder };

  async function tryAdd(filePath: string, scope: ConfigScope, isLocal: boolean) {
    const content = await readFileOrNull(filePath);
    if (content !== null) {
      files.push({ scope, filePath, content, isLocal, lineCount: content.split('\n').length });
      loadOrder.push(filePath);
    }
  }
}
