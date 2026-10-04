// Local API for frontend development on machines where `wrangler dev` cannot run.
// Runs the real Worker code with an in-memory database (data resets on restart) and acts as
// a signed-in admin (DEV_ADMIN_EMAIL). Never deploy this file; production uses wrangler.
import { serve } from '@hono/node-server'
import { makeApi } from './harness.mjs'

const PORT = Number(process.env.PORT) || 8787
const { api } = makeApi({
  DEV_ADMIN_EMAIL: 'threadcraftcustomwear@gmail.com',
  DEV_LOGIN_CODES: '1', // print sign-in codes in this console instead of emailing them
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, // set to show the Google button locally
  ALLOWED_ORIGIN: 'http://localhost:5173',
  // Set these to try the Razorpay flow against a real test-mode account:
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret',
})

serve({
  port: PORT,
  fetch: (req) => {
    const url = new URL(req.url)
    return api(url.pathname + url.search, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body, duplex: 'half' })
  },
})
console.log(`ThreadCraft dev API (in-memory) on http://localhost:${PORT}`)
