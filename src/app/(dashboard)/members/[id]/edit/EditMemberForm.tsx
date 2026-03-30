'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateMemberAction } from '@/lib/actions/members'
import { formatCpf } from '@/lib/utils/cpf'
import type { Member } from '@/lib/types/database'

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

export function EditMemberForm({ member }: { member: Member }) {
  const [state, formAction] = useFormState(updateMemberAction, null)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <form action={formAction} noValidate>
        <input type="hidden" name="id" value={member.id} />

        {/* Error banner */}
        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{state.error}</p>
          </div>
        )}

        {/* Nome */}
        <div className="mb-4">
          <label htmlFor="edit-name" className="block text-xs font-semibold text-gray-900 mb-1">
            Nome
          </label>
          <input
            id="edit-name"
            name="name"
            type="text"
            required
            defaultValue={member.name}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="edit-email" className="block text-xs font-semibold text-gray-900 mb-1">
            Email
          </label>
          <input
            id="edit-email"
            name="email"
            type="email"
            required
            defaultValue={member.email}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* CPF — full unmasked value per D-14 */}
        <div className="mb-4">
          <label htmlFor="edit-cpf" className="block text-xs font-semibold text-gray-900 mb-1">
            CPF
          </label>
          <input
            id="edit-cpf"
            name="cpf"
            type="text"
            inputMode="numeric"
            required
            maxLength={14}
            defaultValue={member.cpf ? formatCpf(member.cpf) : ''}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Telefone (opcional) */}
        <div className="mb-6">
          <label htmlFor="edit-phone" className="block text-xs font-semibold text-gray-900 mb-1">
            Telefone (opcional)
          </label>
          <input
            id="edit-phone"
            name="phone"
            type="tel"
            defaultValue={member.phone ?? ''}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <SubmitButton />
          <Link
            href={`/dashboard/members/${member.id}`}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Cancelar
          </Link>
        </div>

      </form>
    </div>
  )
}
