import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginScope } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-plugins-test-'));
  globalDir = join(tmpDir, 'global-claude');
  projectDir = join(tmpDir, 'project');
  await mkdir(join(globalDir, 'plugins'), { recursive: true });
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanPlugins() {
  const { scanPlugins } = await import('../plugins.js');
  return scanPlugins;
}

describe('scanPlugins', () => {
  it('returns empty result when no plugins are installed', async () => {
    const scanPlugins = await getScanPlugins();
    const result = await scanPlugins(projectDir);
    expect(result).toEqual({ plugins: [], marketplaces: [], available: [] });
  });
});
