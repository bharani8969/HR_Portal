# PeopleVault HRMS — built by TREZION Technology (white-label)

Employee records (HRMS) built from the *HRMS AI Architecture and Development Specification*.
A white-label product: each client sees **their own logo and name** in the header with **"Powered by TREZION Technology"** beneath it (example client: HRS Tech).
All eight milestones are implemented in code. See `SECURITY.md` for exactly what is verified and what still needs your infrastructure, a security review and business decisions.

## Quick start (development)
```bash
# Backend (MySQL 8 required)
cd backend && cp .env.example .env        # set DATABASE_URL and DATA_ENCRYPTION_KEY (command inside the file)
npm install && npx prisma migrate dev --name init && npm run seed && npm run dev
# Frontend
cd frontend && npm install && npm run dev       # http://localhost:5173
```
First login: the seeded Admin (from `.env`) with email + password only. Two-step (authenticator) login is optional: users can turn it on under **Security**, or set `REQUIRE_ADMIN_MFA=true` to force it for Admins.
Dev email/invite links are printed in the API console (`EMAIL_DRIVER=console`).

## White-labelling for a new client (2 minutes)
1. `frontend/.env` (copy `.env.example`): set `VITE_CLIENT_NAME`, `VITE_APP_NAME`, `VITE_BRAND_PRIMARY`, `VITE_BRAND_ACCENT`, `VITE_BRAND_DARK`. Optional real logo: put the file in `frontend/public/` and set `VITE_CLIENT_LOGO=/client-logo.svg`; otherwise a monogram logo is generated from the client's first letter.
2. `backend/.env`: set `CLIENT_NAME`, `APP_NAME` (used in emails and the authenticator app). `POWERED_BY` stays `TREZION Technology`.
3. Replace `frontend/public/favicon.svg` with the client's icon, then rebuild the frontend (branding is baked in at build time).
Use one deployment (database, bucket, keys) per client so client data stays separate.

## Admin features
Add/rename/delete **departments and designations** (they feed the HR dropdowns), add/edit/remove **custom employee form fields** (text, number, date, dropdown; required or optional), invite/deactivate/**delete HR users**, **delete employees**, transfer employees between HRs. Every delete asks for confirmation first. Deletes are *soft* deletes: records disappear from the app but the audit trail is kept.
Validation problems are shown as helper text under the exact field. After sign-in a welcome screen and banner show the user's name and "Powered by TREZION Technology".

## Free online deployment
See **DEPLOY-FREE.md**: one free Render service (API + website) + TiDB Cloud Starter (database; documents are stored encrypted inside it). Branding is read from server settings at runtime (`/brand.js`), so one build serves any client. This is for demos/pilots, not real employee data.

## Loading experience
Every screen shows a thin progress bar and, if a request takes over 0.4 s, a branded full-screen loader that blocks clicks (so users cannot pile extra load on a slow server), a "server is waking up" message after 7 s, automatic retries for reads, a 90 s timeout and shared identical requests (double-click safe). Directory search stays non-blocking.

## Contact form ("Powered by TREZION Technology")
Clicking "Powered by ..." anywhere (login page, header, sidebar) opens an *Enter your concern* form. It is delivered to `CONCERN_TO_EMAIL` (default `bharani7576@gmail.com`, set on the server, never chosen by the browser) and is also saved in the `support_requests` table so nothing is lost. For real email delivery set in `backend/.env`:
`EMAIL_DRIVER=smtp` and `SMTP_URL=smtps://you%40gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465` (a Gmail *App password*, which needs 2-step verification on that Google account). Without SMTP the message is saved and printed in the API log only.

## Form fields in existing steps
Admin picks a section for each custom field: Personal, Employment, Statutory & Bank (shown inside that existing step) or Additional (its own step). Fields can be reordered inside a section.

## Coming-soon tabs
Attendance, Leave & Time Off, Payroll, Recruitment, Performance and Training appear disabled in the sidebar and dashboards with an "Under development" tooltip. They are placeholders only; nothing is built behind them.

## Multiple logins
Many people (and one person on several devices) can be signed in at the same time. Note: one **browser profile** keeps a single login per address, so signing in as a second user in the same browser replaces the first. To test two users at once, use two different browsers/profiles, an incognito window, or open `http://127.0.0.1:5173` for one user and `http://localhost:5173` for the other.

## What's in it
| Milestone | Contents |
|---|---|
| 1 Foundation | Express app, env validation, full Prisma schema, white-label React UI (client logo + name, "Powered by TREZION Technology"), animations |
| 2 Auth | Argon2id login, server sessions, CSRF, rate limits, optional TOTP MFA, forgot/reset password, role guards |
| 3 Admin | HR invite (email link) / list / edit / activate-deactivate with session revocation, audit log viewer |
| 4 Employees | 4-step form + drafts, directory, concurrency-safe codes, encrypted Aadhaar/PAN/UAN/bank with masking + audited reveal, archive |
| 5 Documents | 8 required categories + unlimited additional, magic-byte validation, ClamAV scan gate, private immutable storage (local dev / S3), versioning, authorized download/preview |
| 6 Transfers & reports | Atomic HR transfer with history + audit, Admin employee overview, employee/document/HR-wise reports |
| 7 Security QA | 9 unit tests (run) + integration tests for cross-HR isolation, documents, CSRF, sessions, transfer; `npm audit` clean; `SECURITY.md` |
| 8 Production | Dockerfiles, nginx with CSP/headers, compose demo with ClamAV, backup/restore-drill/smoke scripts, production env guard, `DEPLOYMENT.md` |

Roles: **Admin** (CEO) sees company aggregates and manages HR and transfers but cannot open sensitive values or documents. **HR** manages only their assigned employees.
