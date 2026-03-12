import { Hono } from "hono";
import { scanConfig } from "../scanner/index.js";
import { detectProjectRoot } from "../scanner/utils.js";
import { getSuggestions } from "../suggestions/index.js";

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

export default app;
