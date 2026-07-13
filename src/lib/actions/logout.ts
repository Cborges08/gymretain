'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logoutAction(): Promise<void> {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
