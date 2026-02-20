import { join } from 'node:path';
import { readJsonOrNull, GLOBAL_DIR } from './utils.js';
import type { KeybindingsSurface, KeybindingEntry } from '@lens/schema';

export async function scanKeybindings(): Promise<KeybindingsSurface> {
  const filePath = join(GLOBAL_DIR, 'keybindings.json');
  const raw = await readJsonOrNull(filePath);
  if (!raw || !Array.isArray(raw)) return { filePath, entries: [] };
  const entries: KeybindingEntry[] = (raw as Record<string, unknown>[]).map(e => ({
    key: typeof e.key === 'string' ? e.key : '',
    command: typeof e.command === 'string' ? e.command : '',
    when: typeof e.when === 'string' ? e.when : undefined,
  }));
  return { filePath, entries };
}
