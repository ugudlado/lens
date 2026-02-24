import { watch, type FSWatcher } from 'chokidar';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { detectProjectRoot } from './scanner/utils.js';

export type ConfigChangeEvent = { time: string; projectPath?: string };
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

const listeners = new Set<ConfigChangeListener>();

export function onConfigChange(listener: ConfigChangeListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify(projectPath?: string) {
  const event: ConfigChangeEvent = { time: new Date().toISOString(), projectPath };
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

// Subdirectories of ~/.claude that contain config we care about watching
const GLOBAL_WATCH_SUBDIRS = [
  'settings.json',
  'settings.local.json',
  'CLAUDE.md',
  'plugins',
  'hooks',
  'skills',
  'agents',
  'commands',
  'mcp',
];

function buildWatchPaths(projectRoots: string[]): string[] {
  const home = homedir();
  const claudeDir = join(home, '.claude');
  // Watch specific subdirs/files in ~/.claude to avoid opening FDs for debug/, projects/, etc.
  const paths = GLOBAL_WATCH_SUBDIRS.map(sub => join(claudeDir, sub));

  for (const root of projectRoots) {
    paths.push(
      join(root, '.claude'),
      join(root, '.mcp.json'),
      join(root, 'CLAUDE.md'),
      join(root, 'CLAUDE.local.md'),
    );
  }

  return paths;
}

function findProjectForPath(filePath: string, projectRoots: string[]): string | undefined {
  return projectRoots.find(root => filePath.startsWith(root));
}

let currentWatcher: FSWatcher | null = null;
let currentRoots: string[] = [];

export function startWatcher(projectRoots?: string[]): void {
  currentRoots = projectRoots ?? [detectProjectRoot()];
  const paths = buildWatchPaths(currentRoots);

  currentWatcher = watch(paths, {
    ignoreInitial: true,
    depth: 3,
    ignored: /[/\\](\.git|node_modules)[/\\]/,
  });

  currentWatcher.on('all', (_event, filePath) => {
    const projectPath = findProjectForPath(filePath, currentRoots);
    debouncedNotify(projectPath);
  });

  console.log(`File watcher started for ${currentRoots.length} workspace(s)`);
}

export function restartWatcher(projectRoots: string[]): void {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }
  startWatcher(projectRoots);
}
