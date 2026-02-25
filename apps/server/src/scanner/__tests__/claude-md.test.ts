import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-claude-md-test-'));
  globalDir = join(tmpDir, 'global-claude');
  projectDir = join(tmpDir, 'project');
  await mkdir(globalDir, { recursive: true });
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanClaudeMd() {
  const { scanClaudeMd } = await import('../claude-md.js');
  return scanClaudeMd;
}

describe('scanClaudeMd', () => {
  it('returns empty result for empty project directory', async () => {
    const scanClaudeMd = await getScanClaudeMd();
    const result = await scanClaudeMd(projectDir);
    expect(result).toEqual({ files: [], loadOrder: [] });
  });

  it('detects global CLAUDE.md with scope=Global', async () => {
    const content = '# Global Instructions\nLine two\nLine three';
    await writeFile(join(globalDir, 'CLAUDE.md'), content);
    const scanClaudeMd = await getScanClaudeMd();
    const result = await scanClaudeMd(projectDir);
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.scope).toBe(ConfigScope.Global);
    expect(file.filePath).toBe(join(globalDir, 'CLAUDE.md'));
    expect(file.content).toBe(content);
    expect(file.lineCount).toBe(3);
    expect(file.isLocal).toBe(false);
  });

  it('detects project root CLAUDE.md with scope=Project and isLocal=false', async () => {
    const content = '# Project Instructions\nSecond line';
    await writeFile(join(projectDir, 'CLAUDE.md'), content);
    const scanClaudeMd = await getScanClaudeMd();
    const result = await scanClaudeMd(projectDir);
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.scope).toBe(ConfigScope.Project);
    expect(file.filePath).toBe(join(projectDir, 'CLAUDE.md'));
    expect(file.isLocal).toBe(false);
  });

  it('detects CLAUDE.local.md with scope=Local and isLocal=true', async () => {
    const content = '# Local Overrides';
    await writeFile(join(projectDir, 'CLAUDE.local.md'), content);
    const scanClaudeMd = await getScanClaudeMd();
    const result = await scanClaudeMd(projectDir);
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.scope).toBe(ConfigScope.Local);
    expect(file.filePath).toBe(join(projectDir, 'CLAUDE.local.md'));
    expect(file.isLocal).toBe(true);
  });

  it('lists multiple files in loadOrder in discovery order (global before project before local)', async () => {
    await writeFile(join(globalDir, 'CLAUDE.md'), '# Global');
    await writeFile(join(projectDir, 'CLAUDE.md'), '# Project');
    await writeFile(join(projectDir, 'CLAUDE.local.md'), '# Local');
    const scanClaudeMd = await getScanClaudeMd();
    const result = await scanClaudeMd(projectDir);
    expect(result.files).toHaveLength(3);
    expect(result.loadOrder).toHaveLength(3);
    expect(result.loadOrder[0]).toBe(join(globalDir, 'CLAUDE.md'));
    expect(result.loadOrder[1]).toBe(join(projectDir, 'CLAUDE.md'));
    expect(result.loadOrder[2]).toBe(join(projectDir, 'CLAUDE.local.md'));
  });
});
