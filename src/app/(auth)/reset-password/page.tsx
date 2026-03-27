'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { requestPasswordReset, confirmPasswordReset } from '@/lib/actions/reset-password'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') || 'recovery'

  const [requestState, requestAction, isRequestPending] = useActionState(requestPasswordReset, null)
  const [confirmState, confirmAction, isConfirmPending] = useActionState(confirmPasswordReset, null)

  // Confirmation form (token_hash present in URL from email link)
  if (tokenHash) {
    return (
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Definir Nova Senha</h1>
          <p className="text-sm text-gray-600 mt-1">Insira uma nova senha segura</p>
        </div>

        <form action={confirmAction} className="space-y-4">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nova Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Escolha uma senha segura"
              required
              className="mt-1 block w-full border border-gray-300 rounded px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {confirmState?.error && (
            <p className="text-red-500 text-sm">{confirmState.error}</p>
          )}

          <button
            type="submit"
            disabled={isConfirmPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirmPending ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    )
  }

  // Request form (no token_hash — admin enters email to receive reset link)
  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Redefinir Senha</h1>
        <p className="text-sm text-gray-600 mt-1">
          Insira seu email para receber um link de redefinição
        </p>
      </div>

      {requestState?.success ? (
        <div className="text-center space-y-4">
          <p className="text-gray-700">Verifique seu email para continuar</p>
          <Link href="/auth/login" className="text-emerald-600 hover:underline text-sm">
            Voltar para login
          </Link>
        </div>
      ) : (
        <form action={requestAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              className="mt-1 block w-full border border-gray-300 rounded px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {requestState?.error && (
            <p className="text-red-500 text-sm">{requestState.error}</p>
          )}

          <button
            type="submit"
            disabled={isRequestPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestPending ? 'Enviando...' : 'Enviar Link'}
          </button>

          <div className="text-center">
            <Link href="/auth/login" className="text-emerald-600 hover:underline text-sm">
              Voltar para login
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg shadow p-8 max-w-md w-full" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
