import { join } from "node:path";
import { readdir } from "node:fs/promises";
import matter from "gray-matter";
import { readFileOrNull, GLOBAL_DIR } from "./utils.js";
import type { PluginPath } from "./utils.js";
import { ConfigScope, EntrySource } from "@lens/schema";
import type { SkillsSurface, SkillEntry } from "@lens/schema";

export async function scanSkills(
  projectPath: string,
  pluginPaths: PluginPath[] = [],
): Promise<SkillsSurface> {
  const skills: SkillEntry[] = [];
  await discoverSkills(
    join(projectPath, ".claude", "skills"),
    ConfigScope.Project,
    EntrySource.Project,
  );
  await discoverSkills(
    join(GLOBAL_DIR, "skills"),
    ConfigScope.Global,
    EntrySource.Global,
  );

  for (const plugin of pluginPaths) {
    await discoverSkills(
      join(plugin.installPath, "skills"),
      ConfigScope.Global,
      EntrySource.Plugin,
      plugin.name,
    );
  }

  // Deduplicate by name: project > global > plugin
  const sourceRank = (source: EntrySource) =>
    source === EntrySource.Project ? 0 : source === EntrySource.Global ? 1 : 2;
  const seen = new Map<string, SkillEntry>();
  for (const skill of skills) {
    const existing = seen.get(skill.name);
    if (!existing || sourceRank(skill.source) < sourceRank(existing.source)) {
      seen.set(skill.name, skill);
    }
  }

  return { skills: [...seen.values()] };

  async function discoverSkills(
    dir: string,
    scope: ConfigScope,
    source: EntrySource,
    pluginName?: string,
  ) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillFile = join(dir, entry.name, "SKILL.md");
        const content = await readFileOrNull(skillFile);
        if (!content) continue;
        const { data } = matter(content);
        skills.push({
          name: (data.name as string) || entry.name,
          description: (data.description as string) || "",
          scope,
          filePath: skillFile,
          source,
          pluginName,
          userInvocable: data["user-invocable"] !== false,
          allowedTools: data["allowed-tools"]
            ? String(data["allowed-tools"])
                .split(",")
                .map((s: string) => s.trim())
            : undefined,
          model: data.model as string | undefined,
          hasHooks: !!data.hooks,
        });
      }
    } catch {
      /* directory doesn't exist */
    }
  }
}
