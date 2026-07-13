'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
})

const resetSchema = z.object({
  password: z.string().min(8, { message: 'A senha deve ter no mínimo 8 caracteres' }),
})

/**
 * Step 1: Request password reset email.
 * Sends email with link to /auth/reset-password?token_hash=X&type=recovery (per D-14).
 */
export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email } = parsed.data
  const supabase = createServerClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  })

  if (error) {
    return { error: 'Erro ao enviar email. Tente novamente.' }
  }

  return { success: true }
}

/**
 * Step 2: Confirm password reset with token_hash from email link.
 * Verifies OTP, then updates the password.
 */
export async function confirmPasswordReset(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const token_hash = formData.get('token_hash') as string
  const type = (formData.get('type') as 'recovery') || 'recovery'

  const parsed = resetSchema.safeParse({ password: formData.get('password') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { password } = parsed.data
  const supabase = createServerClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  if (verifyError) {
    return { error: 'Link expirado ou inválido. Solicite um novo.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    return { error: 'Erro ao redefinir senha. Tente novamente.' }
  }

  redirect('/')
}
