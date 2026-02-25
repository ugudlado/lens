import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope, EntrySource } from '@lens/schema';

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'lens-skills-test-'));
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

async function getScanSkills() {
  const { scanSkills } = await import('../skills.js');
  return scanSkills;
}

describe('scanSkills', () => {
  it('returns empty result for empty project directory', async () => {
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir);
    expect(result).toEqual({ skills: [] });
  });

  it('reads a project skill with SKILL.md frontmatter', async () => {
    const skillDir = join(projectDir, '.claude', 'skills', 'my-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---\nname: My Skill\ndescription: Does something useful\n---\nSkill content here.`,
    );
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir);
    expect(result.skills).toHaveLength(1);
    const skill = result.skills[0];
    expect(skill.name).toBe('My Skill');
    expect(skill.description).toBe('Does something useful');
    expect(skill.scope).toBe(ConfigScope.Project);
    expect(skill.source).toBe(EntrySource.Project);
    expect(skill.userInvocable).toBe(true);
  });

  it('falls back to directory name when frontmatter has no name', async () => {
    const skillDir = join(projectDir, '.claude', 'skills', 'fallback-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), `---\ndescription: No name in frontmatter\n---\nContent.`);
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('fallback-skill');
  });

  it('reads a global skill from GLOBAL_DIR/skills/', async () => {
    const skillDir = join(globalDir, 'skills', 'global-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---\nname: Global Skill\ndescription: A global skill\n---\nGlobal skill content.`,
    );
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir);
    expect(result.skills).toHaveLength(1);
    const skill = result.skills[0];
    expect(skill.name).toBe('Global Skill');
    expect(skill.scope).toBe(ConfigScope.Global);
    expect(skill.source).toBe(EntrySource.Global);
  });

  it('reads a plugin skill with source=Plugin and pluginName set', async () => {
    const pluginInstallPath = join(tmpDir, 'my-plugin');
    const skillDir = join(pluginInstallPath, 'skills', 'plugin-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---\nname: Plugin Skill\ndescription: Provided by plugin\n---\nPlugin skill content.`,
    );
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir, [{ name: 'my-plugin', installPath: pluginInstallPath }]);
    expect(result.skills).toHaveLength(1);
    const skill = result.skills[0];
    expect(skill.name).toBe('Plugin Skill');
    expect(skill.scope).toBe(ConfigScope.Global);
    expect(skill.source).toBe(EntrySource.Plugin);
    expect(skill.pluginName).toBe('my-plugin');
  });

  it('sets userInvocable to false when user-invocable is false in frontmatter', async () => {
    const skillDir = join(projectDir, '.claude', 'skills', 'internal-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---\nname: Internal Skill\nuser-invocable: false\n---\nNot user invocable.`,
    );
    const scanSkills = await getScanSkills();
    const result = await scanSkills(projectDir);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].userInvocable).toBe(false);
  });
});
