# Deployment guide

## White-label per client
Set the client's name/colors/logo (`frontend/.env`, `backend/.env`) before building. See README. One deployment per client.

## 0. Prerequisites you must provide
MySQL 8, a private S3-compatible bucket (versioning on, public access blocked, SSE-KMS), SMTP credentials, a ClamAV (clamd) host, a TLS-terminating load balancer/ingress, and a secret store for env values.

## 1. First-time database setup (once, on a dev machine)
```bash
cd backend && cp .env.example .env     # fill DATABASE_URL, DATA_ENCRYPTION_KEY
npm install
npx prisma migrate dev --name init     # creates prisma/migrations -> COMMIT this folder
npm run seed                           # first Admin + sample departments (change the password)
```

## 2. Run the checks
```bash
# API must be running (EMAIL_DRIVER=console so invite links are returned) with the seeded admin
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm test        # unit + integration (isolation, documents, CSRF, transfer)
npm audit --omit=dev
```

## 3. Local full-stack demo (real ClamAV)
```bash
cp .env.compose.example .env      # set passwords and DATA_ENCRYPTION_KEY
docker compose up --build         # http://localhost:8080
```

## 4. Production
Set (via your secret store, never committed): `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_ORIGIN=https://...`, `DATA_ENCRYPTION_KEY` (unwrapped from KMS), `STORAGE_DRIVER=s3`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`, `SCAN_DRIVER=clamav`, `CLAMAV_HOST`, `EMAIL_DRIVER=smtp`, `SMTP_URL`, `EMAIL_FROM`.
The API refuses to start if any dev-only setting is used in production.
Build images from `backend/Dockerfile` and `frontend/Dockerfile`; the web container proxies `/api` to the API. Terminate HTTPS at the load balancer and add HSTS there.
Create the first Admin with `npm run seed` (one time), then change the password. Consider enabling MFA (`REQUIRE_ADMIN_MFA=true`) for production.

## 5. After every deploy
`./ops/smoke.sh https://your-domain`

## 6. Backups
Schedule `ops/backup.sh` (DB) and enable bucket versioning/replication (documents). Run `ops/restore-check.sh <backup>` monthly and record the result.

## 7. Go-live gate (from the spec)
Do not load real employee data until: integration tests pass on your infrastructure, a penetration test has no open high/critical findings, KMS key handling is wired, monitoring alerts exist, and the restore drill has passed. See `SECURITY.md`.
