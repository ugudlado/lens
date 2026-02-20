import { Hono } from 'hono';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { ConfigScope } from '@lens/schema';
import type { ConfigUpdateRequest, ConfigUpdateResponse } from '@lens/schema';
import { getAllowGlobalWrites, GLOBAL_DIR } from '../scanner/utils.js';

const app = new Hono();

app.patch('/', async (c) => {
  const body = await c.req.json<ConfigUpdateRequest>();
  const { filePath, key, value, scope } = body;
  const deleteKey = body.delete === true;

  if (scope === ConfigScope.Managed) {
    return c.json<ConfigUpdateResponse>({ success: false, error: 'Cannot edit managed settings' }, 403);
  }

  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return c.json<ConfigUpdateResponse>({ success: false, error: 'Invalid filePath' }, 400);
  }

  const abs = resolve(filePath);
  let realHome: string;
  try { realHome = realpathSync(homedir()); } catch { realHome = homedir(); }
  const isAllowed = abs.startsWith(realHome + '/') || abs === realHome;
  if (!isAllowed) {
    return c.json<ConfigUpdateResponse>({ success: false, error: 'Path not allowed' }, 403);
  }

  // Block global-scope writes unless global writes are enabled via the UI toggle
  const globalDir = resolve(GLOBAL_DIR);
  const isGlobal = abs.startsWith(globalDir + '/') || abs === globalDir;
  if (isGlobal && !getAllowGlobalWrites()) {
    return c.json<ConfigUpdateResponse>({ success: false, error: 'Global config is read-only. Enable global writes via the toggle in the top-right corner.' }, 403);
  }

  try {
    if (abs.endsWith('.json')) {
      await mkdir(dirname(abs), { recursive: true });
      let content: string;
      try { content = await readFile(abs, 'utf-8'); } catch { content = '{}'; }

      const json = JSON.parse(content);
      if (key) {
        const keys = key.split('.');
        let target = json;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) target[keys[i]] = {};
          target = target[keys[i]];
        }
        if (deleteKey) {
          delete target[keys[keys.length - 1]];
        } else {
          target[keys[keys.length - 1]] = value;
        }
      } else if (body.replace) {
        await writeFile(abs, JSON.stringify(value, null, 2) + '\n');
        return c.json<ConfigUpdateResponse>({ success: true });
      } else {
        Object.assign(json, value);
      }
      await writeFile(abs, JSON.stringify(json, null, 2) + '\n');
    } else if (abs.endsWith('.md') || abs.endsWith('.mdc')) {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, String(value));
    } else {
      return c.json<ConfigUpdateResponse>({ success: false, error: 'Unsupported file type' }, 400);
    }

    return c.json<ConfigUpdateResponse>({ success: true });
  } catch (err) {
    return c.json<ConfigUpdateResponse>({
      success: false, error: err instanceof Error ? err.message : 'Unknown error',
    }, 500);
  }
});

export default app;
