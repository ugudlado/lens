import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { realpathSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import configRoutes from './routes/config.js';
import updateRoutes from './routes/update.js';
import pluginRoutes from './routes/plugins.js';
import workspaceRoutes from './routes/workspaces.js';
import globalWritesRoutes from './routes/global-writes.js';
import { startWatcher, onConfigChange } from './watcher.js';

const app = new Hono();
app.use('*', cors());

app.route('/api/config', configRoutes);
app.route('/api/update', updateRoutes);
app.route('/api/plugins', pluginRoutes);
app.route('/api/workspaces', workspaceRoutes);
app.route('/api/global-writes', globalWritesRoutes);

app.get('/api/events', (c) => {
  return streamSSE(c, async (stream) => {
    const unsubscribe = onConfigChange((event) => {
      stream.writeSSE({ event: 'config-changed', data: JSON.stringify(event) }).catch(() => {
        // connection closed
      });
    });
    // Keep the stream alive until the client disconnects
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        unsubscribe();
        resolve();
      });
    });
  });
});

app.get('/api/file', async (c) => {
  const filePath = c.req.query('path');
  if (!filePath) return c.json({ error: 'Missing path' }, 400);
  let realHome: string;
  try { realHome = realpathSync(homedir()); } catch { realHome = homedir(); }
  const abs = resolve(filePath);
  let realAbs: string;
  try { realAbs = realpathSync(abs); } catch { realAbs = abs; }
  const isAllowed = realAbs.startsWith(realHome + '/') || realAbs === realHome;
  if (!isAllowed) return c.json({ error: 'Path not allowed' }, 403);
  try {
    const content = await readFile(realAbs, 'utf-8');
    return c.json({ content });
  } catch {
    return c.json({ error: 'File not found' }, 404);
  }
});

app.delete('/api/file', async (c) => {
  const filePath = c.req.query('path');
  if (!filePath) return c.json({ error: 'Missing path' }, 400);
  const abs = resolve(filePath);
  const home = homedir();
  if (!abs.startsWith(home + '/') && !abs.startsWith(home + '\\')) {
    return c.json({ error: 'Path not allowed — must be within home directory' }, 403);
  }
  try {
    await rm(abs, { force: true });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Serve built UI static files (production/plugin mode)
// serveStatic root is relative to CWD; when run from repo root, UI dist is at apps/ui/dist
app.use('/*', serveStatic({ root: 'apps/ui/dist' }));
// SPA fallback: serve index.html for client-side routing
app.get('/*', async (c) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const indexPath = resolve(__dirname, '..', '..', 'ui', 'dist', 'index.html');
  try {
    const html = await readFile(indexPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.notFound();
  }
});

const port = Number(process.env.PORT) || 37001;
console.log(`Lens server on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

startWatcher();
