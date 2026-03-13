// apps/ui/src/constants/badgeStyles.ts

export const SCOPE_BADGE_STYLES = {
  managed: { bg: "bg-rose-500/15", text: "text-rose-400/70", label: "Managed" },
  global: { bg: "bg-slate-700/60", text: "text-slate-400", label: "Global" },
  project: { bg: "bg-teal-900/50", text: "text-teal-400/70", label: "Project" },
  local: { bg: "bg-amber-900/50", text: "text-amber-400/70", label: "Local" },
} as const;

export const SOURCE_BADGE = {
  plugin: { bg: "bg-zinc-800", text: "text-zinc-400" },
} as const;

export const SOURCE_BADGES = {
  settings: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
  plugin: SOURCE_BADGE.plugin,
  skill: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
  agent: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
  hookify: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
} as const;

export const TYPE_BADGE_STYLES = {
  // MCP server types — muted, protocol is metadata not status
  mcp: {
    stdio: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
    http: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
    sse: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
  },
  // Hook types - muted category badges
  hook: {
    command: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
    prompt: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
    agent: { bg: "bg-zinc-800/60", text: "text-zinc-500" },
  },
  // Permission types
  permission: {
    allow: { bg: "bg-teal-500/20", text: "text-teal-400" },
    ask: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    deny: { bg: "bg-rose-500/20", text: "text-rose-400" },
  },
} as const;

export const PLUGIN_CONTENT_BADGE_STYLES = {
  skills: { color: "text-amber-400", bg: "bg-amber-500/15" },
  hooks: { color: "text-teal-400", bg: "bg-teal-500/15" },
  agents: { color: "text-orange-400", bg: "bg-orange-500/15" },
  commands: { color: "text-sky-400", bg: "bg-sky-500/15" },
  mcps: { color: "text-stone-400", bg: "bg-stone-500/15" },
} as const;
