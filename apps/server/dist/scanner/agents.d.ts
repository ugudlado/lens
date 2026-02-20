import type { PluginPath } from './utils.js';
import type { AgentsSurface } from '@lens/schema';
export declare function scanAgents(projectPath: string, pluginPaths?: PluginPath[]): Promise<AgentsSurface>;
