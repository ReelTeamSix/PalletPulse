-- Setup pg_cron for scheduled notifications
-- This migration enables the pg_cron extension and schedules the daily notification job

-- Enable pg_cron extension (requires superuser, done via Supabase dashboard usually)
-- Uncomment if running manually:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
-- GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily notification job to run at 9 AM UTC
-- The function will be invoked via HTTP, so we use pg_net to call the Edge Function
-- Note: pg_net must also be enabled in Supabase dashboard

-- First, ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to invoke the Edge Function
CREATE OR REPLACE FUNCTION invoke_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  -- Get the Supabase URL from environment
  -- In production, these come from vault secrets
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  -- If vault not configured, use direct URL (for local dev)
  IF project_url IS NULL THEN
    project_url := current_setting('app.settings.supabase_url', true);
  END IF;

  IF service_key IS NULL THEN
    service_key := current_setting('app.settings.service_role_key', true);
  END IF;

  -- Call the Edge Function
  PERFORM net.http_post(
    url := project_url || '/functions/v1/daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule the cron job (runs daily at 2 PM UTC = 9 AM Eastern / 10 AM EDT)
-- Adjust the schedule as needed: '0 14 * * *' = 2:00 PM UTC every day
-- Using SELECT to avoid error if cron extension not enabled
DO $$
BEGIN
  -- Check if cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('daily-notifications');

    -- Schedule new job
    PERFORM cron.schedule(
      'daily-notifications',
      '0 14 * * *',  -- 2 PM UTC = 9 AM Eastern / 10 AM EDT
      'SELECT invoke_daily_notifications()'
    );

    RAISE NOTICE 'Cron job scheduled: daily-notifications at 9 AM UTC';
  ELSE
    RAISE NOTICE 'pg_cron extension not enabled. Enable it in Supabase dashboard under Database > Extensions';
  END IF;
END;
$$;

-- Create optimized RPC function for stale inventory check
-- This is called by the Edge Function for efficient querying
CREATE OR REPLACE FUNCTION get_users_with_stale_inventory(
  today_date date,
  default_threshold integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  stale_count bigint,
  threshold_days integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_thresholds AS (
    -- Get threshold for each user (from settings or default)
    SELECT
      p.id as user_id,
      COALESCE(us.stale_threshold_days, default_threshold) as threshold_days
    FROM profiles p
    LEFT JOIN user_settings us ON us.user_id = p.id
  ),
  stale_items AS (
    -- Find stale items for each user
    SELECT
      i.user_id,
      COUNT(*) as stale_count,
      ut.threshold_days
    FROM items i
    JOIN user_thresholds ut ON ut.user_id = i.user_id
    WHERE i.status = 'listed'
      AND i.listing_date IS NOT NULL
      AND i.listing_date <= (today_date - (ut.threshold_days || ' days')::interval)::date
    GROUP BY i.user_id, ut.threshold_days
    HAVING COUNT(*) > 0
  ),
  already_notified AS (
    -- Users already notified today
    SELECT DISTINCT user_id
    FROM notifications
    WHERE type = 'stale_inventory'
      AND created_at >= today_date::timestamp
  )
  SELECT
    si.user_id,
    si.stale_count,
    si.threshold_days
  FROM stale_items si
  WHERE si.user_id NOT IN (SELECT user_id FROM already_notified);
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_users_with_stale_inventory IS
'Returns users with stale inventory who have not been notified today.
Used by the daily-notifications Edge Function for efficient batch processing.';

COMMENT ON FUNCTION invoke_daily_notifications IS
'Invokes the daily-notifications Edge Function via HTTP.
Called by pg_cron at 9 AM UTC daily.';
