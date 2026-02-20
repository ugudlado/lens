export type ConfigChangeEvent = {
    time: string;
    projectPath?: string;
};
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;
export declare function onConfigChange(listener: ConfigChangeListener): () => void;
export declare function startWatcher(projectRoots?: string[]): void;
export declare function restartWatcher(projectRoots: string[]): void;
