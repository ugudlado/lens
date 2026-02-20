import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { readFileOrNull, GLOBAL_DIR } from './utils.js';
export async function scanMemory(projectPath) {
    const projectDirName = projectPath.replace(/\//g, '-');
    const memoryDir = join(GLOBAL_DIR, 'projects', projectDirName, 'memory');
    const files = [];
    try {
        const entries = await readdir(memoryDir);
        for (const file of entries) {
            if (!file.endsWith('.md'))
                continue;
            const filePath = join(memoryDir, file);
            const content = await readFileOrNull(filePath);
            if (!content)
                continue;
            files.push({ name: file, filePath, content, lineCount: content.split('\n').length });
        }
    }
    catch { /* no memory directory */ }
    return { memoryDir: files.length > 0 ? memoryDir : null, files };
}
