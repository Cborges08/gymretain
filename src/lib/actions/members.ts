'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { stripCpf } from '@/lib/utils/cpf'

// Zod schema for create and update (same fields)
const memberSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }).max(200, { message: 'Nome muito longo' }),
  email: z.string().email({ message: 'Email inválido' }),
  cpf: z.string().transform((val) => stripCpf(val)).pipe(
    z.string().length(11, { message: 'CPF deve ter 11 dígitos' })
  ),
  phone: z.string().max(20, { message: 'Telefone muito longo' }).optional().nullable(),
})

async function getOrgId(): Promise<string | null> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.org_id ?? null
}

function handleUniqueViolation(errorMessage: string): string {
  // Supabase error.message contains constraint name on unique violation
  if (errorMessage.includes('email')) {
    return 'Este email já está em uso nesta academia'
  }
  if (errorMessage.includes('cpf')) {
    return 'Este CPF já está em uso nesta academia'
  }
  return 'Erro ao salvar. Tente novamente.'
}

export async function createMemberAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = memberSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    cpf: formData.get('cpf'),
    phone: formData.get('phone') || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const org_id = await getOrgId()
  if (!org_id) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('members')
    .insert({
      org_id,
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      phone: parsed.data.phone || null,
      status: 'active',
      last_checked_in: null,
      external_id: null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: handleUniqueViolation(error.message) }
    }
    return { error: 'Erro ao cadastrar membro. Tente novamente.' }
  }

  redirect(`/dashboard/members/${data.id}`)
}

export async function updateMemberAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const id = formData.get('id') as string
  if (!id) return { error: 'ID do membro não informado.' }

  const parsed = memberSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    cpf: formData.get('cpf'),
    phone: formData.get('phone') || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const org_id = await getOrgId()
  if (!org_id) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('members')
    .update({
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      phone: parsed.data.phone || null,
    })
    .eq('id', id)
    .eq('org_id', org_id)  // RLS guard: only update own org's members

  if (error) {
    if (error.code === '23505') {
      return { error: handleUniqueViolation(error.message) }
    }
    return { error: 'Erro ao atualizar membro. Tente novamente.' }
  }

  redirect(`/dashboard/members/${id}`)
}

export async function deactivateMemberAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const id = formData.get('id') as string
  const action = formData.get('action') as 'deactivate' | 'reactivate'

  if (!id || !action) return { error: 'Dados inválidos.' }

  const newStatus = action === 'deactivate' ? 'inactive' : 'active'

  const org_id = await getOrgId()
  if (!org_id) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('members')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('org_id', org_id)

  if (error) {
    return { error: 'Erro ao atualizar status. Tente novamente.' }
  }

  redirect(`/dashboard/members/${id}`)
}
