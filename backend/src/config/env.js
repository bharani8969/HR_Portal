import "dotenv/config";
import { z } from "zod";

const bool = z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? false : v === "true")); // default: off (optional MFA can still be enabled by users)
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  // One origin, or several separated by commas (e.g. http://localhost:5173,http://127.0.0.1:5173)
  FRONTEND_ORIGIN: z.string().min(1).refine((v) => v.split(",").every((o) => { try { new URL(o.trim()); return true; } catch { return false; } }), "must be one or more URLs"),
  APP_BASE_URL: z.string().url().optional(),
  // White-label branding (per client deployment)
  CLIENT_NAME: z.string().min(1).default("HRS Tech"),
  APP_NAME: z.string().min(1).default("PeopleVault"),
  POWERED_BY: z.string().min(1).default("TREZION Technology"),
  CONCERN_TO_EMAIL: z.string().email().default("bharani7576@gmail.com"), // where the "Powered by" contact form is delivered
  // Runtime branding (served to the browser as /brand.js) so one build can serve any client
  APP_TAGLINE: z.string().min(1).default("Employee Records, Securely Kept"),
  BRAND_PRIMARY: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2F6BFF"),
  BRAND_ACCENT: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#18D5C8"),
  BRAND_DARK: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0B1F4B"),
  CLIENT_LOGO_URL: z.string().default("").refine((v) => v === "" || v.startsWith("/") || v.startsWith("data:image/"), "must be a same-site path like /client-logo.svg"),
  STATIC_DIR: z.string().default("public"), // built React app, served by the API when present (single-service deployments)
  COOKIE_SECURE: z.enum(["true", "false"]).optional(), // default: true in production. Set true whenever the site is served over HTTPS
  SESSION_COOKIE_NAME: z.string().default("hrms_session"),
  SESSION_TTL_MINUTES: z.coerce.number().default(480),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(60),
  DATA_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64"),
  REQUIRE_ADMIN_MFA: bool,
  STORAGE_DRIVER: z.enum(["local", "s3", "db"]).default("local"), // db = encrypted inside the SQL database
  STORAGE_LOCAL_DIR: z.string().default("./storage-private"),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().optional(),
  // S3-compatible providers (Cloudflare R2, Backblaze B2, MinIO): set an endpoint + keys. Leave empty for AWS S3 with IAM roles.
  OBJECT_STORAGE_ENDPOINT: z.string().url().optional().or(z.literal("")),
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SSE: z.enum(["none", "AES256", "aws:kms"]).optional(),
  SCAN_DRIVER: z.enum(["dev", "clamav"]).default("dev"),
  CLAMAV_HOST: z.string().default("127.0.0.1"),
  CLAMAV_PORT: z.coerce.number().default(3310),
  MAX_FILE_MB: z.coerce.number().default(5),
  EMAIL_DRIVER: z.enum(["console", "smtp"]).default("console"),
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default("PeopleVault <no-reply@example.com>"),
}).superRefine((e, ctx) => {
  if (e.NODE_ENV !== "production") return;
  const need = (c, message) => { if (!c) ctx.addIssue({ code: "custom", message }); };
  need(e.STORAGE_DRIVER === "db" || (e.STORAGE_DRIVER === "s3" && !!e.OBJECT_STORAGE_BUCKET), "production requires STORAGE_DRIVER=db, or s3 with OBJECT_STORAGE_BUCKET");
  need(e.SCAN_DRIVER === "clamav", "production requires SCAN_DRIVER=clamav");
  need(e.EMAIL_DRIVER === "smtp" && !!e.SMTP_URL, "production requires EMAIL_DRIVER=smtp and SMTP_URL");
  need(e.FRONTEND_ORIGIN.split(",").every((o) => o.trim().startsWith("https://")), "FRONTEND_ORIGIN must be https in production");
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; "));
  process.exit(1);
}
const ORIGINS = parsed.data.FRONTEND_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, ""));
export const env = {
  ...parsed.data, ORIGINS, APP_BASE_URL: parsed.data.APP_BASE_URL ?? ORIGINS[0],
  COOKIE_SECURE: parsed.data.COOKIE_SECURE === undefined ? parsed.data.NODE_ENV === "production" : parsed.data.COOKIE_SECURE === "true",
};
