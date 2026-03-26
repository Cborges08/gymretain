// src/lib/supabase/service.ts
// WARNING: This client bypasses ALL RLS policies.
// Use ONLY in:
//   - /api/cron/detect-churn (Phase 7)
//   - Server-side admin operations where RLS is intentionally bypassed
// NEVER import this in Client Components or expose to browser.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing env var: SUPABASE_SERVICE_ROLE_KEY. ' +
      'This key is required for cron jobs (Phase 7). ' +
      'Get it from: Supabase Dashboard > Project Settings > API > service_role'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
