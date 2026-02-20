import { Hono } from 'hono';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import type { Workspace } from '@lens/schema';
import { restartWatcher } from '../watcher.js';
import { detectProjectRoot } from '../scanner/utils.js';

const REGISTRY_DIR = join(homedir(), '.claude-config');
const REGISTRY_FILE = join(REGISTRY_DIR, 'workspaces.json');

async function readRegistry(): Promise<Workspace[]> {
  try {
    const raw = await readFile(REGISTRY_FILE, 'utf-8');
    return JSON.parse(raw) as Workspace[];
  } catch {
    return [];
  }
}

async function writeRegistry(workspaces: Workspace[]): Promise<void> {
  await mkdir(REGISTRY_DIR, { recursive: true });
  await writeFile(REGISTRY_FILE, JSON.stringify(workspaces, null, 2), 'utf-8');
}

function isGitRepo(path: string): boolean {
  try {
    execFileSync('git', ['-C', path, 'rev-parse', '--git-dir'], { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/** Auto-seed with the current project if registry is empty */
async function ensureSeeded(): Promise<Workspace[]> {
  let workspaces = await readRegistry();
  if (workspaces.length === 0) {
    const root = detectProjectRoot();
    workspaces = [{
      path: root,
      name: basename(root),
      addedAt: new Date().toISOString(),
    }];
    await writeRegistry(workspaces);
  }
  return workspaces;
}

const app = new Hono();

app.get('/', async (c) => {
  const workspaces = await ensureSeeded();
  return c.json(workspaces);
});

app.post('/', async (c) => {
  const body = await c.req.json<{ path: string; name?: string }>();
  const { path: inputPath } = body;

  if (!inputPath || typeof inputPath !== 'string') {
    return c.json({ error: 'path is required' }, 400);
  }

  if (!existsSync(inputPath)) {
    return c.json({ error: 'Path does not exist' }, 400);
  }

  if (!isGitRepo(inputPath)) {
    return c.json({ error: 'Path is not a git repository' }, 400);
  }

  const workspaces = await ensureSeeded();

  if (workspaces.some(w => w.path === inputPath)) {
    return c.json({ error: 'Workspace already registered' }, 409);
  }

  const name = body.name || basename(inputPath);
  const workspace: Workspace = {
    path: inputPath,
    name,
    addedAt: new Date().toISOString(),
  };

  workspaces.push(workspace);
  await writeRegistry(workspaces);

  // Restart watcher with updated paths
  restartWatcher(workspaces.map(w => w.path));

  return c.json(workspace, 201);
});

app.delete('/:name', async (c) => {
  const name = c.req.param('name');
  const workspaces = await readRegistry();
  const filtered = workspaces.filter(w => w.name !== name);

  if (filtered.length === workspaces.length) {
    return c.json({ error: 'Workspace not found' }, 404);
  }

  await writeRegistry(filtered);

  // Restart watcher with updated paths
  restartWatcher(filtered.map(w => w.path));

  return c.json({ success: true });
});

export default app;
