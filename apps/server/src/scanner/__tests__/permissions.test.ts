import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope, PermissionType } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-permissions-test-'));
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

async function getScanPermissions() {
  const { scanPermissions } = await import('../permissions.js');
  return scanPermissions;
}

describe('scanPermissions', () => {
  it('returns empty result for empty project directory', async () => {
    const scanPermissions = await getScanPermissions();
    const result = await scanPermissions(projectDir);
    expect(result).toEqual({ rules: [], defaultMode: null });
  });

  it('reads permissions.allow array from project settings', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await writeFile(
      settingsPath,
      JSON.stringify({ permissions: { allow: ['Bash', 'Read'] } }),
    );
    const scanPermissions = await getScanPermissions();
    const result = await scanPermissions(projectDir);
    expect(result.rules).toHaveLength(2);
    expect(result.rules[0]).toEqual({
      rule: 'Bash',
      type: PermissionType.Allow,
      scope: ConfigScope.Project,
      filePath: settingsPath,
    });
    expect(result.rules[1]).toEqual({
      rule: 'Read',
      type: PermissionType.Allow,
      scope: ConfigScope.Project,
      filePath: settingsPath,
    });
  });

  it('reads permissions.deny array from project settings', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await writeFile(
      settingsPath,
      JSON.stringify({ permissions: { deny: ['Write(/etc)'] } }),
    );
    const scanPermissions = await getScanPermissions();
    const result = await scanPermissions(projectDir);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]).toEqual({
      rule: 'Write(/etc)',
      type: PermissionType.Deny,
      scope: ConfigScope.Project,
      filePath: settingsPath,
    });
  });

  it('reads permissions.defaultMode from project settings', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await writeFile(
      settingsPath,
      JSON.stringify({ permissions: { defaultMode: 'bypassPermissions' } }),
    );
    const scanPermissions = await getScanPermissions();
    const result = await scanPermissions(projectDir);
    expect(result.defaultMode).toEqual({
      value: 'bypassPermissions',
      scope: ConfigScope.Project,
      filePath: settingsPath,
      editable: true,
    });
  });
});
