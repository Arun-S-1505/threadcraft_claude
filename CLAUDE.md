# ThreadCraft storefront (threadcraft-react)

Clothing brand: own designs sold as "Collection", plus a custom-print service (Design Studio) and bulk orders.
Goal: a professional, minimalist, elegant storefront that looks legitimate to buyers. Keep working logic intact; design is free to change.
Owner: ThreadCraft (threadcraftcustomwear@gmail.com). Expected volume: about 50-100 orders a month, so everything must run on free tiers.

## Stack (current)
- Vite + React 19, react-router-dom 7 (SPA)
- 3D studio: three, @react-three/fiber, @react-three/drei. Model: `public/shirt_baked.glb` (single mesh node `T_Shirt_male`)
- Hand-written CSS with `tc-` prefix in `src/styles/` (base, chrome, shop, home, pages, studio), all imported via `brand.css`. Studio uses `sx` / `sx__*` / `sx-seg` / `sx-slider` classes.
- Tailwind was removed (the CDN script is gone); `base.css` has its own reset. Do not add Tailwind classes.
- Backend code is in `worker/` (Hono on Workers, D1, R2). One Worker named `threadcraft-claude` (root `wrangler.toml`) serves site + API at https://www.threadcraft.company, deployed from GitHub by Cloudflare on every push to main (build `npm run build`, deploy `npx wrangler deploy`). The storefront calls relative `/api/*` (Vite proxies it to `localhost:8787` in dev). Cart/wishlist live in localStorage (StoreContext). Customer accounts exist (emailed one-time code sign-in, no passwords).

## Target architecture (decided): all on Cloudflare free tier
- Frontend: served by the SAME Worker as the API, as static assets from `dist/` (root `wrangler.toml`, `[assets]`, SPA fallback, `run_worker_first = ["/api/*"]`). Not Cloudflare Pages. Never add a `_redirects` file with `/* /index.html 200` (Cloudflare rejects it as a loop).
- Backend: Cloudflare Workers, written with Hono (Express-like, runs on Workers). Do not use Express directly.
- Database: Cloudflare D1 (SQLite) for orders, design specs, statuses.
- Files: Cloudflare R2, PRIVATE bucket, for customer uploads and order preview images. No public access; the admin sees files through short-lived signed URLs or an authenticated Worker route.
- Admin: `/admin` area inside this same React app, protected by Cloudflare Access (free for small teams) AND by server-side checks in the Worker. Hiding a route in React is not security; every admin API route must verify the caller.
- Email (order notification to owner, confirmation to customer): a small email service with a free tier (e.g. Resend) called from a Worker.
- Payments: a hosted-checkout gateway (Razorpay suggested for India; owner must create and get approved for a merchant account first). Never store card data. Store only the gateway payment id + status. Confirm payment only through the gateway's signed webhook handled in a Worker.
- Free limits to keep in mind (verify current numbers on Cloudflare pricing): Workers about 100k requests/day and few ms CPU per request, so do no heavy image processing in Workers; R2 about 10 GB free. Keep upload cap at 5-10 MB and accept only PNG/JPG/WebP/SVG. Treat SVG as untrusted (show only as an image, never inline).
- Suggested repo layout: keep the React app at root; add `worker/` (Hono app, `wrangler.toml`, `schema.sql`) and a shared `shared/designSpec.js` for the design-spec schema and validation used by both sides.

## Design rules
- Minimal and calm: neutral palette (CSS variables in base.css), few animations, only essential icons (search, wishlist, account, bag, menu).
- Spacing around horizontal rules is intentionally tight (`.tc-pagehead`, `.tc-section`). Do not re-loosen.
- The animated announcement strip (`.tc-ann`, from `SITE.announcements`) shows above the navbar on every page, including /studio, via `<Navbar announcement />`.
- Mobile navbar keeps search, account and bag icons visible (wishlist hidden under 560px, reachable from the account menu).

## Routes (src/App.jsx)
Storefront pages sit inside `Layout`: home, shop, collections, product, cart, checkout, order-confirmation, wishlist, contact, policies, /bulk-orders, /sustainability (shown as "Our Craft"), /track-order (real lookup by order number + email).
Accounts: /login (sign in), /signup (create account), /account (Orders tab with tracking + Profile tab). /orders and /account/password redirect to /account. Guests can still order and use /track-order.
`/studio` is standalone (own navbar, no footer). `/admin` is the owner area (`AdminPage.jsx`, no Layout, noindex).

