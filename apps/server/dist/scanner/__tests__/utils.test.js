import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigScope } from '@lens/schema';
import { scopeForPath, isEditable, setAllowGlobalWrites, GLOBAL_DIR } from '../utils.js';
describe('GLOBAL_DIR override', () => {
    let tmpDir;
    beforeEach(async () => {
        tmpDir = await mkdtemp(join(tmpdir(), 'lens-test-'));
        process.env.__TEST_GLOBAL_DIR = tmpDir;
        vi.resetModules();
    });
    afterEach(async () => {
        delete process.env.__TEST_GLOBAL_DIR;
        await rm(tmpDir, { recursive: true, force: true });
    });
    it('GLOBAL_DIR reflects __TEST_GLOBAL_DIR env var', async () => {
        const { GLOBAL_DIR } = await import('../utils.js');
        expect(GLOBAL_DIR).toBe(tmpDir);
    });
});
describe('scopeForPath', () => {
    const projectPath = '/tmp/my-project';
    it('classifies project settings as Project scope', () => {
        const result = scopeForPath('/tmp/my-project/.claude/settings.json', projectPath);
        expect(result).toBe(ConfigScope.Project);
    });
    it('classifies .local. files as Local scope', () => {
        const result = scopeForPath('/tmp/my-project/.claude/settings.local.json', projectPath);
        expect(result).toBe(ConfigScope.Local);
    });
    it('classifies ~/.claude paths as Global scope', () => {
        const result = scopeForPath(`${GLOBAL_DIR}/settings.json`, projectPath);
        expect(result).toBe(ConfigScope.Global);
    });
});
describe('isEditable', () => {
    afterEach(() => {
        setAllowGlobalWrites(false); // restore default
    });
    it('Managed scope is never editable', () => {
        expect(isEditable(ConfigScope.Managed)).toBe(false);
    });
    it('Project scope is always editable', () => {
        expect(isEditable(ConfigScope.Project)).toBe(true);
    });
    it('Local scope is always editable', () => {
        expect(isEditable(ConfigScope.Local)).toBe(true);
    });
    it('Global scope is editable only when allowGlobalWrites is true', () => {
        setAllowGlobalWrites(false);
        expect(isEditable(ConfigScope.Global)).toBe(false);
        setAllowGlobalWrites(true);
        expect(isEditable(ConfigScope.Global)).toBe(true);
        // no manual reset needed — afterEach handles it
    });
});
