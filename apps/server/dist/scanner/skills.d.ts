import type { PluginPath } from './utils.js';
import type { SkillsSurface } from '@lens/schema';
export declare function scanSkills(projectPath: string, pluginPaths?: PluginPath[]): Promise<SkillsSurface>;
