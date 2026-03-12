import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "lens-memory-test-"));
  globalDir = join(tmpDir, "global-claude");
  projectDir = join(tmpDir, "project");
  await mkdir(globalDir, { recursive: true });
  await mkdir(projectDir, { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanMemory() {
  const { scanMemory } = await import("../memory.js");
  return scanMemory;
}

function getMemoryDir(globalDir: string, projectPath: string): string {
  const projectDirName = projectPath.replace(/\//g, "-");
  return join(globalDir, "projects", projectDirName, "memory");
}

describe("scanMemory", () => {
  it("returns empty result when no memory directory exists", async () => {
    const scanMemory = await getScanMemory();
    const result = await scanMemory(projectDir);
    expect(result).toEqual({ memoryDir: null, files: [] });
  });

  it("reads .md files from memory directory", async () => {
    const memoryDir = getMemoryDir(globalDir, projectDir);
    await mkdir(memoryDir, { recursive: true });
    const content = "# My Memory\nSome content\nThird line";
    await writeFile(join(memoryDir, "notes.md"), content);
    const scanMemory = await getScanMemory();
    const result = await scanMemory(projectDir);
    expect(result.memoryDir).toBe(memoryDir);
    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.name).toBe("notes.md");
    expect(file.filePath).toBe(join(memoryDir, "notes.md"));
    expect(file.content).toBe(content);
    expect(file.lineCount).toBe(3);
  });

  it("excludes non-.md files from memory directory", async () => {
    const memoryDir = getMemoryDir(globalDir, projectDir);
    await mkdir(memoryDir, { recursive: true });
    await writeFile(join(memoryDir, "notes.md"), "# Valid");
    await writeFile(join(memoryDir, "ignored.txt"), "not markdown");
    await writeFile(join(memoryDir, "also-ignored.json"), "{}");
    const scanMemory = await getScanMemory();
    const result = await scanMemory(projectDir);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].name).toBe("notes.md");
  });
});
