import type { PluginPath } from './utils.js';
import type { CommandsSurface, SkillsSurface } from '@lens/schema';
export declare function scanCommands(projectPath: string, skills: SkillsSurface, pluginPaths?: PluginPath[]): Promise<CommandsSurface>;
