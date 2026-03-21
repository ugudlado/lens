#!/usr/bin/env bash
# Start the Lens server in the background if it's not already running.
# Ensures the latest version is always running — kills older versions.
# Runs async on SessionStart so it doesn't block Claude from starting.

PORT=37001

# Clean up old cached versions (blocking — may kill server running from old version)
cleanup_result=$("${BASH_SOURCE%/*}/cleanup-cache.sh" 2>>/tmp/lens-cleanup.log) || true

# TODO: Remove this migration block in v1.7.0
# Migrate workspaces.json from old location (added in v1.6.0)
OLD_WS="$HOME/.claude-config/workspaces.json"
NEW_WS_DIR="$HOME/.config/lens"
if [ -f "$OLD_WS" ] && [ ! -f "$NEW_WS_DIR/workspaces.json" ]; then
  mkdir -p "$NEW_WS_DIR"
  mv "$OLD_WS" "$NEW_WS_DIR/workspaces.json"
  rmdir "$HOME/.claude-config" 2>/dev/null || true
fi

# Determine where to run from: live repo (dev) or latest cached version (by mtime)
LIVE_REPO="$HOME/code/lens"
CACHE_DIR="$HOME/.claude/plugins/cache/ugudlado/lens"
PLUGIN_ROOT=""

if [ -f "$LIVE_REPO/apps/server/dist/index.js" ]; then
  PLUGIN_ROOT="$LIVE_REPO"
else
  latest_dir=$(ls -dt "$CACHE_DIR"/*/ 2>/dev/null | head -1)
  if [ -n "$latest_dir" ] && [ -f "$latest_dir/apps/server/dist/index.js" ]; then
    PLUGIN_ROOT="$latest_dir"
  fi
fi

if [ -z "$PLUGIN_ROOT" ]; then
  exit 0
fi

# Read the version we expect to be running
expected_version=$(python3 -c "import json; print(json.load(open('$PLUGIN_ROOT/.claude-plugin/plugin.json')).get('version',''))" 2>/dev/null || true)

# Check if a server is already running on the port
needs_start=true
if [ "$cleanup_result" != "SERVER_KILLED" ] && lsof -i :"$PORT" -sTCP:LISTEN &>/dev/null; then
  running_version=$(curl -s --max-time 2 "http://localhost:$PORT/api/health" 2>/dev/null \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('version',''))" 2>/dev/null || true)

  if [ -n "$expected_version" ] && [ "$running_version" = "$expected_version" ]; then
    needs_start=false
  else
    # Wrong version or unresponsive — kill it
    STALE_PID=$(lsof -ti :"$PORT" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$STALE_PID" ]; then
      kill "$STALE_PID" 2>/dev/null || true
      sleep 1
    fi
  fi
fi

if [ "$needs_start" = true ]; then
  cd "$PLUGIN_ROOT"
  nohup node apps/server/dist/index.js >/tmp/lens-server.log 2>&1 &
fi
