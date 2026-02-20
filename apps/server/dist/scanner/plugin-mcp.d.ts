import type { McpServer } from '@lens/schema';
interface PluginRef {
    name: string;
    installPath: string;
    enabled: boolean;
}
/** Scan .mcp.json files from installed plugin directories. */
export declare function scanPluginMcpServers(plugins: PluginRef[]): Promise<McpServer[]>;
export {};
