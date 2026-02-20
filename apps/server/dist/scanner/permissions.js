import { readJsonOrNull, isEditable, settingsLocations } from './utils.js';
import { PermissionType } from '@lens/schema';
export async function scanPermissions(projectPath) {
    const rules = [];
    let defaultMode = null;
    for (const { path, scope } of settingsLocations(projectPath)) {
        const raw = await readJsonOrNull(path);
        if (!raw)
            continue;
        const perms = raw.permissions;
        if (!perms)
            continue;
        for (const type of [PermissionType.Allow, PermissionType.Ask, PermissionType.Deny]) {
            const list = perms[type];
            if (Array.isArray(list)) {
                for (const rule of list) {
                    if (typeof rule === 'string') {
                        rules.push({ rule, type, scope, filePath: path });
                    }
                }
            }
        }
        if (typeof perms.defaultMode === 'string') {
            defaultMode = { value: perms.defaultMode, scope, filePath: path, editable: isEditable(scope) };
        }
    }
    return { rules, defaultMode };
}
