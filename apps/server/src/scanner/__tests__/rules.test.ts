import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigScope } from "@lens/schema";

let tmpDir: string;
let globalDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "lens-rules-test-"));
  globalDir = join(tmpDir, "global-claude");
  projectDir = join(tmpDir, "project");
  await mkdir(globalDir, { recursive: true });
  await mkdir(join(projectDir, ".claude", "rules"), { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanRules() {
  const { scanRules } = await import("../rules.js");
  return scanRules;
}

describe("scanRules", () => {
  it("returns empty result for empty project directory", async () => {
    const scanRules = await getScanRules();
    const result = await scanRules(projectDir);
    expect(result).toEqual({ rules: [] });
  });

  it("parses rule file with frontmatter paths field", async () => {
    const content = `---
paths:
  - src/**/*.ts
  - tests/**/*.ts
---
Only apply to TypeScript files.`;
    await writeFile(
      join(projectDir, ".claude", "rules", "typescript-only.md"),
      content,
    );
    const scanRules = await getScanRules();
    const result = await scanRules(projectDir);
    expect(result.rules).toHaveLength(1);
    const rule = result.rules[0];
    expect(rule.name).toBe("typescript-only");
    expect(rule.scope).toBe(ConfigScope.Project);
    expect(rule.paths).toEqual(["src/**/*.ts", "tests/**/*.ts"]);
    expect(rule.content).toBe("Only apply to TypeScript files.");
  });

  it("parses rule file without frontmatter", async () => {
    const content = "Always write tests before implementation.";
    await writeFile(join(projectDir, ".claude", "rules", "tdd.md"), content);
    const scanRules = await getScanRules();
    const result = await scanRules(projectDir);
    expect(result.rules).toHaveLength(1);
    const rule = result.rules[0];
    expect(rule.name).toBe("tdd");
    expect(rule.paths).toBeUndefined();
    expect(rule.content).toBe(content);
  });

  it("detects global rule in GLOBAL_DIR/rules/ with scope=Global", async () => {
    const globalRulesDir = join(globalDir, "rules");
    await mkdir(globalRulesDir, { recursive: true });
    await writeFile(
      join(globalRulesDir, "global-rule.md"),
      "# Global Rule\nAlways be concise.",
    );
    const scanRules = await getScanRules();
    const result = await scanRules(projectDir);
    expect(result.rules).toHaveLength(1);
    const rule = result.rules[0];
    expect(rule.name).toBe("global-rule");
    expect(rule.scope).toBe(ConfigScope.Global);
  });
});
