// ─── Enums ───────────────────────────────────────────

export enum ConfigScope {
  Managed = 'managed',
  Global = 'global',
  Project = 'project',
  Local = 'local',
}

export enum McpServerType {
  Stdio = 'stdio',
  Http = 'http',
  Sse = 'sse',
}

export enum PermissionType {
  Allow = 'allow',
  Ask = 'ask',
  Deny = 'deny',
}

export enum HookType {
  Command = 'command',
  Prompt = 'prompt',
  Agent = 'agent',
}

export enum HookSource {
  Settings = 'settings',
  Plugin = 'plugin',
  Skill = 'skill',
  Agent = 'agent',
  Hookify = 'hookify',
}

export enum EntrySource {
  Project = 'project',
  Global = 'global',
  Plugin = 'plugin',
}

export enum PluginScope {
  User = 'user',
  Project = 'project',
}

export enum AgentMemory {
  User = 'user',
  Project = 'project',
  Local = 'local',
}

export enum PluginAction {
  Enable = 'enable',
  Disable = 'disable',
  Install = 'install',
  Uninstall = 'uninstall',
  Update = 'update',
  MarketplaceAdd = 'marketplace-add',
  MarketplaceRemove = 'marketplace-remove',
}

export enum Surface {
  ClaudeMd = 'claude-md',
  Settings = 'settings',
  Permissions = 'permissions',
  Mcp = 'mcp',
  Hooks = 'hooks',
  Skills = 'skills',
  Agents = 'agents',
  Rules = 'rules',
  Commands = 'commands',
  Plugins = 'plugins',
  Models = 'models',
  Memory = 'memory',
  Sandbox = 'sandbox',
  Keybindings = 'keybindings',
}

export enum ModelProviderType {
  Anthropic = 'anthropic',
  Ollama = 'ollama',
  Bedrock = 'bedrock',
  Vertex = 'vertex',
}

export enum NavSection {
  Overview = 'overview',
  ClaudeMd = 'claude-md',
  Settings = 'settings',
  Permissions = 'permissions',
  Mcp = 'mcp',
  Hooks = 'hooks',
  Skills = 'skills',
  Agents = 'agents',
  Rules = 'rules',
  Commands = 'commands',
  Memory = 'memory',
  Plugins = 'plugins',
  Sandbox = 'sandbox',
}

export enum HookEvent {
  SessionStart = 'SessionStart',
  UserPromptSubmit = 'UserPromptSubmit',
  PreToolUse = 'PreToolUse',
  PermissionRequest = 'PermissionRequest',
  PostToolUse = 'PostToolUse',
  PostToolUseFailure = 'PostToolUseFailure',
  Notification = 'Notification',
  SubagentStart = 'SubagentStart',
  SubagentStop = 'SubagentStop',
  Stop = 'Stop',
  TeammateIdle = 'TeammateIdle',
  TaskCompleted = 'TaskCompleted',
  PreCompact = 'PreCompact',
  SessionEnd = 'SessionEnd',
}

// ─── Scope & Meta ───────────────────────────────────

export interface ScopedItem<T> {
  value: T;
  scope: ConfigScope;
  filePath: string;
  editable: boolean;
}

export interface ConfigSnapshot {
  scanTime: string;
  projectPath: string;
  globalPath: string;
  allowGlobalWrites: boolean;
  claudeMd: ClaudeMdHierarchy;
  settings: SettingsSurface;
  permissions: PermissionsSurface;
  mcp: McpSurface;
  hooks: HooksSurface;
  skills: SkillsSurface;
  agents: AgentsSurface;
  rules: RulesSurface;
  commands: CommandsSurface;
  plugins: PluginsSurface;
  models: ModelsSurface;
  memory: MemorySurface;
  sandbox: SandboxSurface;
  keybindings: KeybindingsSurface;
}

// ─── 1. CLAUDE.md ───────────────────────────────────

export interface ClaudeMdFile {
  scope: ConfigScope;
  filePath: string;
  content: string;
  isLocal: boolean;
  lineCount: number;
}

export interface ClaudeMdHierarchy {
  files: ClaudeMdFile[];
  loadOrder: string[];
}

// ─── 2. Settings ────────────────────────────────────

export interface SettingsFile {
  scope: ConfigScope;
  filePath: string;
  editable: boolean;
  raw: Record<string, unknown>;
}

export interface SettingsSurface {
  files: SettingsFile[];
  effective: Record<string, ScopedItem<unknown>>;
}

// ─── 3. Permissions ─────────────────────────────────

export interface PermissionRule {
  rule: string;
  type: PermissionType;
  scope: ConfigScope;
  filePath: string;
}

export interface PermissionsSurface {
  rules: PermissionRule[];
  defaultMode: ScopedItem<string> | null;
}

// ─── 4. MCP Servers ─────────────────────────────────

export interface McpServer {
  name: string;
  scope: ConfigScope;
  filePath: string;
  editable: boolean;
  type: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  /** If provided by a plugin, the plugin name */
  pluginName?: string;
  /** Whether the plugin providing this server is installed (false = available but not installed) */
  pluginInstalled?: boolean;
}

export interface McpSurface {
  servers: McpServer[];
}

