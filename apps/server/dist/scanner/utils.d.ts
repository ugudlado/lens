import { ConfigScope } from '@lens/schema';
export declare function detectProjectRoot(): string;
/** Returns all git worktree paths for a given repo path (including the main worktree). */
export declare function listWorktrees(repoPath: string): string[];
export declare function getAllowGlobalWrites(): boolean;
export declare function setAllowGlobalWrites(value: boolean): void;
/** Returns whether a config item at the given scope is editable. */
export declare function isEditable(scope: ConfigScope): boolean;
export declare const GLOBAL_DIR: string;
export declare const MANAGED_DIR: string;
export declare function fileExists(path: string): Promise<boolean>;
export declare function readFileOrNull(path: string): Promise<string | null>;
export declare function readJsonOrNull(path: string): Promise<Record<string, unknown> | null>;
export interface PluginPath {
    name: string;
    installPath: string;
}
export declare function settingsLocations(projectPath: string): {
    path: string;
    scope: ConfigScope;
}[];
export declare function scopeForPath(filePath: string, projectPath: string): ConfigScope;
