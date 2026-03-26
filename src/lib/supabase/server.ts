// src/lib/supabase/server.ts
// Use in Server Components, Route Handlers, and Server Actions.
// Requires `cookies` from 'next/headers'.
import { createServerClient as createClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export function createServerClient() {
  const cookieStore = cookies();
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );
}