## Business config
- `src/config/site.js`: site name, contact, nav links, announcements, policy (dispatch hours, `gsmRegular: 180`, `gsmOversized: 240`).
- Regular fit tee = 180 GSM, oversized tee = 240 GSM. Keep copy consistent everywhere.
- All prices are INR placeholders. Studio prices are in `src/pages/StudioPage.jsx`: BASE_PRICES {dtg 899, screen 799, embroidery 1199}, PRINT_FEES {199, 149, 299}, EXTRA_ITEM_FEE 99, FIT_PRICE {regular 0, oversized 200}. Replace with real prices. When orders go live, the Worker must recompute the price server-side from the design spec; never trust a total sent by the browser.

## Design Studio (src/pages/StudioPage.jsx + src/components/TShirt3D.jsx)
- UI fully redesigned; logic preserved. Design items (`designList`) have: id, type ('text'|'image'), text, textColor, textSize, textFont, image (data URL), placement (front/back/left_sleeve/right_sleeve), pos {x,y}, scale {x,y}. Also state: shirt colour, fit (regular/oversized), print type, view angle.
- Decal position maths: `getBaseTransform` / `getPlacementTransform` in TShirt3D.jsx. Oversized goes through `toOversized()` in `src/components/oversizedFit.js` (OVERSIZED: width 1.32, depth 1.1, drop 0.06, length 0.09, boxy 0.06) and print scale is bumped slightly. `key={fit}` forces remount.
- Oversized has no separate 3D asset; it is the regular mesh deformed procedurally.
- `PlacementPicker` and `Slider` are at module scope on purpose (inside the component they remount every render and break slider dragging).
- The studio's "send us your design" link was replaced by a real Submit order flow (`OrderDialog.jsx`).

## Workflow of the whole project (customer to owner)
1. Customer browses the storefront: Shop / Collections / Product pages, wishlist, cart drawer (all static data from `src/data/products.js`).
2. Custom prints: customer opens `/studio`, picks fit (regular 180 GSM / oversized 240 GSM), colour, print type; adds text and/or images; positions and scales them on the 3D shirt (front, back, sleeves); sees the live price.
3. Customer presses "Submit order". Browser: validates, builds the design spec, captures preview images, uploads original image files, sends the order to the Worker.
4. Worker: validates the spec and files, recomputes price, stores files in R2 and the order row in D1, emails the owner, creates the Razorpay order when the gateway is configured, returns an order id.
5. Customer pays through the gateway's hosted checkout; the webhook marks the order paid.
6. Owner opens `/admin`, sees new orders, opens one (preview snapshot, live read-only 3D rebuild from the saved spec, original file downloads, customer and shipping details), prints, updates status (new, paid, printing, shipped, delivered) with a tracking number.
7. Customer looks up status on /track-order with order number + email, or signs in at /account to see all their orders (matched by verified email, so earlier guest orders appear too).
Bulk orders and contact forms follow the same pattern: form to Worker to D1 + owner email.

## Design-spec storage rules (strict: the design must never change after the customer places it)
Store three separate things per custom order:
1. Design spec JSON (about 1-2 KB, source of truth): `schemaVersion`, shirt model + fit, shirt colour, print type, and per item: type, placement, pos x/y, scale x/y, text/colour/size/font for text items, image file id + sha256 for image items. ALSO store the resolved final transform per item (position, rotation, scale in model space) computed at order time, plus a model/fit version, so future changes to the placement maths cannot shift old orders.
2. Original uploaded images in private R2, byte-for-byte as received (no resize, no recompress; lossless only if a conversion is unavoidable). Reference by file id; record sha256; dedupe by hash.
3. Preview snapshots (WebP/PNG, about 100-300 KB): 3D capture at order time, front and back if printed. This is the frozen visual proof.
Text items: bundle the font files in the site, and also rasterise each text item to a transparent PNG/SVG at order time so it can never re-render differently.
Do not put base64 images in the database. Warn the customer in the browser if an image is small (under about 1000 px longest side) because it will print blurry.
Admin view should rebuild the 3D shirt read-only from the saved spec (reuse `TShirt3D`) and show the snapshot beside it.

## Status of the plan
**LIVE at https://www.threadcraft.company** (one Cloudflare Worker `threadcraft-claude` + D1 `threadcraft` + private R2 `threadcraft-files`, Cloudflare Access on /admin and /api/admin, Resend emails from orders@threadcraft.company, Razorpay in TEST mode). Verified live on 2026-10-04: custom studio order with test payment, shop COD, shop online payment, failed payment, signed webhook (paid + failed), emails, admin login. What is left is content and switching Razorpay to live.

