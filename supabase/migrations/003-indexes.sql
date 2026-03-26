-- Migration 003: Performance Indexes
-- GymRetain MVP — indexes for churn detection and dashboard queries
-- Apply AFTER 001-init-schema.sql
-- Apply: paste into Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Requirements: INFR-04 (indexes on members.last_checked_in and checkins(member_id, checked_in_at))

-- ============================================================
-- members table indexes (per D-08, INFR-04)
-- ============================================================

-- Dashboard sorts members by days without check-in — this index powers that query
CREATE INDEX IF NOT EXISTS idx_members_last_checked_in
  ON members(last_checked_in DESC NULLS LAST);

-- QR code lookup at check-in time — must be fast (called on every scan)
CREATE INDEX IF NOT EXISTS idx_members_qr_code_hash
  ON members(qr_code_hash);

-- Org-level member listing (filtered by RLS, but index helps PostgREST)
CREATE INDEX IF NOT EXISTS idx_members_org_id
  ON members(org_id);

-- ============================================================
-- checkins table indexes (per D-08, INFR-04)
-- ============================================================

-- Composite index for member check-in history queries (member profile page)
-- Also powers the duplicate check-in window query (CHKN-03: 4h window)
CREATE INDEX IF NOT EXISTS idx_checkins_member_id_checked_in_at
  ON checkins(member_id, checked_in_at DESC);

-- Org-level check-in queries (dashboard statistics)
CREATE INDEX IF NOT EXISTS idx_checkins_org_id_checked_in_at
  ON checkins(org_id, checked_in_at DESC);

-- ============================================================
-- alerts table indexes
-- ============================================================

-- Churn detection: find unresolved alerts by org (cron job + dashboard)
CREATE INDEX IF NOT EXISTS idx_alerts_org_id_resolved_at
  ON alerts(org_id, resolved_at NULLS FIRST);

-- Member-specific alert lookup (dashboard member profile)
CREATE INDEX IF NOT EXISTS idx_alerts_member_id
  ON alerts(member_id);
