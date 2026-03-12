import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpDir: string;
let globalDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "lens-keybindings-test-"));
  globalDir = join(tmpDir, "global-claude");
  await mkdir(globalDir, { recursive: true });
  process.env.__TEST_GLOBAL_DIR = globalDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.__TEST_GLOBAL_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

async function getScanKeybindings() {
  const { scanKeybindings } = await import("../keybindings.js");
  return scanKeybindings;
}

describe("scanKeybindings", () => {
  it("returns empty entries when keybindings.json does not exist", async () => {
    const scanKeybindings = await getScanKeybindings();
    const result = await scanKeybindings();
    expect(result.entries).toEqual([]);
    expect(result.filePath).toBe(join(globalDir, "keybindings.json"));
  });

  it("reads keybinding entries with key, command, and when fields", async () => {
    const keybindingsPath = join(globalDir, "keybindings.json");
    await writeFile(
      keybindingsPath,
      JSON.stringify([
        {
          key: "ctrl+shift+p",
          command: "workbench.action.showCommands",
          when: "editorFocus",
        },
        {
          key: "ctrl+s",
          command: "workbench.action.files.save",
          when: "editorIsOpen",
        },
      ]),
    );
    const scanKeybindings = await getScanKeybindings();
    const result = await scanKeybindings();
    expect(result.filePath).toBe(keybindingsPath);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual({
      key: "ctrl+shift+p",
      command: "workbench.action.showCommands",
      when: "editorFocus",
    });
    expect(result.entries[1]).toEqual({
      key: "ctrl+s",
      command: "workbench.action.files.save",
      when: "editorIsOpen",
    });
  });

  it("entry missing when field has when as undefined", async () => {
    const keybindingsPath = join(globalDir, "keybindings.json");
    await writeFile(
      keybindingsPath,
      JSON.stringify([
        { key: "ctrl+k", command: "editor.action.trimTrailingWhitespace" },
      ]),
    );
    const scanKeybindings = await getScanKeybindings();
    const result = await scanKeybindings();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].key).toBe("ctrl+k");
    expect(result.entries[0].command).toBe(
      "editor.action.trimTrailingWhitespace",
    );
    expect(result.entries[0].when).toBeUndefined();
  });
});
