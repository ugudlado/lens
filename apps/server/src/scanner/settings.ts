import { readJsonOrNull, isEditable, settingsLocations } from './utils.js';
import type { SettingsSurface, SettingsFile, ScopedItem } from '@lens/schema';

export async function scanSettings(projectPath: string): Promise<SettingsSurface> {
  const files: SettingsFile[] = [];
  const effective: Record<string, ScopedItem<unknown>> = {};

  for (const { path, scope } of settingsLocations(projectPath)) {
    const raw = await readJsonOrNull(path);
    if (!raw) continue;
    files.push({ scope, filePath: path, editable: isEditable(scope), raw });
    for (const [key, value] of Object.entries(raw)) {
      if (['permissions', 'hooks', 'sandbox'].includes(key)) continue;
      effective[key] = { value, scope, filePath: path, editable: isEditable(scope) };
    }
  }

  return { files, effective };
}
