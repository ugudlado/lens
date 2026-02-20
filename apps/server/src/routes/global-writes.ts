import { Hono } from 'hono';
import { getAllowGlobalWrites, setAllowGlobalWrites } from '../scanner/utils.js';

const app = new Hono();

app.get('/', (c) => c.json({ allowGlobalWrites: getAllowGlobalWrites() }));

app.patch('/', async (c) => {
  const body = await c.req.json<{ enabled: boolean }>();
  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: 'Invalid body: expected { enabled: boolean }' }, 400);
  }
  setAllowGlobalWrites(body.enabled);
  return c.json({ allowGlobalWrites: getAllowGlobalWrites() });
});

export default app;
