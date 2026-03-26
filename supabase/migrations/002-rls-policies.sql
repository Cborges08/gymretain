-- Migration 002: Row Level Security Policies
-- GymRetain MVP — single-tenant RLS enforcement
-- Apply AFTER 001-init-schema.sql
-- Apply: paste into Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================================
-- ENABLE RLS on all tables (per D-10)
-- Querying any table without auth must return empty result set
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- organizations policies (per D-13)
-- Admin can only see and manage their own org
-- ============================================================
CREATE POLICY "orgs_select_own"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (admin_email = auth.email());

CREATE POLICY "orgs_insert_own"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_email = auth.email());

CREATE POLICY "orgs_update_own"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (admin_email = auth.email())
  WITH CHECK (admin_email = auth.email());

-- ============================================================
-- members policies (per D-11, D-13)
-- Scoped to org_id stored in JWT app_metadata claim
-- Set by Supabase Auth hook at login time (Phase 2)
-- ============================================================
CREATE POLICY "members_select_org"
  ON members
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE POLICY "members_insert_org"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE POLICY "members_update_org"
  ON members
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================
-- checkins policies (per D-12)
-- Public INSERT: no auth required (QR check-in flow, CHKN-01)
-- SELECT: authenticated only, org-scoped
-- ============================================================
CREATE POLICY "checkins_insert_public"
  ON checkins
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "checkins_select_org"
  ON checkins
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================
-- alerts policies (per D-13)
-- Admin-only, org-scoped read/write
-- ============================================================
CREATE POLICY "alerts_select_org"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE POLICY "alerts_insert_org"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE POLICY "alerts_update_org"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
