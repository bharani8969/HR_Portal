import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { decryptBytes } from "./encryptionService.js";

// Private object storage. Objects are immutable (never overwritten) and never exposed by URL:
// downloads are streamed through the API after a fresh authorization check.
let s3;
async function client() {
  if (!s3) {
    const m = await import("@aws-sdk/client-s3");
    const c = new m.S3Client({
      region: env.OBJECT_STORAGE_REGION || "auto",
      ...(env.OBJECT_STORAGE_ENDPOINT && { endpoint: env.OBJECT_STORAGE_ENDPOINT, forcePathStyle: true }),
      ...(env.OBJECT_STORAGE_ACCESS_KEY_ID && env.OBJECT_STORAGE_SECRET_ACCESS_KEY && { credentials: { accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY } }),
    });
    s3 = { m, c };
  }
  return s3;
}
const local = (key) => {
  const base = path.resolve(env.STORAGE_LOCAL_DIR);
  const p = path.resolve(base, key);
  if (!p.startsWith(base + path.sep)) throw new Error("Invalid storage key");
  return p;
};

// STORAGE_DRIVER=db keeps each file (AES-256-GCM encrypted) in the document_blobs table.
// It is written inside the same database transaction as the version row (see documents.routes.js), so putObject is not used.
export const storesInDatabase = () => env.STORAGE_DRIVER === "db";

export async function putObject(key, buf) {
  if (env.STORAGE_DRIVER === "db") throw new Error("db driver stores files inside the database transaction");
  if (env.STORAGE_DRIVER === "s3") {
    const { m, c } = await client();
    // Real AWS: encrypt with KMS by default. R2/B2 already encrypt at rest and reject the header, so it is off when an endpoint is set.
    const sse = env.OBJECT_STORAGE_SSE ?? (env.OBJECT_STORAGE_ENDPOINT ? "none" : "aws:kms");
    await c.send(new m.PutObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key, Body: buf, ...(sse !== "none" && { ServerSideEncryption: sse }) }));
  } else {
    const p = local(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, buf, { flag: "wx" }); // fails if it exists: no overwrite
  }
}
export async function getObject(key) {
  if (key.startsWith("db:")) {
    const row = await prisma.documentBlob.findUnique({ where: { versionId: key.slice(3) } });
    if (!row) throw new Error("File content missing");
    return decryptBytes(Buffer.from(row.data));
  }
  if (env.STORAGE_DRIVER === "s3") {
    const { m, c } = await client();
    const r = await c.send(new m.GetObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key }));
    return Buffer.from(await r.Body.transformToByteArray());
  }
  return fs.readFile(local(key));
}
