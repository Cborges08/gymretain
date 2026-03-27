-- Migration 004: Gym QR Code + CPF Identification
-- GymRetain MVP — design pivot: check-in via gym QR + CPF, not per-member QR
--
-- CONTEXT: .planning/phases/03-member-management/03-CONTEXT.md
-- REASON: Real-world gym UX — gym posts one QR code, members scan it and enter
--         their CPF to identify themselves. Per-member QR was impractical.
--
-- Apply: paste into Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Apply AFTER migrations 001, 002, 003

-- ============================================================
-- organizations: add gym-level QR code
-- One QR per gym, posted at entrance. Members scan this to reach the check-in page.
-- ============================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS qr_code_hash TEXT;

-- Seed any existing org record(s) with a UUID-based QR hash
UPDATE organizations SET qr_code_hash = gen_random_uuid()::text WHERE qr_code_hash IS NULL;

-- Enforce NOT NULL and uniqueness after seeding
ALTER TABLE organizations ALTER COLUMN qr_code_hash SET NOT NULL;
ALTER TABLE organizations ADD CONSTRAINT organizations_qr_code_hash_unique UNIQUE (qr_code_hash);

-- ============================================================
-- members: add CPF field for check-in identification
-- Members enter their CPF on the check-in page after scanning the gym QR.
-- CPF is the Brazilian taxpayer ID (11 digits). Validation is done at the app layer.
-- ============================================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE members ADD CONSTRAINT members_org_id_cpf_unique UNIQUE (org_id, cpf);

-- Fast lookup index: used on every check-in (service role client, bypasses RLS)
CREATE INDEX IF NOT EXISTS idx_members_org_id_cpf ON members(org_id, cpf);

-- ============================================================
-- members: remove per-member QR code columns (superseded by gym QR + CPF)
-- These columns were part of the original per-member QR design.
-- Dropped cleanly here since no member rows exist yet (Phase 3 not started).
-- ============================================================
DROP INDEX IF EXISTS idx_members_qr_code_hash;
ALTER TABLE members DROP COLUMN IF EXISTS qr_code_hash;
ALTER TABLE members DROP COLUMN IF EXISTS qr_code_generated_at;
