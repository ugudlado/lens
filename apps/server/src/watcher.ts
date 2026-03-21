import { watch, type FSWatcher } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { detectProjectRoot } from "./scanner/utils.js";

export type ConfigChangeEvent = { time: string; projectPath?: string };
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

const listeners = new Set<ConfigChangeListener>();

export function onConfigChange(listener: ConfigChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(projectPath?: string) {
  const event: ConfigChangeEvent = {
    time: new Date().toISOString(),
    projectPath,
  };
  for (const listener of listeners) {
    listener(event);
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastChangedProject: string | undefined;

function debouncedNotify(projectPath?: string) {
  lastChangedProject = projectPath;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => notify(lastChangedProject), 300);
}

// Subdirectories/files of ~/.claude that contain config we care about.
// We watch ~/.claude recursively, so these are used to filter events.
const GLOBAL_WATCH_NAMES = new Set([
  "settings.json",
  "settings.local.json",
  "CLAUDE.md",
  "plugins",
  "hooks",
  "skills",
  "agents",
  "commands",
  "mcp",
]);

/** Check whether a changed filename under ~/.claude is config-relevant */
function isRelevantGlobalChange(filename: string | null): boolean {
  if (!filename) return true; // Unknown filename — assume relevant
  // filename is relative to the watched dir, e.g. "plugins/foo/plugin.json"
  const topLevel = filename.split("/")[0];
  return GLOBAL_WATCH_NAMES.has(topLevel);
}

type WatchDir = { path: string; projectRoot?: string; recursive: boolean };

function buildWatchDirs(projectRoots: string[]): WatchDir[] {
  const home = homedir();
  const dirs: WatchDir[] = [
    // Watch ~/.claude recursively — FSEvents on macOS uses a single
    // kernel-level watcher for the entire tree (no fd-per-file).
    { path: join(home, ".claude"), recursive: true },
  ];

  for (const root of projectRoots) {
    // Watch project .claude dir recursively
    dirs.push({
      path: join(root, ".claude"),
      projectRoot: root,
      recursive: true,
    });
    // Watch individual project-root config files (non-recursive)
    dirs.push({ path: root, projectRoot: root, recursive: false });
  }

  return dirs;
}

/** Project-root level files we care about (watched non-recursively) */
const PROJECT_ROOT_FILES = new Set([
  ".mcp.json",
  "CLAUDE.md",
  "CLAUDE.local.md",
]);

function isRelevantProjectRootChange(filename: string | null): boolean {
  if (!filename) return true;
  return PROJECT_ROOT_FILES.has(filename);
}

/** Check if a path exists */
async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

let watchers: FSWatcher[] = [];
let currentRoots: string[] = [];

export async function startWatcher(projectRoots?: string[]): Promise<void> {
  currentRoots = projectRoots ?? [detectProjectRoot()];
  const watchDirs = buildWatchDirs(currentRoots);

  for (const dir of watchDirs) {
    if (!(await pathExists(dir.path))) continue;

    try {
      const watcher = watch(
        dir.path,
        { recursive: dir.recursive },
        (_event, filename) => {
          // Filter to config-relevant changes only
          if (dir.recursive && !dir.projectRoot) {
            // ~/.claude — filter by known config subdirs
            if (!isRelevantGlobalChange(filename)) return;
          } else if (!dir.recursive) {
            // Project root — only care about specific files
            if (!isRelevantProjectRootChange(filename)) return;
          }
          // Project .claude dir — all changes are relevant
          debouncedNotify(dir.projectRoot);
        },
      );

      watcher.on("error", (err) => {
        console.warn(`Watcher error for ${dir.path}:`, err.message);
      });

      watchers.push(watcher);
    } catch (err) {
      console.warn(`Could not watch ${dir.path}:`, (err as Error).message);
    }
  }

  console.log(`File watcher started for ${currentRoots.length} workspace(s)`);
}

export function restartWatcher(projectRoots: string[]): void {
  for (const w of watchers) {
    w.close();
  }
  watchers = [];
  void startWatcher(projectRoots);
}
