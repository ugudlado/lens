import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HookEvent, HookType, HookSource, ConfigScope } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-hooks-test-'));
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

async function getScanHooks() {
  const { scanHooks } = await import('../hooks.js');
  return scanHooks;
}

describe('scanHooks', () => {
  it('returns empty result for empty project directory', async () => {
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir);
    expect(result).toEqual({ hooks: [], disableAllHooks: false });
  });

  it('reads disableAllHooks flag from project settings', async () => {
    await writeFile(
      join(projectDir, '.claude', 'settings.json'),
      JSON.stringify({ disableAllHooks: true }),
    );
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir);
    expect(result.disableAllHooks).toBe(true);
    expect(result.hooks).toEqual([]);
  });

  it('parses hooks from project settings.json', async () => {
    const config = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo hello', timeout: 5000 }],
          },
        ],
      },
    };
    await writeFile(
      join(projectDir, '.claude', 'settings.json'),
      JSON.stringify(config),
    );
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir);
    expect(result.hooks).toHaveLength(1);
    const hook = result.hooks[0];
    expect(hook.event).toBe(HookEvent.PreToolUse);
    expect(hook.matcher).toBe('Bash');
    expect(hook.type).toBe(HookType.Command);
    expect(hook.command).toBe('echo hello');
    expect(hook.timeout).toBe(5000);
    expect(hook.scope).toBe(ConfigScope.Project);
    expect(hook.source).toBe(HookSource.Settings);
  });

  it('excludes hookify rule with enabled: false', async () => {
    const content = `---\nenabled: false\nevent: PreToolUse\npattern: Bash\naction: block\n---\nBlock bash commands.`;
    await writeFile(join(globalDir, 'hookify.block-bash.local.md'), content);
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir);
    expect(result.hooks).toHaveLength(0);
  });

  it('includes hookify rule with enabled: true', async () => {
    const content = `---\nenabled: true\nevent: PreToolUse\npattern: Bash\naction: block\n---\nBlock bash commands.`;
    await writeFile(join(globalDir, 'hookify.block-bash.local.md'), content);
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir);
    expect(result.hooks).toHaveLength(1);
    const hook = result.hooks[0];
    expect(hook.event).toBe(HookEvent.PreToolUse);
    expect(hook.matcher).toBe('Bash');
    expect(hook.command).toBe('hookify: block');
    expect(hook.type).toBe(HookType.Command);
    expect(hook.source).toBe(HookSource.Hookify);
    expect(hook.scope).toBe(ConfigScope.Global);
  });

  it('substitutes ${CLAUDE_PLUGIN_ROOT} in plugin hook commands', async () => {
    const pluginInstallPath = join(tmpDir, 'my-plugin');
    await mkdir(join(pluginInstallPath, 'hooks'), { recursive: true });
    const hooksJson = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [
              {
                type: 'command',
                command: '${CLAUDE_PLUGIN_ROOT}/bin/run.sh',
              },
            ],
          },
        ],
      },
    };
    await writeFile(
      join(pluginInstallPath, 'hooks', 'hooks.json'),
      JSON.stringify(hooksJson),
    );
    const scanHooks = await getScanHooks();
    const result = await scanHooks(projectDir, [
      { name: 'my-plugin', installPath: pluginInstallPath },
    ]);
    expect(result.hooks).toHaveLength(1);
    const hook = result.hooks[0];
    expect(hook.command).toBe(`${pluginInstallPath}/bin/run.sh`);
    expect(hook.matcher).toBe('Write');
    expect(hook.source).toBe(HookSource.Plugin);
    expect(hook.pluginName).toBe('my-plugin');
    expect(hook.event).toBe(HookEvent.PostToolUse);
  });
});
