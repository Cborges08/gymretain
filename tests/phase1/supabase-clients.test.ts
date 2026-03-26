import { describe, it } from 'vitest';

describe('Phase 1: Supabase Client Factory (INFR-02)', () => {
  it.todo('createBrowserClient returns a SupabaseClient instance');
  it.todo('createServerClient accepts cookies store and returns SupabaseClient');
  it.todo('createServiceRoleClient uses SUPABASE_SERVICE_ROLE_KEY env var (per D-09)');
  it.todo('createServiceRoleClient does NOT use NEXT_PUBLIC_SUPABASE_ANON_KEY');
  it.todo('env var NEXT_PUBLIC_SUPABASE_URL is defined and non-empty');
  it.todo('env var NEXT_PUBLIC_SUPABASE_ANON_KEY is defined and non-empty');
  it.todo('env var SUPABASE_SERVICE_ROLE_KEY is defined and non-empty (Phase 7 requirement)');
});
