# Free deployment guide (pilot / demo)

**Stack:** Render free web service (API + website in one) + TiDB Cloud Starter (MySQL-compatible database). Documents are stored **inside the same database**, encrypted, so there is no third service. No card is needed for Render or TiDB.
Free tiers change often. Re-check each provider's pricing page before you rely on it.

> **Use this for demos and pilots with sample data.** The free setup has no malware scanner (only the EICAR test string is caught), no automatic backups, no uptime guarantee, and the server sleeps when idle. Move to paid plans, a real scanner and backups before any real employee data goes in (see SECURITY.md).

## What the free tiers give you
| Part | Provider | Limits to know |
|---|---|---|
| Website + API | Render free web service | 512 MB RAM, sleeps after 15 min idle (about 1 min to wake), 750 h/month (enough for one always-on service) |
| Database | TiDB Cloud Starter | 5 GiB storage and 50M request units per month per instance, scales to zero (first query after idle is slower) |
| Documents | Same database (`STORAGE_DRIVER=db`) | Counts against the 5 GiB database limit; each file is encrypted with AES-256-GCM before it is saved |
| Email | Resend (HTTPS API) | Free: 3,000 emails/month and 100/day. Render's free plan **blocks SMTP**, so Gmail/SMTP cannot be used there |

## 1. Put the code on GitHub
1. Make a **private** repository on github.com.
2. Copy your local `backend\prisma\migrations` folder into this project (if you have one) so the database history is deployed too.
3. In the project root:
   ```powershell
   git init
   git add .
   git commit -m "PeopleVault"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
   `.env` files are ignored by `.gitignore`. Never commit secrets.

## 2. Database: TiDB Cloud Starter
1. Sign up at tidbcloud.com and create a **Starter** cluster (pick the region closest to your Render region).
2. Open **Connect**, generate a password, and note the host, port (4000), and username (it looks like `abc123.root`).
3. Open the SQL editor and run `CREATE DATABASE hrms;`.
4. Build the connection string (URL-encode special characters in the password, `@` becomes `%40`):
   `mysql://USERNAME:PASSWORD@HOST:4000/hrms?sslaccept=strict`

## 3. Documents (nothing to create)
With `STORAGE_DRIVER=db` (already set in `render.yaml`) every uploaded file is encrypted with your `DATA_ENCRYPTION_KEY` and saved in the `document_blobs` table, in the same transaction as its record. Things to know:
- **Size:** keep `MAX_FILE_MB` at 4 or lower. TiDB limits a single row to about 6 MB by default (verify on your cluster). On other MySQL hosts, a "packet too large" error means raising `max_allowed_packet`.
- **Growth:** every replacement keeps the old version, so storage grows. 5 GiB holds roughly 1,000 files of 5 MB, or many thousands of typical small PDFs. Watch the usage in TiDB.
- **Backups:** database dumps now include the documents (bigger and slower, but one thing to back up).
- **Key:** if `DATA_ENCRYPTION_KEY` is lost, the documents cannot be read, exactly like the encrypted Aadhaar/PAN values.
- **Prefer a bucket?** Set `STORAGE_DRIVER=s3` and the `OBJECT_STORAGE_*` variables (Cloudflare R2 or Backblaze B2 work); the app supports both.

## 4. Email with Resend
Render's free plan blocks the SMTP ports, so use Resend's HTTPS API (the app has a built-in Resend driver).
1. Sign up at resend.com. Use the email address you want to receive tests at, for example `bharani7576@gmail.com`.
2. **API Keys → Create API Key** (permission: Sending access). Copy it once.
3. Pick how you will send:
   - **Quick test, no domain:** `EMAIL_FROM` = `onboarding@resend.dev`. Resend only delivers this sender's mail to **the email your Resend account was created with**. Good enough to test concerns sent to that address; invitations and password resets to other people will fail.
   - **Real use:** you need a domain you own (for example `hrportal.com`). In Resend open **Domains → Add Domain**, add the DNS records it shows (SPF, DKIM) at your domain provider, wait until it says *Verified*, then set `EMAIL_FROM` = `HR Portal <no-reply@yourdomain.com>`. After that you can email anyone.
4. In Render **Environment** set `EMAIL_DRIVER=resend`, `RESEND_API_KEY=re_...` and `EMAIL_FROM`.
5. Sign in as Admin, open **Email** in the sidebar, press **Send test**. A failure shows Resend's exact reason, and every attempt appears in the **Delivery log**.
Free limits: 3,000 emails per month and 100 per day; each recipient counts as one email.

