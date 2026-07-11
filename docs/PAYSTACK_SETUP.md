# Paystack Setup Guide for Case App

## Overview

Paystack is Kenya's most widely used payment gateway. We use it for:
- Card payments (Visa/Mastercard)
- M-Pesa (Mobile Money) — enabled automatically for Kenya

You already have your **test keys** configured in `.env.local`. Here's how to complete the setup.

---

## Step 1: Verify Your Test Keys (already done)

Your `.env.local` already has:
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_6210fb28f88e0f1e20b21c50895a649629e540d9
PAYSTACK_SECRET_KEY=sk_test_292daa563376df0079c550cde024cb309fb170ab
```

These are test keys — no real money moves. Use them during development.

---

## Step 2: Set Up Webhook URL

The webhook is **critical** — it's the only way we trust payment confirmation (client redirect can be spoofed/dropped).

### During Development (local testing):

Use **ngrok** or **Cloudflare Tunnel** to expose your local server:

```bash
# Option A: ngrok (needs account at ngrok.com)
npx ngrok http 3000
# Get a URL like: https://abc123.ngrok-free.app

# Option B: Cloudflare Tunnel (free, no account needed)
npx cloudflared tunnel --url http://localhost:3000
```

Your webhook URL will be: `https://your-tunnel-url.com/api/webhooks/paystack`

### In Paystack Dashboard:

1. Go to https://dashboard.paystack.com
2. Log in to your account
3. Navigate to **Settings → API Keys & Webhooks**
4. Under **Webhook URL**, enter: `https://your-tunnel-url.com/api/webhooks/paystack`
5. Click **Update**

> **Important:** The webhook uses HMAC-SHA512 signature verification. Your `PAYSTACK_SECRET_KEY` is used to verify — never expose it client-side.

---

## Step 3: Test a Payment

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/dashboard/billing
3. Select a plan and click **Pay KES X →**
4. The Paystack modal opens
5. Use test card: `4084 0840 8408 4081`, expiry `12/99`, CVV `408`
6. For M-Pesa test: use phone `0708 993 408`

### What Happens on Success:
1. Paystack calls your webhook at `/api/webhooks/paystack`
2. Your handler verifies the HMAC signature
3. Calls Supabase RPC `apply_payment` via service role
4. Subscription row is upserted — profile upgraded to `plus`
5. Billing page polls and shows "You're now on Case+!"

---

## Step 4: Go Live

When ready to accept real payments:

1. In Paystack dashboard, complete **Business Verification** (KRA PIN, business registration)
2. Go to **Settings → API Keys** → switch to **Live keys**
3. Update your production environment variables:
   ```
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
   PAYSTACK_SECRET_KEY=sk_live_...
   ```
4. Set your live webhook URL to your production domain
5. Enable **Mobile Money** channel in Paystack dashboard under **Settings → Payment Channels**

---

## Pricing Configuration

Prices are stored in the `pricing_plans` database table — **not hardcoded**.
To change prices without redeploying:

```sql
UPDATE pricing_plans
SET amount_kes = 80
WHERE id = '6m';
```

Current prices (as seeded in schema.sql):
| Period | Price |
|--------|-------|
| 6 months | KES 70 |
| 12 months | KES 100 |

---

## Webhook Security

Your webhook handler at `app/api/webhooks/paystack/route.ts`:
1. Reads the `x-paystack-signature` header (HMAC-SHA512 of body + your secret)
2. Recomputes the signature using your `PAYSTACK_SECRET_KEY`
3. Rejects the request if signatures don't match (returns 401)
4. Only processes `charge.success` events
5. Calls `apply_payment` RPC which is service-role only — client can't call it directly

This means: **even if someone sends a fake "success" callback to the client-side redirect URL, the subscription won't be upgraded** unless the webhook receives a valid, signed confirmation from Paystack.

---

## Subscription Grace Behavior (on expiry)

When a subscription expires:
- No data is deleted
- Items beyond free tier limits become `visible = false`
- Owner sees them as "hidden — upgrade to show again" in dashboard
- The `downgrade_expired_subscriptions()` RPC handles this (call daily via pg_cron)

To set up pg_cron in Supabase:
```sql
-- In Supabase SQL Editor:
SELECT cron.schedule(
  'downgrade-expired-subscriptions',
  '0 2 * * *',  -- 2am daily
  'SELECT downgrade_expired_subscriptions();'
);
```
