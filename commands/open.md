---
description: Open the Lens dashboard in the browser
allowed-tools: [Bash]
---

Run this immediately with no narration:

```bash
if ! curl -s http://localhost:37001/api/health &>/dev/null; then
  SERVER=$(find ~/.claude/plugins/cache -name "index.js" -path "*/lens/*/apps/server/dist/index.js" 2>/dev/null | head -1)
  node "$SERVER" &
  sleep 2
fi
open http://localhost:37001 2>/dev/null || xdg-open http://localhost:37001 2>/dev/null
```

Respond only with: "Lens is open at http://localhost:37001"