**Done and verified in a real browser against the local API:** Oversized fit (3D), studio Submit order (text + image uploads, previews, payment step), shop checkout (cash on delivery path), contact + bulk forms, track-order, admin list/detail with 3D rebuild, downloads, status + tracking updates, messages, backup, erase customer data.
**Done and covered by `worker/test/smoke.mjs` (118 checks, run `npm run smoke` in worker/):** order validation, server-side pricing, file sniffing/SVG rejection, tracking, admin auth (403 cases), webhook signature + amount check + idempotency, Razorpay order creation (mocked gateway), messages, backup, accounts (sign-in codes, passwords, lockouts, forgot-password, Google tokens checked against a throwaway signing key, cookies, CSRF, privacy between customers).

### Accounts (added 2026-10-04)
- Three ways in, all ending in the same session cookie: Google, email + password, or an emailed 6-digit code. A NEW account is only created after the email is confirmed by a code or by Google (otherwise someone could register a stranger's email and read that person's guest orders). Sign-up may carry an optional password that is stored only once the code is confirmed. "Forgot password" (/reset-password) = code + new password. Passwords: PBKDF2-SHA256, 100k iterations (Workers' maximum), stored as `pbkdf2-sha256$iters$salt$hash` (`worker/src/passwords.js`); 5 wrong passwords lock password sign-in for 15 min (the email code still works); wrong email and wrong password look identical.
- Google: the browser gets Google's signed ID token via Google's own button (`components/GoogleButton.jsx`); `worker/src/google.js` verifies signature, audience (`GOOGLE_CLIENT_ID`), issuer, expiry and `email_verified`. No client secret is used. The button is hidden when `GOOGLE_CLIENT_ID` is empty and inside Instagram/Facebook in-app browsers, where Google refuses sign-in.
- **Deployed 2026-10-04** (accounts, passwords, mobile studio, header fix; live DB got `users`, `sessions`, `login_codes` via `npm run db:remote`). **Measured live:** one PBKDF2 hash/verify costs 22-50 ms CPU and all test requests finished `outcome: ok`, although the documented free-plan CPU limit is 10 ms, so occasional CPU-limit errors (Cloudflare error 1102) on password sign-in remain possible. Watch for them; if they appear, lower `PBKDF2_ITERATIONS` (min 10000) or move to the paid Workers plan. Email-code and Google sign-in are not affected.
- **Original note (kept for reference):** password hashing is CPU heavy and the Workers free plan allows only ~10 ms CPU per request. Check `npx wrangler tail threadcraft-claude --format json` (`cpuTime`) on a password sign-in; if requests fail with CPU-limit errors, set `PBKDF2_ITERATIONS` lower (stored hashes carry their own iteration count, so old passwords keep working).
- Email code flow: `worker/src/users.js`: `/api/auth/request-code`, `/api/auth/verify`, `/api/auth/logout`, `/api/me` (GET/PATCH), `/api/me/orders`, `/api/me/orders/:id`, `/api/me/orders/:id/preview`. Tables: `users`, `sessions` (stores only a hash of the cookie token), `login_codes` (hashed, 10 min, 5 attempts, 45 s resend gap, 5 sends/hour/email). Cookie `tc_session` is HttpOnly, SameSite=Lax, 30 days. State-changing routes reject foreign `Origin`.
- Orders are linked to an account by email, not by id. Erasing an order's personal data replaces its email, so it disappears from the account.
- Resend free tier is about 100 emails/day: every sign-in code counts. Limits above exist to stop abuse burning it.
- Frontend: `store/AuthContext.jsx`, `pages/AuthPages.jsx`, `pages/AccountPage.jsx`, `components/OrderTimeline.jsx`, `components/PayNow.jsx`, `styles/account.css`. Checkout and the studio order dialog prefill from the saved profile.
- Local dev: the dev API prints sign-in codes in its console (`DEV_LOGIN_CODES`); production never does.
- **Schema changes are NOT applied by the deploy.** After adding tables, run `cd worker && npm run db:remote` BEFORE pushing code that uses them.

### Mobile
- Studio on screens <= 960px: the 3D shirt is pinned at the top (37vh), only the controls scroll beneath, bottom bar = price + Submit order, sliders get big thumbs on touch screens (`pointer: coarse`), and adding/selecting a design scrolls the controls to the adjust sliders.
- Checkout on phones: form first, then payment, then the summary with the Pay button.
- Header on phones (`chrome.css`): the grid is `auto minmax(0,1fr) auto` so the name can shrink and can never be drawn over the icons (it used to overlap the search icon on real phones narrower than ~375px, which dev-tools emulation at 390px did not show). The name scales with the screen (`clamp` in vw) and is clipped, never spilled. Test header changes at 320, 340, 360, 375, 390, 412 and 430px wide.
- Browser-pane note: use `resize_window` with width 390 height 844 (the "mobile" preset uses 2x pixels and its screenshots come out cropped).

### How things work
- `shared/designSpec.js`: pricing, spec builder, validators, used by the browser AND the Worker. `worker/src/catalog.js` prices shop carts from `src/data/products.js` + `src/config/site.js`, so the displayed price is the charged price.
- `src/lib/orders.js` (studio order), `src/lib/api.js` (fetch wrapper), `src/lib/razorpay.js` (hosted checkout loader). Payment is only ever confirmed by the signed webhook, never by the browser.
- Studio preview capture: `makeCapture` in `TShirt3D.jsx` turns the OrbitControls (damping off) to each printed side and reads the canvas. Saved orders render from the stored transform (`item.resolved`), text from its stored PNG.
- Payment modes: shop = cash on delivery always, UPI/card only if the gateway is configured (`GET /api/config`). Custom orders = online if configured, else "we will send a payment request" (`invoice`).
- Worker routes: `/api/orders`, `/api/shop-orders`, `/api/pay`, `/api/config`, `/api/track`, `/api/contact`, `/api/bulk`, `/api/webhooks/razorpay`, `/api/admin/*` (Access + allow-list). Monthly cron backs up to R2.
- **`wrangler dev` cannot run on the owner's PC** (Windows Application Control blocks `workerd.exe`; do not try to bypass it). Local full-stack dev: `cd worker && npm run dev:node` (in-memory data, acts as admin) plus `npm run dev`.
- Dev-browser quirk: the preview pane throttles rendering until it is painted. Take a screenshot before scripting the 3D studio, or the OrbitControls ref stays null.

## Remaining work
1. **Content (owner provides):** real prices (`src/data/products.js`, `shared/designSpec.js`), real product photos (still procedural SVG `components/ui/Garment`), phone/WhatsApp, social links, business name/address in the footer (`src/config/site.js`; Razorpay live approval often checks these), review of shipping/returns/privacy/terms wording.
2. **Razorpay LIVE:** generate live keys, change `RAZORPAY_KEY_ID` in `wrangler.toml`, replace the `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` secrets (dashboard: Settings > Variables and Secrets, type Secret), and add a LIVE-mode webhook (same URL, events payment.captured + payment.failed). Account accepts Indian cards/UPI only (international cards not enabled; use domestic test cards or UPI `success@razorpay` in test mode).
3. **Google sign-in (owner):** create the OAuth client in Google Cloud and put its client id in `wrangler.toml` `GOOGLE_CLIENT_ID` (steps in DEPLOY.md). Until then the Google button is simply not shown.
4. **Cleanup:** erase the `TEST ...` orders in /admin (Erase customer data) before launch.
5. **Optional:** redirect threadcraft.company (no www) to www (needs a proxied DNS record + Redirect Rule); studio "Add to bag"; admin refund screen (refunds are done in the Razorpay dashboard).
6. **Not yet confirmed:** on a phone/own browser, the studio dialog shows "Your payment went through" after paying (the server side is confirmed).

### Operating notes
- Secrets live only in Cloudflare (RESEND_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET). A secret that is accidentally 1 character long makes Resend return an empty 400; the email code logs `keyLength` to diagnose this (`npx wrangler tail threadcraft-claude`).
- Every push to main on GitHub auto-builds and deploys. Do not click "Retry build" on old failed builds (it re-runs an old commit).
- `npm run build` output is served as static assets; `/api/*` runs the Hono Worker (`worker/src/index.js`).

### Owner facts (from the owner)
- Domain: to be bought on name.com with the GitHub Student Developer Pack (any TLD the offer allows). Put DNS on Cloudflare (change nameservers at name.com).
- Resend account exists; only domain verification is left. Razorpay account is already activated for live payments.

## Known limits / cautions
- Free tiers: verify current limits on each pricing page before relying on them. Supabase was considered and NOT chosen.
- Never put secrets or API keys in the React code; everything in the browser is public.
- Never accept a price, payment status or admin role from the browser.
