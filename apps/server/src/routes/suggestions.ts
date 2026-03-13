import { Hono } from "hono";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { scanConfig } from "../scanner/index.js";
import { detectProjectRoot } from "../scanner/utils.js";
import { getSuggestions } from "../suggestions/index.js";
import { fixHandlers } from "../suggestions/fix-handlers.js";
import type { ConfigUpdateResponse } from "@lens/schema";

const app = new Hono();

app.get("/", async (c) => {
  const projectPath = c.req.query("project") ?? detectProjectRoot();
  try {
    const config = await scanConfig(projectPath);
    const suggestions = getSuggestions(config);
    return c.json({ suggestions, scannedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[suggestions] scan failed:", err);
    return c.json({ error: "scan failed" }, 500);
  }
});

app.post("/:id/fix", async (c) => {
  const id = c.req.param("id");
  const handler = fixHandlers.get(id);
  if (!handler) {
    return c.json<ConfigUpdateResponse>(
      { success: false, error: "Unknown suggestion ID" },
      400,
    );
  }

  const projectPath = c.req.query("project") ?? detectProjectRoot();
  const abs = resolve(projectPath);
  let realHome: string;
  try {
    realHome = realpathSync(homedir());
  } catch {
    realHome = homedir();
  }
  if (!abs.startsWith(realHome + "/") && abs !== realHome) {
    return c.json<ConfigUpdateResponse>(
      { success: false, error: "Path not allowed" },
      403,
    );
  }

  try {
    await handler(abs);
    return c.json<ConfigUpdateResponse>({ success: true });
  } catch (err) {
    return c.json<ConfigUpdateResponse>(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});

export default app;
