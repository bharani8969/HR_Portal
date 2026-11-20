import express from "express";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";

// Single-service deployment: the API also serves the built React app and its white-label settings.
// In development (no public/index.html) only /brand.js is mounted; Vite serves the UI.
export function mountFrontend(app) {
  const brandRoute = (_req, res) => {
    const brand = { clientName: env.CLIENT_NAME, appName: env.APP_NAME, tagline: env.APP_TAGLINE, poweredBy: env.POWERED_BY, primary: env.BRAND_PRIMARY, accent: env.BRAND_ACCENT, dark: env.BRAND_DARK, logoUrl: env.CLIENT_LOGO_URL };
    res.set({ "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" }).send(`window.__BRAND__=${JSON.stringify(brand)};`);
  };
  app.get("/brand.js", brandRoute); // always available (also in development through the Vite proxy)
  const dir = path.resolve(process.cwd(), env.STATIC_DIR);
  if (!fs.existsSync(path.join(dir, "index.html"))) return false;

  app.use(express.static(dir, { index: false, maxAge: "1y", setHeaders: (res, file) => { if (file.endsWith(".html")) res.set("Cache-Control", "no-cache"); } }));
  // Single-page app fallback for every non-API GET (client-side routes like /employees)
  app.get(/^(?!\/api\/).*/, (_req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(dir, "index.html")));
  return true;
}
