#!/usr/bin/env bash
# Removes old cached versions of lens plugin.
# Stops any server running from an old version before deleting.
# Called from session-start.sh BEFORE server startup (blocking).
# Outputs "SERVER_KILLED" to stdout if it killed a running server,
# so the caller knows to start a fresh one.
set -euo pipefail

CACHE_DIR="$HOME/.claude/plugins/cache/ugudlado/lens"
INSTALLED_JSON="$HOME/.claude/plugins/installed_plugins.json"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Exit early if cache directory doesn't exist or has < 2 versions
if [ ! -d "$CACHE_DIR" ]; then
  exit 0
fi

version_count=$(find "$CACHE_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$version_count" -lt 2 ]; then
  exit 0
fi

# Read active version from installed_plugins.json (source of truth for what Claude Code uses)
if [ ! -f "$INSTALLED_JSON" ]; then
  echo "$LOG_PREFIX WARNING: installed_plugins.json not found, skipping cleanup" >&2
  exit 0
fi

active_version=$(python3 -c "
import json, sys, os
try:
    data = json.load(open(sys.argv[1]))
    entries = data.get('plugins', {}).get('lens@ugudlado', [])
    if entries:
        print(os.path.basename(entries[0]['installPath']))
except Exception:
    pass
" "$INSTALLED_JSON" 2>/dev/null)

if [ -z "$active_version" ]; then
  echo "$LOG_PREFIX WARNING: Could not determine active version, skipping cleanup" >&2
  exit 0
fi

# Kill processes running from old versions, then remove the directories
removed=0
bytes_freed=0
server_killed=false
for dir in "$CACHE_DIR"/*/; do
  dir_name=$(basename "$dir")
  if [ "$dir_name" = "$active_version" ]; then
    continue
  fi

  # Find and kill any node processes with cwd inside this old version directory
  for pid in $(pgrep -f "node.*$dir" 2>/dev/null || true); do
    pid_cwd=$(lsof -p "$pid" -Fn 2>/dev/null | grep '^ncwd' | sed 's/^n//' || true)
    if [ -n "$pid_cwd" ] && [[ "$pid_cwd" == "$dir"* ]]; then
      echo "$LOG_PREFIX Killing process $pid running from old version $dir_name (cwd: $pid_cwd)" >&2
      kill "$pid" 2>/dev/null || true
      server_killed=true
    fi
  done

  dir_size=$(du -sk "$dir" 2>/dev/null | cut -f1 || echo 0)
  if rm -rf "$dir" 2>/dev/null; then
    echo "$LOG_PREFIX Removed $dir_name (${dir_size}K)" >&2
    removed=$((removed + 1))
    bytes_freed=$((bytes_freed + dir_size))
  else
    echo "$LOG_PREFIX ERROR: Failed to remove $dir_name" >&2
  fi
done

if [ "$removed" -gt 0 ]; then
  echo "$LOG_PREFIX Cleanup complete: removed $removed version(s), freed ${bytes_freed}K. Active: $active_version" >&2
fi

# Signal to caller that server needs restart
if [ "$server_killed" = true ]; then
  echo "SERVER_KILLED"
fi
