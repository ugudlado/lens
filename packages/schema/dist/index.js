// ─── Enums ───────────────────────────────────────────
export var ConfigScope;
(function (ConfigScope) {
    ConfigScope["Managed"] = "managed";
    ConfigScope["Global"] = "global";
    ConfigScope["Project"] = "project";
    ConfigScope["Local"] = "local";
})(ConfigScope || (ConfigScope = {}));
export var McpServerType;
(function (McpServerType) {
    McpServerType["Stdio"] = "stdio";
    McpServerType["Http"] = "http";
    McpServerType["Sse"] = "sse";
})(McpServerType || (McpServerType = {}));
export var PermissionType;
(function (PermissionType) {
    PermissionType["Allow"] = "allow";
    PermissionType["Ask"] = "ask";
    PermissionType["Deny"] = "deny";
})(PermissionType || (PermissionType = {}));
export var HookType;
(function (HookType) {
    HookType["Command"] = "command";
    HookType["Prompt"] = "prompt";
    HookType["Agent"] = "agent";
})(HookType || (HookType = {}));
export var HookSource;
(function (HookSource) {
    HookSource["Settings"] = "settings";
    HookSource["Plugin"] = "plugin";
    HookSource["Skill"] = "skill";
    HookSource["Agent"] = "agent";
    HookSource["Hookify"] = "hookify";
})(HookSource || (HookSource = {}));
export var EntrySource;
(function (EntrySource) {
    EntrySource["Project"] = "project";
    EntrySource["Global"] = "global";
    EntrySource["Plugin"] = "plugin";
})(EntrySource || (EntrySource = {}));
export var PluginScope;
(function (PluginScope) {
    PluginScope["User"] = "user";
    PluginScope["Project"] = "project";
})(PluginScope || (PluginScope = {}));
export var AgentMemory;
(function (AgentMemory) {
    AgentMemory["User"] = "user";
    AgentMemory["Project"] = "project";
    AgentMemory["Local"] = "local";
})(AgentMemory || (AgentMemory = {}));
export var PluginAction;
(function (PluginAction) {
    PluginAction["Enable"] = "enable";
    PluginAction["Disable"] = "disable";
    PluginAction["Install"] = "install";
    PluginAction["Uninstall"] = "uninstall";
    PluginAction["Update"] = "update";
    PluginAction["MarketplaceAdd"] = "marketplace-add";
    PluginAction["MarketplaceRemove"] = "marketplace-remove";
})(PluginAction || (PluginAction = {}));
export var Surface;
(function (Surface) {
    Surface["ClaudeMd"] = "claude-md";
    Surface["Settings"] = "settings";
    Surface["Permissions"] = "permissions";
    Surface["Mcp"] = "mcp";
    Surface["Hooks"] = "hooks";
    Surface["Skills"] = "skills";
    Surface["Agents"] = "agents";
    Surface["Rules"] = "rules";
    Surface["Commands"] = "commands";
    Surface["Plugins"] = "plugins";
    Surface["Models"] = "models";
    Surface["Memory"] = "memory";
    Surface["Sandbox"] = "sandbox";
    Surface["Keybindings"] = "keybindings";
})(Surface || (Surface = {}));
export var ModelProviderType;
(function (ModelProviderType) {
    ModelProviderType["Anthropic"] = "anthropic";
    ModelProviderType["Ollama"] = "ollama";
    ModelProviderType["Bedrock"] = "bedrock";
    ModelProviderType["Vertex"] = "vertex";
})(ModelProviderType || (ModelProviderType = {}));
export var NavSection;
(function (NavSection) {
    NavSection["Overview"] = "overview";
    NavSection["ClaudeMd"] = "claude-md";
    NavSection["Settings"] = "settings";
    NavSection["Permissions"] = "permissions";
    NavSection["Mcp"] = "mcp";
    NavSection["Hooks"] = "hooks";
    NavSection["Skills"] = "skills";
    NavSection["Agents"] = "agents";
    NavSection["Rules"] = "rules";
    NavSection["Commands"] = "commands";
    NavSection["Memory"] = "memory";
    NavSection["Plugins"] = "plugins";
    NavSection["Sandbox"] = "sandbox";
})(NavSection || (NavSection = {}));
export var HookEvent;
(function (HookEvent) {
    HookEvent["SessionStart"] = "SessionStart";
    HookEvent["UserPromptSubmit"] = "UserPromptSubmit";
    HookEvent["PreToolUse"] = "PreToolUse";
    HookEvent["PermissionRequest"] = "PermissionRequest";
    HookEvent["PostToolUse"] = "PostToolUse";
    HookEvent["PostToolUseFailure"] = "PostToolUseFailure";
    HookEvent["Notification"] = "Notification";
    HookEvent["SubagentStart"] = "SubagentStart";
    HookEvent["SubagentStop"] = "SubagentStop";
    HookEvent["Stop"] = "Stop";
    HookEvent["TeammateIdle"] = "TeammateIdle";
    HookEvent["TaskCompleted"] = "TaskCompleted";
    HookEvent["PreCompact"] = "PreCompact";
    HookEvent["SessionEnd"] = "SessionEnd";
})(HookEvent || (HookEvent = {}));
