// src/lib/supabase/browser.ts
// Use in Client Components ('use client') and browser context only.
import { createBrowserClient as createClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/types/database';

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
