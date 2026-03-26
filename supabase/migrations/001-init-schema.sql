-- Migration 001: Initial Schema
-- GymRetain MVP — four tables for single-tenant gym retention tracking
-- Apply: paste into Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Version control: saved in /supabase/migrations/ (per D-03)

-- ============================================================
-- organizations
-- Single-tenant MVP: one organization per deployment
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  admin_email  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_email)
);

-- ============================================================
-- members
-- Gym students with QR codes for check-in
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL,
  phone                   TEXT,
  qr_code_hash            TEXT NOT NULL,
  qr_code_generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_in         TIMESTAMPTZ,          -- NULL until first check-in
  status                  TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
  external_id             TEXT,                 -- Reserved for future Fácil integration (per D-06)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(qr_code_hash),                         -- Global uniqueness enforced in DB (per D-07)
  UNIQUE(org_id, email),                        -- Email unique within org
  UNIQUE(org_id, external_id)                   -- external_id unique within org when set
);

-- ============================================================
-- checkins
-- Immutable audit log of every member check-in
-- ============================================================
CREATE TABLE IF NOT EXISTS checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address     TEXT,         -- For fraud detection (Phase 9)
  user_agent     TEXT,         -- For audit trail (CHKN-04)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- alerts
-- Churn alerts created by nightly cron job (Phase 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  alert_type          TEXT NOT NULL DEFAULT 'churn',
  triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent_at       TIMESTAMPTZ,   -- Set after Resend delivers email (ALRT-07 idempotency)
  contact_marked_at   TIMESTAMPTZ,   -- Set when admin marks "contacted" (DASH-04)
  resolved_at         TIMESTAMPTZ,   -- Set when member checks in again or manually closed
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
