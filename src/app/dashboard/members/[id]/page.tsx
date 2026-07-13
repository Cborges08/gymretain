import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { maskCpf } from '@/lib/utils/cpf'
import { getPaginationRange, getTotalPages } from '@/lib/utils/members'
import { DeactivateButton } from './DeactivateButton'
import { ReactivateButton } from './ReactivateButton'

interface Props {
  params: { id: string }
  searchParams: { page?: string }
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
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

  const PAGE_SIZE = 50
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const { from, to } = getPaginationRange(currentPage, PAGE_SIZE)

  const { data: checkins, count: totalCount } = await supabase
    .from('checkins')
    .select('id, checked_in_at, ip_address', { count: 'exact' })
    .eq('member_id', params.id)
    .order('checked_in_at', { ascending: false })
    .range(from, to)

  const checkinList = checkins ?? []
  const totalPages = getTotalPages(totalCount ?? 0, PAGE_SIZE)

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
              href={`/members/${member.id}/edit`}
              className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700 inline-flex items-center"
            >
              Editar
            </Link>

            {/* Deactivate / Reactivate */}
            {member.status === 'active' ? (
              <DeactivateButton memberId={member.id} />
            ) : (
              <ReactivateButton memberId={member.id} />
            )}
          </div>
        </div>

        {/* Check-in History — DASH-03 */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Histórico de check-ins</h2>

          {checkinList.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum check-in registrado</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Horário</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkinList.map((checkin) => {
                      const dt = new Date(checkin.checked_in_at)
                      const date = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <tr key={checkin.id} className="border-b border-gray-200 last:border-0">
                          <td className="px-4 py-3 text-gray-900">{date}</td>
                          <td className="px-4 py-3 text-gray-600">{time}</td>
                          <td className="px-4 py-3 text-gray-600">{checkin.ip_address ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={`?page=${currentPage - 1}`}
                    className={`text-sm px-3 py-2 rounded border border-gray-200 ${
                      currentPage <= 1
                        ? 'text-gray-300 pointer-events-none'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={currentPage <= 1}
                  >
                    Página anterior
                  </Link>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Link
                    href={`?page=${currentPage + 1}`}
                    className={`text-sm px-3 py-2 rounded border border-gray-200 ${
                      currentPage >= totalPages
                        ? 'text-gray-300 pointer-events-none'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={currentPage >= totalPages}
                  >
                    Próxima página
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
