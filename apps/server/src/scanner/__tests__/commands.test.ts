import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigScope, EntrySource } from "@lens/schema";
import type { SkillsSurface } from "@lens/schema";

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "lens-commands-test-"));
  globalDir = join(tmpDir, "global-claude");
  projectDir = join(tmpDir, "project");
  await mkdir(globalDir, { recursive: true });
  await mkdir(join(projectDir, ".claude"), { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanCommands() {
  const { scanCommands } = await import("../commands.js");
  return scanCommands;
}

const emptySkills: SkillsSurface = { skills: [] };

describe("scanCommands", () => {
  it("returns empty result for empty project directory", async () => {
    const scanCommands = await getScanCommands();
    const result = await scanCommands(projectDir, emptySkills);
    expect(result).toEqual({ commands: [] });
  });

  it("reads a project command .md file", async () => {
    const commandsDir = join(projectDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(
      join(commandsDir, "my-command.md"),
      `# My Command\n\nThis is the command content.`,
    );
    const scanCommands = await getScanCommands();
    const result = await scanCommands(projectDir, emptySkills);
    expect(result.commands).toHaveLength(1);
    const command = result.commands[0];
    expect(command.name).toBe("my-command");
    expect(command.scope).toBe(ConfigScope.Project);
    expect(command.source).toBe(EntrySource.Project);
    expect(command.content).toBe(
      "# My Command\n\nThis is the command content.",
    );
    expect(command.supersededBySkill).toBe(false);
  });

  it("marks command as supersededBySkill when a skill has the same name", async () => {
    const commandsDir = join(projectDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(join(commandsDir, "my-command.md"), `Command content.`);
    const skills: SkillsSurface = {
      skills: [
        {
          name: "my-command",
          description: "",
          scope: ConfigScope.Project,
          filePath: "",
          source: EntrySource.Project,
          userInvocable: true,
          hasHooks: false,
        },
      ],
    };
    const scanCommands = await getScanCommands();
    const result = await scanCommands(projectDir, skills);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].supersededBySkill).toBe(true);
  });

  it("does not mark command as supersededBySkill when skill name differs", async () => {
    const commandsDir = join(projectDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(
      join(commandsDir, "other-command.md"),
      `Other command content.`,
    );
    const skills: SkillsSurface = {
      skills: [
        {
          name: "my-command",
          description: "",
          scope: ConfigScope.Project,
          filePath: "",
          source: EntrySource.Project,
          userInvocable: true,
          hasHooks: false,
        },
      ],
    };
    const scanCommands = await getScanCommands();
    const result = await scanCommands(projectDir, skills);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].supersededBySkill).toBe(false);
  });
});
