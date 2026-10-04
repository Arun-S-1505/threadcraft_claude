# Deploying ThreadCraft on Cloudflare (free tier)

## How it is set up
**One Cloudflare Worker named `threadcraft-claude` serves everything** at `https://www.threadcraft.company`:
- the website (the built files in `dist/`, served as static assets, free and unlimited), and
- the API (`/api/*`, the Hono code in `worker/src`).

Because both live on one address there is no cross-site setup: the browser, checkout and the admin login are all same-origin.

| Piece | Service | Where |
| --- | --- | --- |
| Site + API | Cloudflare Worker with static assets | `wrangler.toml` (project root) |
| Orders, designs, statuses | D1 database `threadcraft` | `worker/schema.sql` |
| Uploads, previews, backups | R2 bucket `threadcraft-files` (private) | binding `FILES` |
| Emails | Resend | secret `RESEND_API_KEY` |
| Payments | Razorpay hosted checkout | secrets below |
| Owner login | Cloudflare Access | protects `/admin*` and `/api/admin*` |

## Automatic deploys
The Cloudflare project `threadcraft-claude` is connected to the GitHub repo. Every `git push` to `main` runs:
- build command: `npm run build`
- deploy command: `npx wrangler deploy`

The Worker name in `wrangler.toml` must stay equal to the project name in the dashboard. Do not add a `_redirects` file with `/* /index.html 200`; Cloudflare rejects it as a loop. The single-page-app fallback is already set in `wrangler.toml`.

## Settings (`wrangler.toml`)
- `ALLOWED_ORIGIN`, `FROM_EMAIL`, `ADMIN_EMAILS`: already set for `threadcraft.company`.
- `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`: fill in after creating the Access app (below), then commit and push.
- `RAZORPAY_KEY_ID`: add under `[vars]` (the public id, safe to commit).

## Secrets (never commit these; type them in your own terminal)
```bash
npx wrangler secret put RESEND_API_KEY --name threadcraft-claude
npx wrangler secret put RAZORPAY_KEY_SECRET --name threadcraft-claude
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET --name threadcraft-claude
```
Never set `DEV_ADMIN_EMAIL` in production: it bypasses the admin login and exists only in `worker/.dev.vars`.

## Cloudflare Access (owner-only admin)
Zero Trust, then Access, then Applications, then add a self-hosted app covering **both** `www.threadcraft.company/admin*` and `www.threadcraft.company/api/admin*`, allowing only the owner email. Copy the application's AUD tag into `ACCESS_AUD` and your `<team>.cloudflareaccess.com` into `ACCESS_TEAM_DOMAIN`. The Worker re-checks the signed Access token and `ADMIN_EMAILS` on every admin request, so the page being hidden is never the protection.

## Sign in with Google (optional, free)
Customers can sign in with one tap. You create a Google "OAuth client" once; only its public client id is used, so there is no secret to store.
1. Go to https://console.cloud.google.com and create a project named "ThreadCraft".
2. **APIs & Services**, then **OAuth consent screen** (also called "Google Auth Platform"). Choose **External**. App name `ThreadCraft`, your support email, and your email as developer contact. Scopes: only the default ones (email, profile, openid). Add your domain `threadcraft.company` under authorized domains, plus links to your privacy and terms pages (`https://www.threadcraft.company/policies/privacy` and `/terms`).
3. **Publish the app** (button "Publish app" / set to "In production"). While it says "Testing", only 100 hand-picked test emails can sign in. Basic email/profile sign-in needs no Google review.
4. **Credentials**, then **Create credentials**, then **OAuth client ID**, type **Web application**. Under **Authorized JavaScript origins** add `https://www.threadcraft.company` (and `http://localhost:5173` if you want to test locally). Leave "Authorized redirect URIs" empty.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`; it is public) into `wrangler.toml` as `GOOGLE_CLIENT_ID`, commit and push.
6. Note: Google refuses sign-in inside Instagram's and Facebook's built-in browsers. The site hides the Google button there and offers email and password instead.

## Resend
Verify `threadcraft.company` in Resend. Add the DNS records it shows in Cloudflare DNS, each set to **DNS only** (grey cloud). Create an API key with Sending access and store it with the command above.

## Razorpay
1. Start in **test mode**: test key id in `wrangler.toml`, test key secret via `wrangler secret put`.
2. In the Razorpay dashboard add a webhook: `https://www.threadcraft.company/api/webhooks/razorpay`, events `payment.captured` and `payment.failed`, with your own secret (the same value as `RAZORPAY_WEBHOOK_SECRET`).
3. An order is marked paid **only** by that signed webhook, and only if the captured amount equals the price the server computed.
4. Switch to live keys after a full test pass. Until Razorpay is configured, the shop offers cash on delivery only.

## Database changes (run BEFORE pushing code that needs new tables)
Cloudflare's automatic deploy updates the code but never the database. When `worker/schema.sql` gains tables or columns, apply it first, then push.
```bash
cd worker && npm run db:remote   # re-applies schema.sql (safe: uses IF NOT EXISTS)
```

## Backups
A monthly cron saves last month's orders and messages to R2 under `backups/YYYY-MM/`. In `/admin` you can also export CSV or JSON for any month, or run the backup on demand. D1 also has its own point-in-time restore.

## Before going live
- Real prices: `src/data/products.js` (shop) and `shared/designSpec.js` (studio). The Worker reads both, so the displayed price is the charged price.
- Real contact details, social links and policies in `src/config/site.js`; real product photos.
- Test on a real phone end to end: studio order, shop order, contact, bulk, track order, admin.
- Optional: send `threadcraft.company` (without www) to the www address with a Cloudflare Redirect Rule.

## Local development on this PC
`wrangler dev` cannot run on this machine (Windows Application Control blocks `workerd.exe`). Use the Node runner:
```bash
cd worker && npm run dev:node     # API on http://localhost:8787 (in-memory data, you are signed in as admin)
npm run dev                       # site on http://localhost:5173, /api is proxied to the API
cd worker && npm run smoke        # automated API checks
```
