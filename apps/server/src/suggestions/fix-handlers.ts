import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const GLOBAL_DIR = join(homedir(), ".claude");

type FixHandler = (projectPath: string) => Promise<void>;

const CLAUDE_MD_TEMPLATE = `# Project

> **Getting started:** Consider installing these plugins to improve this file:
>
> - \`claude-md-management\` — audit and improve CLAUDE.md files
> - \`claude-code-setup\` — get automation recommendations for your project

## Build & Development Commands

<!-- Add commands here, e.g. npm run dev, pnpm build -->

## Architecture

<!-- Brief description of the codebase structure -->

## Conventions

<!-- Coding standards, naming conventions, etc. -->
`;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fixCreateClaudeMd(projectPath: string): Promise<void> {
  const target = join(projectPath, "CLAUDE.md");
  if (await fileExists(target)) return;
  await writeFile(target, CLAUDE_MD_TEMPLATE);
}

async function fixCreateProjectSettings(projectPath: string): Promise<void> {
  const target = join(projectPath, ".claude", "settings.json");
  if (await fileExists(target)) return;
  await mkdir(join(projectPath, ".claude"), { recursive: true });
  await writeFile(target, "{}\n");
}

async function fixEnableSandbox(projectPath: string): Promise<void> {
  const target = join(projectPath, ".claude", "settings.json");
  await mkdir(join(projectPath, ".claude"), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    const content = await readFile(target, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // file missing or invalid JSON — start fresh
  }
  existing["sandbox"] = true;
  await writeFile(target, JSON.stringify(existing, null, 2) + "\n");
}

async function fixCreateMemory(projectPath: string): Promise<void> {
  // Scanner reads memory from ~/.claude/projects/<encoded-path>/memory/
  // matching the same derivation as the memory scanner
  const projectDirName = projectPath.replace(/\//g, "-");
  const memoryDir = join(GLOBAL_DIR, "projects", projectDirName, "memory");
  const target = join(memoryDir, "AGENTS.md");
  if (await fileExists(target)) return;
  await mkdir(memoryDir, { recursive: true });
  await writeFile(
    target,
    `# Agent Memory\n\n<!-- Add persistent context for Claude here -->\n`,
  );
}

export const fixHandlers: Map<string, FixHandler> = new Map([
  ["health-no-claude-md", fixCreateClaudeMd],
  ["bp-no-project-settings", fixCreateProjectSettings],
  ["bp-sandbox-disabled", fixEnableSandbox],
  ["bp-no-memory", fixCreateMemory],
  ["ctx-plugins-no-settings", fixCreateProjectSettings],
]);
