#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function isPortInUse(port) {
  return new Promise(resolve => {
    const s = createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(port);
  });
}

async function main() {
  const port = Number(process.env.PORT) || 37001;

  const inUse = await isPortInUse(port);
  if (!inUse) {
    const server = spawn('node', ['apps/server/dist/index.js'], {
      cwd: __dirname,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PORT: String(port) },
    });
    server.unref();
    // Give server a moment to start
    await new Promise(r => setTimeout(r, 1000));
  }

  // Open the UI in the browser (server serves UI on the configured port)
  const open = process.platform === 'darwin' ? 'open' :
               process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(open, [`http://localhost:${port}`], { stdio: 'ignore' });

  // Implement minimal MCP stdio protocol
  process.stdin.setEncoding('utf8');
  process.stdout.write(JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    method: 'notifications/initialized',
    params: {}
  }) + '\n');

  process.stdin.on('data', (data) => {
    try {
      const msg = JSON.parse(data.trim());
      if (msg.method === 'initialize') {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: { name: 'claude-config', version: '1.0.0' }
          }
        }) + '\n');
      }
    } catch { /* ignore malformed */ }
  });
}

main().catch(console.error);
