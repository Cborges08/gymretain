import { describe, it } from 'vitest';

describe('Phase 1: Database Schema (INFR-03, INFR-04)', () => {
  it.todo('organizations table exists with id, name, admin_email, created_at columns');
  it.todo('members table has qr_code_hash TEXT NOT NULL UNIQUE');
  it.todo('members table has external_id TEXT nullable (per D-06)');
  it.todo('members table has last_checked_in TIMESTAMPTZ nullable');
  it.todo('checkins table has checked_in_at, ip_address, user_agent columns');
  it.todo('alerts table has triggered_at, email_sent_at, contact_marked_at, resolved_at columns');
  it.todo('RLS enabled: SELECT on members as anon returns empty result set');
  it.todo('RLS enabled: SELECT on checkins as anon returns empty result set');
  it.todo('RLS enabled: checkins allows anonymous INSERT (public check-in flow, per D-12)');
  it.todo('index exists on members(last_checked_in) (per D-08, INFR-04)');
  it.todo('index exists on checkins(member_id, checked_in_at) (per D-08, INFR-04)');
  it.todo('index exists on members(qr_code_hash) (per D-08)');
});
