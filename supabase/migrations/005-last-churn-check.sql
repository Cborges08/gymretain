-- Migration 005: Cron execution visibility (Phase 9, Pitfall 3)
-- GymRetain MVP — "Última verificação" timestamp on the dashboard.
--
-- The churn cron failing silently means no alerts for days without anyone
-- noticing. detectChurn() stamps this column on every run (manual button or
-- nightly cron), and the dashboard shows how long ago that was.
--
-- Apply: paste into Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Apply AFTER migrations 001-004

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_churn_check_at TIMESTAMPTZ;
