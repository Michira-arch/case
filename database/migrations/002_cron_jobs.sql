-- ============================================================
-- MIGRATION 002: Campaign Notification Cron Jobs
-- ============================================================

-- 1. Enable the pg_net and pg_cron extensions if not already enabled
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Schedule the Daily Campaign
-- Runs at 5:00 PM UTC+3 (14:00 UTC) every day
-- Uses the default server-side secret key from Vault for authorization
select cron.schedule(
  'daily-campaign',
  '0 14 * * *',
  $$
  select net.http_post(
    url := 'https://caseshow.info/api/messaging/campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret
                                      from vault.decrypted_secrets
                                      where name = 'SUPABASE_SECRET_KEYS_default')
    ),
    body := jsonb_build_object('campaign', 'daily')::jsonb
  );
  $$
);

-- 3. Schedule the Weekly Campaign
-- Runs every Monday at 10:00 AM UTC+3 (07:00 UTC)
-- Uses the default server-side secret key from Vault for authorization
select cron.schedule(
  'weekly-campaign',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := 'https://caseshow.info/api/messaging/campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret
                                      from vault.decrypted_secrets
                                      where name = 'SUPABASE_SECRET_KEYS_default')
    ),
    body := jsonb_build_object('campaign', 'weekly')::jsonb
  );
  $$
);

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
