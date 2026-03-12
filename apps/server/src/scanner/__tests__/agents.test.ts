import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigScope, EntrySource } from "@lens/schema";

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "lens-agents-test-"));
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

async function getScanAgents() {
  const { scanAgents } = await import("../agents.js");
  return scanAgents;
}

describe("scanAgents", () => {
  it("returns empty result for empty project directory", async () => {
    const scanAgents = await getScanAgents();
    const result = await scanAgents(projectDir);
    expect(result).toEqual({ agents: [] });
  });

  it("reads a project agent .md file with frontmatter", async () => {
    const agentsDir = join(projectDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "my-agent.md"),
      `---\nname: My Agent\ndescription: A helpful agent\n---\nAgent system prompt here.`,
    );
    const scanAgents = await getScanAgents();
    const result = await scanAgents(projectDir);
    expect(result.agents).toHaveLength(1);
    const agent = result.agents[0];
    expect(agent.name).toBe("My Agent");
    expect(agent.description).toBe("A helpful agent");
    expect(agent.scope).toBe(ConfigScope.Project);
    expect(agent.source).toBe(EntrySource.Project);
  });

  it("falls back to filename (without .md) when frontmatter has no name", async () => {
    const agentsDir = join(projectDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "fallback-agent.md"),
      `---\ndescription: No name in frontmatter\n---\nContent.`,
    );
    const scanAgents = await getScanAgents();
    const result = await scanAgents(projectDir);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("fallback-agent");
  });

  it("populates model, tools, and disallowedTools from frontmatter", async () => {
    const agentsDir = join(projectDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "advanced-agent.md"),
      `---\nname: Advanced Agent\nmodel: claude-opus-4\ntools: Bash,Read,Write\ndisallowedTools: Bash\n---\nAgent content.`,
    );
    const scanAgents = await getScanAgents();
    const result = await scanAgents(projectDir);
    expect(result.agents).toHaveLength(1);
    const agent = result.agents[0];
    expect(agent.model).toBe("claude-opus-4");
    expect(agent.tools).toEqual(["Bash", "Read", "Write"]);
    expect(agent.disallowedTools).toEqual(["Bash"]);
  });

  it("reads a plugin agent with source=Plugin and pluginName set", async () => {
    const pluginInstallPath = join(tmpDir, "my-plugin");
    const agentsDir = join(pluginInstallPath, "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "plugin-agent.md"),
      `---\nname: Plugin Agent\ndescription: Provided by plugin\n---\nPlugin agent content.`,
    );
    const scanAgents = await getScanAgents();
    const result = await scanAgents(projectDir, [
      { name: "my-plugin", installPath: pluginInstallPath },
    ]);
    expect(result.agents).toHaveLength(1);
    const agent = result.agents[0];
    expect(agent.name).toBe("Plugin Agent");
    expect(agent.scope).toBe(ConfigScope.Global);
    expect(agent.source).toBe(EntrySource.Plugin);
    expect(agent.pluginName).toBe("my-plugin");
  });
});
