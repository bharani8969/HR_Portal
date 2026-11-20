# PeopleVault Security Status (built by TREZION Technology)

Maps the specification's security requirements to what is implemented. **Done** = implemented and covered by code/tests in this repo.
**Config** = code is ready, needs your infrastructure. **Open** = not done; needs a decision, a service, or a human review.

| Requirement | Status | Where / notes |
|---|---|---|
| Server-side sessions, HttpOnly + SameSite=Strict cookie, idle + absolute timeout, revoke on logout / password change / deactivation | Done | `middleware/authenticate.js`, `auth.routes.js` |
| Passwords hashed with Argon2id, 12+ chars, generic login errors, timing-equalised | Done | `auth.routes.js` |
| Login / MFA / reset rate limiting | Done | `express-rate-limit`, 10 per 15 min per IP |
| CSRF (strict Origin check + double-submit token) | Done | `middleware/csrf.js`, integration test |
| MFA (TOTP) | Done, **optional by client decision** | Off by default so Admin signs in with email + password. Users can enable it; `REQUIRE_ADMIN_MFA=true` forces it for Admins. **Recommended for production** (a single password protects all employee records) |
| Password reset and HR invitation (single-use, hashed, expiring tokens) | Done | `tokens.js`; email via SMTP (**Config**) |
| Role authorization from the session, never the request | Done | `authorize.js` |
| HR can only access own employees/documents (IDOR) | Done | Ownership inside every DB query; `tests/integration/isolation.test.js`, `documents.test.js` |
| Client cannot set owner/creator | Done | zod strips unknown keys; spoof test |
| Admin has no access to sensitive values or documents | Done | no such endpoints; test asserts 403 |
| Sensitive fields encrypted (AES-256-GCM), masked by default, audited reveal | Done | `encryptionService.js`; tamper test |
| Key management through cloud KMS with rotation | **Config / Open** | Key is read from env (`DATA_ENCRYPTION_KEY`). `key_version` column exists; wire your KMS and a re-encrypt job before production |
| Upload allow-list, size limit, magic-byte validation, safe names | Done | `utils/files.js`, unit + integration tests |
| Malware scan; files unavailable until CLEAN; infected/failed never stored or served | Done | ClamAV over TCP; **Config**: run clamd (`docker-compose.yml`). `dev` driver (EICAR only) is blocked in production |
| Private immutable storage, no public URLs, authorized streaming download | Done / **Config** | S3 adapter with KMS encryption; create a private bucket with versioning + public access blocked |
| Document versioning, soft delete, history retained | Done | |
| Audit log of logins, admin actions, transfers, reveal, upload/download, infected uploads | Done | no sensitive values in logs |
| Transfer atomic (reassign + history + audit) | Done | single DB transaction |
| Security headers (API: Helmet; SPA: nginx CSP, nosniff, frame deny) | Done | HSTS must be set at your TLS terminator |
| Production safety guard (refuses dev storage/scan/email, requires https origin) | Done | `config/env.js`, verified |
| Dependency vulnerability scan | Done at build time | `npm audit`: 0 vulnerabilities (backend + frontend) on the delivery date. Re-run in CI weekly |
| Backups + restore drill | Done / **Config** | `ops/backup.sh`, `ops/restore-check.sh`; schedule them and back up the object bucket |
| Monitoring and alerting (spikes in failed logins, infected uploads, bulk downloads) | **Open** | Events are in `audit_logs`; connect a log shipper and alert rules |
| Penetration test / independent security review | **Open** | Must be done by a person against your deployed environment before real data |
| Legal/privacy review (consent, retention, deletion policy, data location) | **Open** | Business/legal decision |
| Replay protection for TOTP codes, account lockout after N failures, per-account (not only per-IP) throttling | **Open (recommended)** | Small additions; ask if you want them |

## Document storage options
`STORAGE_DRIVER=db` stores each file AES-256-GCM encrypted (same key as the sensitive fields, random nonce per file, authenticated) in `document_blobs`, written in the same transaction as its record; database dumps therefore contain only ciphertext. `s3` stores in a private bucket (KMS/provider encryption); `local` is for development only. The database key is not in the database, but it is in the app environment: protect it and keep a copy (loss = documents unreadable).

## Free-tier deployment (pilot only)
`DEPLOY-FREE.md` runs with `SCAN_DRIVER=dev` (only the EICAR test string is detected), no automated backups, and provider SLAs of none. Do not load real employee data there. Before real data: a paid always-on host, ClamAV (or another scanner), automated database and bucket backups, SMTP, `NODE_ENV=production` (which enforces these), MFA for Admin, and the review items above.

## Public contact form
`POST /api/v1/support/concern` is intentionally public (the login page has it). Controls: fixed server-side recipient (cannot be used as a mail relay), strict validation, 5 messages / 15 min / IP rate limit, newline stripping in the subject, message stored in the database before any email is attempted. Review the stored requests periodically; add CAPTCHA if abuse appears.

## Added in this revision
Admin-managed departments, designations and custom fields (server-validated); soft delete of HR users (blocked while they own employees) and employees, with confirmation popups; per-field validation messages; multiple concurrent sessions (login never revokes other sessions; password change and deactivate/delete do); session limits raised to 8 h absolute / 60 min idle.

## Assumptions made where the spec left decisions open (change in code if wrong)
- Required to submit an employee: DOB, gender, mobile, joining date, department, designation, employment type.
- Eight standard document categories are required for "documents complete"; additional documents are optional and unlimited.
- HR may archive own employees; archive is a soft delete.
- Any assigned HR may reveal that employee's sensitive values (audited). No separate field permission yet.
- Admin cannot view documents or sensitive values (stricter than the spec's optional exception).

## What was verified here
Unit tests (9) pass: TOTP vectors, magic-byte validation, AES-GCM round trip/tamper, EICAR detection. The frontend builds. All backend files pass syntax checks. `npm audit` clean.
**Not verified here** (no MySQL, Docker or Prisma engine in the build environment): the integration tests, Prisma migration, container images, and real ClamAV/S3/SMTP behavior. Run `npm test` against a real database before trusting any of it.
