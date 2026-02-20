import { readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { platform } from 'node:process';
import { execFileSync } from 'node:child_process';
import { ConfigScope } from '@lens/schema';
export function detectProjectRoot() {
    try {
        return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim();
    }
    catch {
        return process.cwd();
    }
}
/** Returns all git worktree paths for a given repo path (including the main worktree). */
export function listWorktrees(repoPath) {
    try {
        const output = execFileSync('git', ['-C', repoPath, 'worktree', 'list', '--porcelain'], { encoding: 'utf-8' });
        return output.split('\n\n')
            .map(block => {
            const line = block.split('\n').find(l => l.startsWith('worktree '));
            return line ? line.slice('worktree '.length).trim() : null;
        })
            .filter((p) => p !== null && p !== '');
    }
    catch {
        return [repoPath];
    }
}
/** When false (default), global-scope config files are read-only in the UI. Toggled via PATCH /api/global-writes. */
let _allowGlobalWrites = false;
export function getAllowGlobalWrites() { return _allowGlobalWrites; }
export function setAllowGlobalWrites(value) { _allowGlobalWrites = value; }
/** Returns whether a config item at the given scope is editable. */
export function isEditable(scope) {
    if (scope === ConfigScope.Managed)
        return false;
    if (scope === ConfigScope.Global)
        return _allowGlobalWrites;
    return true;
}
export const GLOBAL_DIR = join(homedir(), '.claude');
function getManagedDir() {
    if (platform === 'darwin')
        return '/Library/Application Support/ClaudeCode';
    if (platform === 'win32')
        return 'C:\\Program Files\\ClaudeCode';
    return '/etc/claude-code';
}
export const MANAGED_DIR = getManagedDir();
export async function fileExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function readFileOrNull(path) {
    try {
        return await readFile(path, 'utf-8');
    }
    catch {
        return null;
    }
}
export async function readJsonOrNull(path) {
    const content = await readFileOrNull(path);
    if (!content)
        return null;
    try {
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
export function settingsLocations(projectPath) {
    return [
        { path: join(MANAGED_DIR, 'managed-settings.json'), scope: ConfigScope.Managed },
        { path: join(GLOBAL_DIR, 'settings.json'), scope: ConfigScope.Global },
        { path: join(projectPath, '.claude', 'settings.json'), scope: ConfigScope.Project },
        { path: join(projectPath, '.claude', 'settings.local.json'), scope: ConfigScope.Local },
    ];
}
export function scopeForPath(filePath, projectPath) {
    const resolved = resolve(filePath);
    if (resolved.startsWith(resolve(MANAGED_DIR)))
        return ConfigScope.Managed;
    if (resolved.includes('.local.') || resolved.endsWith('settings.local.json'))
        return ConfigScope.Local;
    if (resolved.startsWith(resolve(projectPath)))
        return ConfigScope.Project;
    if (resolved.startsWith(resolve(GLOBAL_DIR)))
        return ConfigScope.Global;
    return ConfigScope.Global;
}
