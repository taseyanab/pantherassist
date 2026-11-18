# PantherAssist (Vercel deployment)

A student research prototype of a GSU staff AI assistant with a built in overseer. It uses demo accounts and fictional records only.

## What is in this folder

| Path | Purpose |
|---|---|
| `index.html` | Page layout and styles (no inline scripts) |
| `lib/app.js` | The app: screens, assistants, overseer, knowledge base |
| `lib/purify.min.js` | DOMPurify 3.2.6 (Cure53), used to sanitize every HTML insert |
| `lib/shim.js` | Connects the app to the AI function below |
| `api/sample.js` | Server function that calls the Anthropic API; the API key stays on the server |
| `api/health.js` | Tells the app whether Live AI is turned on |
| `vercel.json` | Security headers and function settings |

## Deploy

1. Unzip this folder.
2. In Vercel, choose **Add New > Project**, then either import it from a GitHub repo or drag the folder in with the Vercel CLI (`npx vercel` from inside the folder).
3. Framework preset: **Other**. No build command. Output directory: leave blank.
4. Deploy.

## Deploy on Netlify

This same folder works on Netlify. `netlify.toml`, `_redirects` and `_headers` are included.

* **Recommended (Git or Netlify CLI):** connect the folder through GitHub, or run `netlify deploy --prod` inside it. Netlify then runs the server code as a function (`netlify/functions/api.js`), so sign in, the server overseer and Live AI work exactly as on Vercel.
* **Drag and drop (Netlify Drop):** Netlify does not deploy functions this way, so the app runs in browser demo mode: the password 123 fills in automatically and sign in works, but checks run only in the browser and Live AI is off.

Either way, server source files, tests and docs are blocked (404) and never served to visitors.

## Settings

The zip works with **no settings**: every demo account uses the password **123**, and sessions are signed with a random secret generated when the zip was built.

Before sharing the code or using it beyond a demo, set these under **Settings > Environment Variables** and redeploy:

* `SESSION_SECRET`: at least 32 random characters. Replaces the built in secret (anyone with this zip could otherwise sign session cookies). Never commit this zip's `api/_lib/fallback_secret.js` to a public repository.
* `DEMO_PASSWORD`: replaces the demo password 123.

## Turn on Live AI (optional)

1. In the project, open **Settings > Environment Variables**.
2. Add `ANTHROPIC_API_KEY` with your key from console.anthropic.com.
3. Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`) and `ANTHROPIC_MODEL_QUICK` (default `claude-haiku-4-5`, used by the guardrail models). `SERVER_GUARD=off` turns off the server guardrail model (not recommended).
4. Redeploy. The chat badge changes from \"Answers from GSU sources\" to \"Live AI\".

If you serve the site from a custom domain and Live AI returns errors, set `ALLOWED_ORIGIN` to the full site address, for example `https://pantherassist.example.com`.

## Connect GSU systems (optional, set up with GSU IT)

| Feature | Environment variables | What it does |
|---|---|---|
| GSU single sign on | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` (`https://<site>/api/sso-callback`) | Adds **Sign in with GSU single sign on**. Uses OpenID Connect with PKCE, verifies the ID token signature, issuer, audience, nonce and expiry, then maps the user to the directory. GSU's identity provider enforces Duo. |
| Security alerts | `SECURITY_WEBHOOK_URL` (Teams or Slack incoming webhook) | Cases at or above the alert severity (Admin settings, default 3) post an alert with the case label, severity and routing. Never what the person typed. |
| Help desk tickets | `TICKET_WEBHOOK_URL`, `TICKET_HOSTS` (allow list), optional `TICKET_TOKEN` | Creating or withdrawing a ticket in the app opens or withdraws it in the help desk system. Summaries are masked. |

The overseer now also runs on the server: `/api/review` checks every message with the same rules the browser uses (generated from the app by `build.py` into `api/_lib/policy.js`), and `/api/sample` checks every AI reply before and while it streams. A modified browser cannot skip these checks.

## Run the security tests

