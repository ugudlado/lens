// apps/ui/src/constants/badgeStyles.ts

export const SCOPE_BADGE_STYLES = {
  managed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Managed' },
  global:  { bg: 'bg-blue-500/20',  text: 'text-blue-400',  label: 'Global'  },
  project: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Project' },
  local:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Local' },
} as const;

export const SOURCE_BADGE = {
  plugin: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
} as const;

export const SOURCE_BADGES = {
  settings: { bg: 'bg-gray-500/20',  text: 'text-gray-400'  },
  plugin:   SOURCE_BADGE.plugin,
  skill:    { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  agent:    { bg: 'bg-purple-500/20',text: 'text-purple-400'},
  hookify:  { bg: 'bg-pink-500/20',  text: 'text-pink-400'  },
} as const;

export const TYPE_BADGE_STYLES = {
  // MCP server types
  mcp: {
    stdio: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    http:  { bg: 'bg-cyan-500/20',   text: 'text-cyan-400'   },
    sse:   { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  },
  // Hook types
  hook: {
    command: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    prompt:  { bg: 'bg-blue-500/20',    text: 'text-blue-400'    },
    agent:   { bg: 'bg-purple-500/20',  text: 'text-purple-400'  },
  },
  // Permission types
  permission: {
    allow: { bg: 'bg-green-500/20', text: 'text-green-400' },
    ask:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    deny:  { bg: 'bg-red-500/20',   text: 'text-red-400'   },
  },
} as const;

export const PLUGIN_CONTENT_BADGE_STYLES = {
  skills:   { color: 'text-amber-400',   bg: 'bg-amber-500/15'  },
  hooks:    { color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  agents:   { color: 'text-purple-400',  bg: 'bg-purple-500/15' },
  commands: { color: 'text-cyan-400',    bg: 'bg-cyan-500/15'   },
  mcps:     { color: 'text-blue-400',    bg: 'bg-blue-500/15'   },
} as const;