## 5. Render
1. Sign up at render.com with GitHub.
2. **New → Blueprint**, choose your repo. Render reads `render.yaml` and asks for the secret values:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the string from step 2 |
   | `FRONTEND_ORIGIN` | `https://<service-name>.onrender.com` (exactly, no trailing slash). If unsure of the final URL, deploy once, then fix it |
   | `DATA_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Keep a copy** |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | your first Admin (password 12+ characters) |
   | `EMAIL_DRIVER` / `RESEND_API_KEY` / `EMAIL_FROM` | `resend` / key from step 4 / sender address (see step 4) |
3. Click **Apply**. The first build takes several minutes.
4. In the service **Logs** you should see: the schema step (`Applying committed migrations...` or `db push`), `Bootstrap: first Admin created`, then `... API for HRS Tech ... on :10000`.
5. If the service name was taken, Render adds a suffix. Copy the real URL, set `FRONTEND_ORIGIN` to it, and save (the service restarts).

Manual alternative (no Blueprint): New → Web Service → connect repo → Language **Docker**, Instance **Free**, then add the same variables by hand.

## 6. First sign-in
1. Open your `https://<name>.onrender.com`, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Change the password under **Security**, then **delete `ADMIN_PASSWORD`** from Render's environment (it is only used to create the first Admin).
3. Set up Departments, Form Fields and HR users as usual.

## 7. Keep it awake (optional)
Create a free monitor at uptimerobot.com (HTTP(s), every 5 minutes) for `https://<name>.onrender.com/api/v1/health`. One always-on service uses about 720 of the 750 free hours. After a deploy or restart, the first request still takes about a minute.

## 8. Updating
`git push` redeploys automatically. For database changes, create a migration locally (`npx prisma migrate dev --name something`), commit `backend/prisma/migrations`, and push. The container runs `prisma migrate deploy` on start. If a first-time `migrate deploy` fails on TiDB, remove the `migrations` folder from the repo once so the first deployment uses `db push`.

## 9. White-label per client
Change `CLIENT_NAME`, `APP_NAME`, `APP_TAGLINE`, `BRAND_PRIMARY/ACCENT/DARK` in Render and save. No rebuild is needed. For a logo, put the file in `frontend/public/`, push, and set `CLIENT_LOGO_URL=/client-logo.svg`. Use one deployment (database, bucket, keys) per client.

## Making it feel fast
The app shows a branded loader (thin top bar after 0.15 s, full-screen loader after 0.4 s for reads and 0.12 s for saves) that blocks clicks while data loads, retries reads automatically while the server wakes up, and never sends the same request twice. That hides waiting; these steps reduce it:
1. **Match regions.** Every page makes several database round trips. If Render is in Oregon and TiDB is in Tokyo, each trip crosses an ocean. In Render open **Settings → Region**. Pick the Render region closest to your TiDB cluster (Singapore for Tokyo). The region cannot be changed later: create a new service in the right region if needed. When creating a TiDB cluster, choose a region near your Render region.
2. **Keep both awake.** The UptimeRobot monitor (step 7) keeps Render running and, because the health check touches the database, keeps TiDB warm too.
3. **Already built in:** gzip compression of all responses (the website bundle shrinks to about a third) and one fewer database write per request.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Login says "Invalid origin" (403) | `FRONTEND_ORIGIN` does not exactly equal the site URL (https, no trailing slash) |
| Login works, then logs out immediately | `COOKIE_SECURE=true` missing, or the site is opened over plain http |
| Build fails on `npm ci` | Commit `package-lock.json` in both `frontend` and `backend` |
| `P1001` / SSL error | Add `?sslaccept=strict` to `DATABASE_URL`; check host, port 4000, and the `xxxx.root` username |
| `migrate deploy` error mentioning locks or unsupported syntax | Delete `backend/prisma/migrations` in the repo once, redeploy (uses `db push`) |
| Uploads fail with 500 or "packet/entry too large" | The file is bigger than the database row limit: lower `MAX_FILE_MB` (try 3), or switch to `STORAGE_DRIVER=s3` |
| Very slow first page | Render woke from sleep; use the UptimeRobot monitor. Check the region match under "Making it feel fast" |
| No invite/reset emails | Open **Admin → Email → Delivery log** for the exact reason. Usually an unverified domain, or `onboarding@resend.dev` used for someone other than your own Resend email. Invitations always give the Admin a copyable link when no email went out |

## Alternative: Oracle Cloud Always Free VM (more power, more work)
As of mid-2026 the free ARM allowance is 2 OCPU / 12 GB; a card is needed to sign up, capacity can be unavailable, and idle instances can be reclaimed. If you get one, the existing `docker-compose.yml` runs everything (MySQL, ClamAV virus scanner, API, website) on one machine with persistent disk; add HTTPS with a reverse proxy such as Caddy and a domain.
