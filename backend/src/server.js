import app from "./app.js";
import { env } from "./config/env.js";
import { ensureAdmin } from "./bootstrap.js";
app.listen(env.PORT, () => console.log(`${env.APP_NAME} API for ${env.CLIENT_NAME} (powered by ${env.POWERED_BY}) on :${env.PORT}`));
ensureAdmin().catch((e) => console.error("Admin bootstrap skipped:", e.message));
