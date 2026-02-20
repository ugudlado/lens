---
name: open
description: Open the Lens dashboard in the browser
allowed-tools: [Bash]
---

Start the Lens server (if not already running) and open the dashboard in the browser.

## Steps

1. Check if the server is already running on port 37001:
   ```bash
   curl -s http://localhost:37001/api/health 2>/dev/null
   ```

2. If not running, start the server in the background:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/plugin-server.mjs &
   ```

3. Open the dashboard in the browser:
   - macOS: `open http://localhost:37001`
   - Linux: `xdg-open http://localhost:37001`
   - Windows: `start http://localhost:37001`

4. Confirm to the user that the dashboard is available at `http://localhost:37001`

## Notes

- Global config (`~/.claude/`) is **read-only** by default. Use the toggle in the top-right corner of the dashboard to enable global writes.
- The default port is **37001**. Set `PORT=<number>` in the environment to use a different port.
- The `plugin-server.mjs` launcher handles port-in-use detection — it won't start a duplicate server.
- If the server fails to start, check that `apps/server/dist/index.js` exists (run `pnpm build` if not).
