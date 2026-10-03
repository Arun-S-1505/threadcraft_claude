# Deploying ThreadCraft on Cloudflare (free tier)

Everything below needs **your** Cloudflare login and accounts, so it is a checklist for the owner.
Nothing here has been run yet. Check each free-tier limit on Cloudflare's pricing page first.

## 0. What runs where
| Piece | Service | Where in this repo |
| --- | --- | --- |
| Storefront (React) | Cloudflare Pages | repo root, build `npm run build`, output `dist` |
| API | Cloudflare Worker (Hono) | `worker/` |
| Orders, designs, statuses | D1 (SQLite) | `worker/schema.sql` |
| Uploads, previews, backups | R2 (private bucket) | binding `FILES` |
| Emails | Resend | secret `RESEND_API_KEY` |
| Payments | Razorpay hosted checkout | needs your merchant account |
| Owner login | Cloudflare Access | protects `/admin*` and `/api/admin*` |

The storefront calls **relative** `/api/...`. So the Worker must be served on the **same domain** as the site
(a Worker route `yourdomain.com/api/*`). That also makes the Access login cookie work for the admin screens.

## 1. One-time setup (in `worker/`)
```bash
npm install
npx wrangler login
npx wrangler d1 create threadcraft          # copy the database_id into wrangler.toml
npx wrangler r2 bucket create threadcraft-files
npm run db:remote                            # creates the tables
```
Keep the R2 bucket **private** (do not enable public access or a public domain for it).

## 2. Settings in `worker/wrangler.toml`
- `ALLOWED_ORIGIN` = your site, e.g. `https://threadcraft.in`
- `FROM_EMAIL` = an address on a domain you verified in Resend
- `ADMIN_EMAILS` = the owner email(s) allowed into the admin
- `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` = from the Cloudflare Access application (step 4)
- `RAZORPAY_KEY_ID` = the **public** key id (add under `[vars]` once you have the account)
- Add a route so the Worker answers on your domain, for example:
  ```toml
  routes = [{ pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }]
  ```

## 3. Secrets (never commit these)
```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```
Never set `DEV_ADMIN_EMAIL` in production. It bypasses the admin login and exists only in `worker/.dev.vars`.

## 4. Protect the admin with Cloudflare Access
Zero Trust, then Access, then Applications, then add a self-hosted app that covers **both**
`yourdomain.com/admin*` and `yourdomain.com/api/admin*`. Allow only the owner email.
Copy the application's AUD tag into `ACCESS_AUD`, and your `<team>.cloudflareaccess.com` into `ACCESS_TEAM_DOMAIN`.
The Worker re-checks the signed Access token and the `ADMIN_EMAILS` list on every admin request.

## 5. Deploy
```bash
cd worker && npx wrangler deploy
```
Then in Cloudflare Pages: connect the Git repo, build command `npm run build`, output directory `dist`, add your domain.
`public/_redirects` makes client-side routes work; `public/_headers` adds basic security headers.

## 6. Razorpay (when your merchant account is approved)
1. Start in **test mode**: put the test key id in `wrangler.toml`, the test secrets via `wrangler secret put`.
2. In the Razorpay dashboard add a webhook: `https://yourdomain.com/api/webhooks/razorpay`,
   events `payment.captured` and `payment.failed`, secret = your `RAZORPAY_WEBHOOK_SECRET`.
3. Place a test order. An order is marked paid **only** by that signed webhook, and only if the captured amount equals the price the server computed.
4. Switch to live keys only after a full test pass.
Until Razorpay is configured, the shop offers cash on delivery only and custom orders are taken with a "we will send a payment request" message.

## 7. Backups
- A monthly cron (`wrangler.toml` `[triggers]`) saves last month's orders and messages to R2 under `backups/YYYY-MM/`.
- In `/admin` you can also export CSV or JSON for any month, or run the backup on demand.
- D1 has its own point-in-time restore (Time Travel); the R2 copy is an independent readable backup.

## 8. Before going live
- Set real prices: `src/data/products.js` (shop) and `shared/designSpec.js` (studio). The Worker reads both, so the price shown is the price charged.
- Real contact details, social links and policies in `src/config/site.js`.
- Replace the placeholder product artwork with real photos.
- In `index.html`, make `og:image` an absolute URL on your domain, and add a `sitemap.xml`.
- Test on a real phone, end to end: studio order, shop order, contact, bulk, track order, admin.

## Local development on this PC
`wrangler dev` cannot run on this machine (Windows Application Control blocks `workerd.exe`). Use the Node runner instead:
```bash
cd worker && npm run dev:node     # API on http://localhost:8787 (in-memory data, you are signed in as admin)
npm run dev                       # storefront on http://localhost:5173, /api is proxied to the API
cd worker && npm run smoke        # automated API checks
```