`npm test` runs the website scan and the 60 server attacks against a local copy (see `test/`). The GitHub workflow in `.github/workflows/security.yml` runs them on every push, so a change cannot quietly reopen an old hole.

## Keep it private (recommended)

Turn on **Settings > Deployment Protection** (Vercel Authentication or Password Protection) so only people you invite can open it. This keeps strangers from using your API credits and keeps the demo sign in page off the open web (risk R03 in the risk assessment).

## Demo accounts

The demo accounts use the password you set in `DEMO_PASSWORD`, and the sign in screen shows it under **Demo accounts** so testers can sign in with one tap. It only unlocks fictional demo accounts. To hide it (for example on a public link), set `DEMO_HIDE_PASSWORD=1`. Because anyone who can open the site can then sign in, keep Deployment Protection on if Live AI is enabled. The overseer view and the Management page only appear for the security analyst (trobinson3) and the manager (kharris4). Never enter a real GSU password.

## Differences from the Claude artifact version

* Issues, cases and the audit log are stored in each browser instead of a shared database, so the security team view only shows that device's activity.
* The server limits each visitor to 30 AI requests per 5 minutes and caps prompt size.

## Web security controls

| Threat | Control in this build |
|---|---|
| HTML injection and XSS (stored, reflected, DOM) | Every value is escaped with `esc()`; every `innerHTML` insert also runs through DOMPurify with a strict allowlist (no scripts, frames, forms, style blocks, event handlers, or `javascript:` links). Trusted Types are enforced by the CSP, so any HTML that skipped that step is still sanitized by a default DOMPurify policy. The overseer flags markup in staff messages and blocks agent replies that contain it (policy P13). |
| HTML smuggling | No blob or download code in the app. CSP blocks inline and third party scripts, workers, frames and objects. The overseer flags Blob, atob, data URL and long base64 payload patterns (P13). |
| Attacker in the middle and reverse proxy kits | Duo number matching (the push only approves when the number on the real sign in screen is tapped; a wrong tap stops the sign in and is logged). HSTS with preload, `frame-ancestors 'none'`, X-Frame-Options DENY, COOP. Look-alike GSU domains in replies are blocked (P08). Production must use GSU SSO with phishing resistant MFA (Duo Verified Push or FIDO2 passkeys), which binds the sign in to the real gsu.edu origin. |
| ClickFix and paste-to-run scripts | The overseer blocks replies and messages with paste-to-run commands (Win + R and paste, encoded PowerShell, mshta, curl piped to a shell, certutil). Streamed text that looks dangerous is held until it passes review. The Copy button refuses those commands and logs the attempt. Two new training modules cover ClickFix and AiTM phishing. |
| Security headers | CSP (`script-src 'self'`, no inline scripts, Trusted Types, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`), `X-Content-Type-Options: nosniff`, Referrer-Policy no-referrer, CORP and COOP same-origin, Permissions-Policy, and a sandboxed CSP on the API routes. |

Note: `style-src` still allows inline styles because the interface sets style attributes. Inline styles cannot run script.

## AI security controls (OWASP Top 10 for LLM applications)

| Risk | Control |
|---|---|
| Indirect prompt injection | Retrieved notes, case logs and pasted documents are untrusted. Hidden text is stripped (zero-width and bidi characters, Unicode tag characters, HTML comments and tags, markdown images). Items carrying instructions for the AI are withheld before the prompt is built, logged as P01 cases and shown in the overseer as "Retrieved data". Pasted documents are fenced in `<untrusted_document>`. The model has no tools, so nothing it reads can make it delete, send or change anything. |
| Prompt injection and jailbreaks | A dedicated guardrail model judges every message before the primary model is called (in the browser and again on the server in `api/sample.js`, which a modified browser cannot skip). Server rules also catch injection, secrets, ClickFix and script markup. The API only accepts the two prompt shapes the app builds, so it cannot be used as an open model proxy. |
| Insecure output handling (XSS, SSRF) | Replies are shown as text only, checked by the overseer, and any HTML goes through DOMPurify plus Trusted Types. Replies with markup, paste-to-run commands, look-alike links or leaked instructions are withheld. The server only ever calls one fixed Anthropic URL and the app never fetches a URL from a reply. |
| Data leakage | Passwords, keys, SSNs, Panther IDs, emails, phone numbers, card numbers (Luhn checked), birth dates and bank numbers are masked before any model call. The system prompt holds no secrets and carries a random canary marker; a reply that repeats it or quotes the rules is withheld (P10). |
| Excessive agency | The model gets no tools. Actions come only from staff clicks, are limited by role, re-checked at execution, need a confirm click, and high risk actions (posting grades, sending email, uploads) need a fresh Duo approval. Destructive or privileged actions (delete, grant, purchase, shell) are never allowed for any role. |

## Website security checklist

| Area | Status in this build |
|---|---|
| HTTPS and HSTS | Vercel serves every domain over HTTPS with a managed certificate and redirects HTTP. HSTS is set for 2 years with includeSubDomains and preload. |
| Secure cookies | The only cookies are `__Host-pa_pre` (5 minute pre MFA step) and `__Host-pa_session` (8 hours, 30 minute idle timeout). Both are HttpOnly, Secure, SameSite=Strict, Path=/, no Domain, and HMAC signed; tampered cookies are rejected. Sign out clears them. |
| Secrets | No API keys, passwords, hashes or tokens are in the files the browser downloads (checked by `test/scan.js`). Keys live in Vercel environment variables. `.gitignore` and `.vercelignore` exclude `.env` files. |
| Password hashing | Server: scrypt (N=2^17, r=8, p=1, per account salt, constant time compare; unknown IDs pay the same cost). The Claude preview version, which has no server, uses PBKDF2 SHA-256 with 600,000 iterations. Production should use GSU SSO so PantherAssist stores no passwords at all. |
| Default and admin accounts | There is no default admin and no default password: the demo password must be set in Vercel. Admin rights (security analyst, approver) still require the Duo number match. Turn on two factor sign in for the Vercel and GitHub accounts that own this project. |
| Input validation | Every API checks method, content type, origin, allowed fields, types, lengths and formats, and refuses everything else. There is no SQL database, so SQL injection has no target; CampusIDs only accept letters and numbers. |
| Rate limits and WAF | Per IP and per user limits on sign in (10 per 15 minutes), Duo checks (5 per 10 minutes) and AI requests (30 per 5 minutes). Wrong passwords are throttled after 5 tries, but a correct password always proceeds to Duo, so an attacker cannot lock a real user out, and every sign in path runs the password hash so timing never reveals which accounts exist or are throttled. Also turn on Vercel Firewall in the dashboard: Bot Protection, Attack Challenge Mode during an attack, and a rate limit rule for `/api/*`. These function limits are per instance, so the Firewall rule is the global limit. |
| Authorization | `/api/me` only returns the caller's own identity from the signed cookie; there is no ID to change. The AI endpoint requires a session. |
| Error messages | APIs return short generic errors; details go only to the server log. Unknown IDs and wrong passwords get the same message. |
| File uploads | None. The app accepts pasted text only (20,000 characters), handled as untrusted. |
| Dependencies | No npm dependencies. DOMPurify is vendored at 3.4.17, the current release; `npm audit` reports 0 vulnerabilities. The 3.2.6 copy used before had 16 published advisories and was replaced. Node runtime pinned to 22.x. |
| Production configuration | No debug mode or debug endpoints (`/api/admin`, `/api/debug`, `/.env`, `/.git` and `/api/_lib/*` all return 404). Demo accounts and fictional records are labeled; remove them before real use. |
| Backups | Code: keep this folder in a private GitHub repo; Vercel keeps every deployment and can roll back instantly. Data: this build keeps issues and the audit log in each browser, so there is no server data to back up. A production build should store them in a managed database with automatic daily off site backups. |

Run the security scan against a local or preview deployment with `node test/scan.js` (see the test folder in the project source).
