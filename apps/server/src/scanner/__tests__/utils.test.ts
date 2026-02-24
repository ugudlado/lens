import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('GLOBAL_DIR override', () => {
  let tmpDir: string;

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
