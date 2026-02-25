import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-settings-test-'));
  globalDir = join(tmpDir, 'global-claude');
  projectDir = join(tmpDir, 'project');
  await mkdir(join(globalDir), { recursive: true });
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanSettings() {
  const { scanSettings } = await import('../settings.js');
  return scanSettings;
}

describe('scanSettings', () => {
  it('returns empty result for empty project directory', async () => {
    const scanSettings = await getScanSettings();
    const result = await scanSettings(projectDir);
    expect(result).toEqual({ files: [], effective: {} });
  });

  it('reads a key from project settings.json', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await writeFile(settingsPath, JSON.stringify({ theme: 'dark' }));
    const scanSettings = await getScanSettings();
    const result = await scanSettings(projectDir);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].scope).toBe(ConfigScope.Project);
    expect(result.files[0].filePath).toBe(settingsPath);
    expect(result.effective['theme']).toEqual({
      value: 'dark',
      scope: ConfigScope.Project,
      filePath: settingsPath,
      editable: true,
    });
  });

  it('excludes permissions, hooks, and sandbox keys from effective', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await writeFile(
      settingsPath,
      JSON.stringify({
        theme: 'light',
        permissions: { allow: ['Bash'] },
        hooks: { PreToolUse: [] },
        sandbox: { enabled: true },
      }),
    );
    const scanSettings = await getScanSettings();
    const result = await scanSettings(projectDir);
    expect(result.effective['theme']).toBeDefined();
    expect(result.effective['permissions']).toBeUndefined();
    expect(result.effective['hooks']).toBeUndefined();
    expect(result.effective['sandbox']).toBeUndefined();
  });

  it('local settings override project settings in effective', async () => {
    const projectSettingsPath = join(projectDir, '.claude', 'settings.json');
    const localSettingsPath = join(projectDir, '.claude', 'settings.local.json');
    await writeFile(projectSettingsPath, JSON.stringify({ theme: 'dark' }));
    await writeFile(localSettingsPath, JSON.stringify({ theme: 'light' }));
    const scanSettings = await getScanSettings();
    const result = await scanSettings(projectDir);
    expect(result.files).toHaveLength(2);
    const localFile = result.files.find(f => f.scope === ConfigScope.Local);
    expect(localFile).toBeDefined();
    expect(localFile!.filePath).toBe(localSettingsPath);
    expect(result.effective['theme']).toEqual({
      value: 'light',
      scope: ConfigScope.Local,
      filePath: localSettingsPath,
      editable: true,
    });
  });
});
