import type { PluginPath } from './utils.js';
import type { HooksSurface } from '@lens/schema';
export declare function scanHooks(projectPath: string, pluginPaths?: PluginPath[]): Promise<HooksSurface>;
