import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { deactivateMemberAction } from '@/lib/actions/members'
import { maskCpf } from '@/lib/utils/cpf'
import { DeactivateButton } from './DeactivateButton'

interface Props {
  params: { id: string }
}

export default async function MemberProfilePage({ params }: Props) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  if (!org_id) notFound()

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', org_id)
    .single()

  if (!member) notFound()

  const joinDate = new Date(member.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const lastCheckin = member.last_checked_in
    ? new Date(member.last_checked_in).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-gray-50 min-h-full p-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/members" className="text-sm text-gray-500 hover:text-gray-900">
          Membros
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900">{member.name}</span>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{member.name}</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">

        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</p>
            <p className="text-sm text-gray-900 mt-1">{member.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
            <p className="text-sm text-gray-900 mt-1">{member.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CPF</p>
            <p className="text-sm text-gray-900 mt-1">{maskCpf(member.cpf)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone</p>
            <p className="text-sm text-gray-900 mt-1">{member.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data de cadastro</p>
            <p className="text-sm text-gray-900 mt-1">{joinDate}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Último check-in</p>
            <p className="text-sm text-gray-900 mt-1">
              {lastCheckin ?? 'Nunca'}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                member.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {member.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>

            <Link
              href={`/dashboard/members/${member.id}/edit`}
              className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700 inline-flex items-center"
            >
              Editar
            </Link>

            {/* Deactivate / Reactivate */}
            {member.status === 'active' ? (
              <DeactivateButton memberId={member.id} />
            ) : (
              <form action={deactivateMemberAction}>
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="action" value="reactivate" />
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Reativar
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Check-in History placeholder */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Histórico de check-ins</h2>
          <p className="text-sm text-gray-500">Histórico disponível na fase 5.</p>
        </div>

      </div>
    </div>
  )
}
