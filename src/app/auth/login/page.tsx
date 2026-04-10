'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction } from '@/lib/actions/login'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  )
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null)

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">GymRetain</h1>
      </div>

      <form action={action} className="space-y-4">
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Sua senha"
            required
            className="mt-1 block w-full border border-gray-300 rounded px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {state?.error && (
          <p className="text-red-500 text-sm">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      <div className="text-sm text-center mt-4 space-y-2">
        <p className="text-gray-600">
          Não tem conta?{' '}
          <Link href="/auth/signup" className="text-emerald-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
        <Link href="/auth/reset-password" className="text-emerald-600 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
    </div>
  )
}
