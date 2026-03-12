import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { ConfigScope, PluginScope } from "@lens/schema";
import type { ExportData, ExportSections } from "@lens/schema";
import { scanConfig } from "../scanner/index.js";

const app = new Hono();

app.get("/", async (c) => {
  const sectionsParam = c.req.query("sections") ?? "";
  const projectOverride = c.req.query("project");

  try {
    let projectPath: string;
    if (projectOverride) {
      const abs = resolve(projectOverride);
      let realHome: string;
      try {
        realHome = realpathSync(homedir());
      } catch {
        realHome = homedir();
      }
      const isAllowed = abs.startsWith(realHome + "/") || abs === realHome;
      if (!isAllowed) {
        return c.json({ error: "Path not allowed" }, 403);
      }
      projectPath = abs;
    } else {
      projectPath = process.cwd();
    }

    const config = await scanConfig(projectPath);

    const VALID_SECTIONS = new Set([
      "mcp",
      "hooks",
      "skills",
      "agents",
      "rules",
      "commands",
      "permissions",
      "claudeMd",
      "plugins",
    ]);
    const requestedSections = sectionsParam
      ? sectionsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => VALID_SECTIONS.has(s))
      : [...VALID_SECTIONS];

    const sections: ExportSections = {};

    if (requestedSections.includes("mcp")) {
      sections.mcpServers = config.mcp.servers
        .filter((s) => s.scope === ConfigScope.Project)
        .map((s) => ({
          name: s.name,
          type: s.type,
          ...(s.command !== undefined ? { command: s.command } : {}),
          ...(s.args !== undefined ? { args: s.args } : {}),
          ...(s.url !== undefined ? { url: s.url } : {}),
          ...(s.env !== undefined ? { env: s.env } : {}),
        }));
    }

    if (requestedSections.includes("hooks")) {
      sections.hooks = config.hooks.hooks
        .filter((h) => h.scope === ConfigScope.Project)
        .map((h) => ({
          event: h.event,
          type: h.type,
          ...(h.command !== undefined ? { command: h.command } : {}),
          ...(h.prompt !== undefined ? { prompt: h.prompt } : {}),
          ...(h.matcher !== undefined ? { matcher: h.matcher } : {}),
          ...(h.timeout !== undefined ? { timeout: h.timeout } : {}),
        }));
    }

    if (requestedSections.includes("skills")) {
      sections.skills = await Promise.all(
        config.skills.skills
          .filter((s) => s.scope === ConfigScope.Project)
          .map(async (s) => {
            let content = "";
            try {
              content = await readFile(s.filePath, "utf-8");
            } catch {
              /* skip */
            }
            return { name: s.name, content };
          }),
      );
    }

    if (requestedSections.includes("agents")) {
      sections.agents = await Promise.all(
        config.agents.agents
          .filter((a) => a.scope === ConfigScope.Project)
          .map(async (a) => {
            let content = "";
            try {
              content = await readFile(a.filePath, "utf-8");
            } catch {
              /* skip */
            }
            return { name: a.name, content };
          }),
      );
    }

    if (requestedSections.includes("rules")) {
      sections.rules = config.rules.rules
        .filter((r) => r.scope === ConfigScope.Project)
        .map((r) => {
          const ext = r.filePath.endsWith(".mdc") ? "mdc" : "md";
          return { name: r.name, content: r.content, ext: ext };
        });
    }

    if (requestedSections.includes("commands")) {
      sections.commands = config.commands.commands
        .filter((c) => c.scope === ConfigScope.Project)
        .map((c) => ({ name: c.name, content: c.content }));
    }

    if (requestedSections.includes("permissions")) {
      sections.permissions = config.permissions.rules
        .filter((p) => p.scope === ConfigScope.Project)
        .map((p) => ({ type: p.type, rule: p.rule }));
    }

    if (requestedSections.includes("claudeMd")) {
      sections.claudeMd = config.claudeMd.files
        .filter((f) => f.scope === ConfigScope.Project)
        .map((f) => ({
          slot: f.filePath.includes("/.claude/CLAUDE.md")
            ? ".claude/CLAUDE.md"
            : "root",
          content: f.content,
        }));
    }

    if (requestedSections.includes("plugins")) {
      sections.plugins = config.plugins.plugins
        .filter((p) => p.scope === PluginScope.Project)
        .map((p) => ({
          name: p.name,
          marketplace: p.marketplace,
          enabled: p.enabled,
        }));
    }

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projectPath: config.projectPath,
      sections,
    };

    return c.json(exportData);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      500,
    );
  }
});

export default app;
