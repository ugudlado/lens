import { join } from 'node:path';
import { readJsonOrNull, GLOBAL_DIR } from './utils.js';
export async function scanKeybindings() {
    const filePath = join(GLOBAL_DIR, 'keybindings.json');
    const raw = await readJsonOrNull(filePath);
    if (!raw || !Array.isArray(raw))
        return { filePath, entries: [] };
    const entries = raw.map(e => ({
        key: typeof e.key === 'string' ? e.key : '',
        command: typeof e.command === 'string' ? e.command : '',
        when: typeof e.when === 'string' ? e.when : undefined,
    }));
    return { filePath, entries };
}
