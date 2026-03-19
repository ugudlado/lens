#!/usr/bin/env bash
# Start the Lens server in the background if it's not already running.
# Runs async on SessionStart so it doesn't block Claude from starting.

# TODO: Remove this migration block in v1.7.0
# Migrate workspaces.json from old location (added in v1.6.0)
OLD_WS="$HOME/.claude-config/workspaces.json"
NEW_WS_DIR="$HOME/.config/lens"
if [ -f "$OLD_WS" ] && [ ! -f "$NEW_WS_DIR/workspaces.json" ]; then
  mkdir -p "$NEW_WS_DIR"
  mv "$OLD_WS" "$NEW_WS_DIR/workspaces.json"
  rmdir "$HOME/.claude-config" 2>/dev/null || true
fi

if curl -s http://localhost:37001/api/health &>/dev/null; then
  exit 0
fi


# Prefer the live repo if it exists (for local development), otherwise find in cache
LIVE_REPO="$HOME/code/lens"
if [ -f "$LIVE_REPO/apps/server/dist/index.js" ]; then
  PLUGIN_ROOT="$LIVE_REPO"
else
  DIST=$(find ~/.claude/plugins/cache -name "index.js" -path "*/lens/*/apps/server/dist/index.js" 2>/dev/null | head -1)
  PLUGIN_ROOT="${DIST:+${DIST%/apps/server/dist/index.js}}"
fi

if [ -z "$PLUGIN_ROOT" ]; then
  exit 0
fi

cd "$PLUGIN_ROOT"
nohup node apps/server/dist/index.js >/tmp/lens-server.log 2>&1 &
