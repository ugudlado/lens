#!/usr/bin/env bash
# Start the Lens server in the background if it's not already running.
# Runs async on SessionStart so it doesn't block Claude from starting.

if curl -s http://localhost:37001/api/health &>/dev/null; then
  exit 0
fi

SERVER=$(find ~/.claude/plugins/cache -name "index.js" -path "*/lens/*/apps/server/dist/index.js" 2>/dev/null | head -1)
if [ -z "$SERVER" ]; then
  exit 0
fi

nohup node "$SERVER" >/tmp/lens-server.log 2>&1 &
