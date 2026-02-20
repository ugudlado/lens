import { Hono } from 'hono';
import { scanConfig } from '../scanner/index.js';
import { detectProjectRoot } from '../scanner/utils.js';

const app = new Hono();

async function handleScan(c: import('hono').Context): Promise<Response> {
  const projectPath = c.req.query('project') || detectProjectRoot();
  const snapshot = await scanConfig(projectPath);
  return c.json(snapshot);
}

app.get('/', handleScan);
app.get('/rescan', handleScan);

export default app;
