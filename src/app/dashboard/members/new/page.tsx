'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createMemberAction } from '@/lib/actions/members'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

export default function MemberNewPage() {
  const [state, formAction] = useFormState(createMemberAction, null)

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Novo Membro</h1>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <form action={formAction} noValidate>

            {/* Error banner */}
            {state?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{state.error}</p>
              </div>
            )}

            {/* Nome */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-xs font-semibold text-gray-900 mb-1">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Nome completo"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-xs font-semibold text-gray-900 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="email@exemplo.com"
              />
            </div>

            {/* CPF */}
            <div className="mb-4">
              <label htmlFor="cpf" className="block text-xs font-semibold text-gray-900 mb-1">
                CPF
              </label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                inputMode="numeric"
                required
                maxLength={14}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="000.000.000-00"
              />
            </div>

            {/* Telefone (opcional) */}
            <div className="mb-6">
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-900 mb-1">
                Telefone (opcional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <SubmitButton />
              <Link
                href="/dashboard/members"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Cancelar
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