// ─── 5. Hooks ───────────────────────────────────────

export interface HookEntry {
  event: HookEvent;
  matcher?: string;
  type: HookType;
  command?: string;
  prompt?: string;
  timeout?: number;
  scope: ConfigScope;
  filePath: string;
  source: HookSource;
  pluginName?: string;
}

export interface HooksSurface {
  hooks: HookEntry[];
  disableAllHooks: boolean;
}

// ─── 6. Skills ──────────────────────────────────────

export interface SkillEntry {
  name: string;
  description: string;
  scope: ConfigScope;
  filePath: string;
  source: EntrySource;
  pluginName?: string;
  userInvocable: boolean;
  allowedTools?: string[];
  model?: string;
  hasHooks: boolean;
}

export interface SkillsSurface {
  skills: SkillEntry[];
}

// ─── 7. Agents ──────────────────────────────────────

export interface AgentEntry {
  name: string;
  description: string;
  scope: ConfigScope;
  filePath: string;
  source: EntrySource;
  pluginName?: string;
  model?: string;
  tools?: string[];
  disallowedTools?: string[];
  permissionMode?: string;
  memory?: AgentMemory;
}

export interface AgentsSurface {
  agents: AgentEntry[];
}

// ─── 8. Rules ───────────────────────────────────────

export interface RuleEntry {
  name: string;
  scope: ConfigScope;
  filePath: string;
  paths?: string[];
  content: string;
  lineCount: number;
}

export interface RulesSurface {
  rules: RuleEntry[];
}

// ─── 9. Commands (Legacy) ───────────────────────────

export interface CommandEntry {
  name: string;
  scope: ConfigScope;
  filePath: string;
  source: EntrySource;
  pluginName?: string;
  content: string;
  supersededBySkill: boolean;
}

export interface CommandsSurface {
  commands: CommandEntry[];
}

// ─── 10. Plugins ────────────────────────────────────

export interface PluginContentItem {
  name: string;
  description?: string;
}

export interface PluginEntry {
  name: string;
  marketplace: string;
  version: string;
  installPath: string;
  installedAt: string;
  enabled: boolean;
  scope: PluginScope;
  description?: string;
  gitSha?: string;
  /** Latest version available in the marketplace (semver or commit SHA) */
  latestVersion?: string;
  /** True when an update is available */
  updateAvailable?: boolean;
  contents?: {
    skills: PluginContentItem[];
    hooks: PluginContentItem[];
    agents: PluginContentItem[];
    commands: PluginContentItem[];
  };
  files?: string[];
}

export interface MarketplacePlugin {
  name: string;
  marketplace: string;
  description?: string;
  installed: boolean;
  /** If installed, the installed plugin's version */
  installedVersion?: string;
  /** External plugins are managed outside the marketplace (e.g. MCP servers installed separately) */
  external?: boolean;
}

export interface PluginsSurface {
  plugins: PluginEntry[];
  marketplaces: { name: string; url: string }[];
  available: MarketplacePlugin[];
}

// ─── 11. Models ─────────────────────────────────────

export interface ModelProvider {
  name: string;
  type: ModelProviderType;
  available: boolean;
  models: ModelEntry[];
  configSource?: string;
}

export interface ModelEntry {
  id: string;
  label: string;
  detail?: string;
}

export interface ModelsSurface {
  providers: ModelProvider[];
  defaultModel: ScopedItem<string> | null;
}

// ─── 12. Memory ─────────────────────────────────────

export interface MemoryFile {
  name: string;
  filePath: string;
  content: string;
  lineCount: number;
}

export interface MemorySurface {
  memoryDir: string | null;
  files: MemoryFile[];
}

// ─── 13. Sandbox ────────────────────────────────────

export interface SandboxSurface {
  enabled: ScopedItem<boolean> | null;
  network: {
    allowedDomains: ScopedItem<string[]> | null;
    allowUnixSockets: ScopedItem<string[]> | null;
    allowLocalBinding: ScopedItem<boolean> | null;
  };
  autoAllowBashIfSandboxed: ScopedItem<boolean> | null;
}

// ─── 14. Keybindings ────────────────────────────────────

export interface KeybindingEntry {
  key: string;
  command: string;
  when?: string;
}

export interface KeybindingsSurface {
  filePath: string;
  entries: KeybindingEntry[];
}

// ─── Workspace ─────────────────────────────────────

export interface Workspace {
  path: string;
  name: string;
  addedAt: string;
}

// ─── API Types ──────────────────────────────────────

export interface ConfigUpdateRequest {
  surface: Surface | string;
  scope: ConfigScope;
  filePath: string;
  key?: string;
  value: unknown;
  delete?: boolean;
  replace?: boolean;
}

export interface ConfigUpdateResponse {
  success: boolean;
  error?: string;
}

export interface FileDeleteResponse {
  success: boolean;
  error?: string;
}

export interface PluginActionRequest {
  action: PluginAction;
  /** Plugin identifier, e.g. "hookify" or "hookify@claude-plugins-official" */
  plugin: string;
  scope?: PluginScope;
}

export interface PluginActionResponse {
  success: boolean;
  output?: string;
  error?: string;
}
