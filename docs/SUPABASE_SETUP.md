# Supabase Setup Guide for Case App

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Click **New project**
3. **Organization**: your org (or create one)
4. **Name**: `case-app` (or your choice)
5. **Database Password**: generate a strong one and save it
6. **Region**: Choose **eu-west-1** (Ireland) — closest to Nairobi with acceptable latency until an Africa region is available
7. Click **Create new project** and wait ~2 minutes

---

## Step 2: Run the SQL Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open `database/schema.sql` from this project
4. Copy the **entire file** contents
5. Paste into the SQL editor
6. Click **Run** (or Ctrl+Enter)

You should see: `Success. No rows returned`

This creates:
- All 8 tables (profiles, proof_items, evidence, vouch_requests, payments, subscriptions, analytics_events, push_subscriptions)
- All RLS policies
- All stored procedures / RPCs
- Triggers (auto-subscription, updated_at)
- Pricing plan seed data (KES 70/6m, KES 100/12m)

---

## Step 3: Enable Phone Auth

1. In Supabase, go to **Authentication → Providers**
2. Find **Phone** and enable it
3. Choose SMS provider:
   - **Twilio** (reliable, pay per SMS ~$0.02) — recommended
   - **Africa's Talking** (Kenya-focused, cheaper for local SMS, ~KES 2/SMS)
   - **Vonage / MessageBird** (alternatives)
4. Enter your SMS provider credentials
5. Save

> **For MVP/testing**: You can use Supabase's own OTP without a provider — it logs the OTP to the dashboard under **Authentication → Users**. Good for testing, not production.

---

## Step 4: Get Your API Keys

1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (**keep secret — server-side only**)

3. Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Step 5: Configure RLS (already done in schema.sql)

The schema.sql file enables RLS on all tables and creates all policies. Verify they're active:

1. Go to **Table Editor** → select any table
2. Click the **RLS** tab
3. Confirm policies are listed

---

## Step 6: Set Up Storage (for Supabase Storage fallback)

> **Note**: The app primarily uses Cloudflare R2 for media storage (already configured in `.env.local`). Supabase Storage is not required for MVP.

---

## Step 7: Set Up pg_cron (for subscription expiry)

1. In SQL Editor, run:
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily subscription downgrade check at 2am UTC
SELECT cron.schedule(
  'downgrade-expired-subscriptions',
  '0 2 * * *',
  'SELECT public.downgrade_expired_subscriptions();'
);
```

---

## Step 8: Test the Setup

1. Start the dev server: `npm run dev`
2. Go to http://localhost:3000/signup
3. Enter your phone number and verify OTP
4. Complete onboarding
5. Check Supabase → Table Editor → profiles — you should see your new profile
6. Check subscriptions table — it should have a `free` plan row (auto-created by trigger)

---

## Useful Supabase Queries for Debugging

```sql
-- See all profiles
SELECT handle, display_name, persona, created_at FROM profiles;

-- Check subscriptions
SELECT p.handle, s.plan, s.current_period_end 
FROM subscriptions s 
JOIN profiles p ON p.id = s.profile_id;

-- Check analytics events
SELECT event_type, count(*) 
FROM analytics_events 
GROUP BY event_type 
ORDER BY count DESC;

-- See completeness scores
SELECT * FROM profile_completeness;
```
