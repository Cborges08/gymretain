'use server'

import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'A senha deve ter no mínimo 8 caracteres' }),
})

export async function signupAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password } = parsed.data

  // Step 1: Create auth user
  const supabase = createServerClient()
  const { data, error: signupError } = await supabase.auth.signUp({ email, password })

  if (signupError || !data.user) {
    const msg = signupError?.message ?? ''
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
      return { error: 'Este email já está cadastrado' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Step 2: Create organization record (per D-02: placeholder name "Minha Academia")
  const service = createServiceRoleClient()
  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name: 'Minha Academia',
      admin_email: email,
      qr_code_hash: randomUUID(),
    })
    .select()
    .single()

  if (orgError || !org) {
    // Rollback: delete orphaned auth user
    await service.auth.admin.deleteUser(data.user.id)
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Step 3: Set org_id in JWT app_metadata (per D-03 — RLS policies require this)
  const { error: metadataError } = await service.auth.admin.updateUserById(data.user.id, {
    app_metadata: { org_id: org.id },
  })

  if (metadataError) {
    // Rollback: delete both org and user
    await service.from('organizations').delete().eq('id', org.id)
    await service.auth.admin.deleteUser(data.user.id)
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/auth/login')
}
