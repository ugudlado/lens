import { readJsonOrNull, isEditable, settingsLocations } from './utils.js';
import { PermissionType } from '@lens/schema';
import type { PermissionsSurface, PermissionRule, ScopedItem } from '@lens/schema';

export async function scanPermissions(projectPath: string): Promise<PermissionsSurface> {
  const rules: PermissionRule[] = [];
  let defaultMode: ScopedItem<string> | null = null;

  for (const { path, scope } of settingsLocations(projectPath)) {
    const raw = await readJsonOrNull(path);
    if (!raw) continue;
    const perms = raw.permissions as Record<string, unknown> | undefined;
    if (!perms) continue;
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
