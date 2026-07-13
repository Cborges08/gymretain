import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getDaysAgo, formatLastCheckin, classifyRisk, computeCounters } from '@/lib/utils/members'
import { CONTACT_SILENCE_DAYS } from '@/lib/utils/churn'
import { MarkContactedButton } from './MarkContactedButton'
import { VerificarAgoraButton } from './VerificarAgoraButton'

export default async function MembersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  const { data: members } = org_id
    ? await supabase
        .from('members')
        .select('id, name, email, last_checked_in, status')
        .eq('org_id', org_id)
        .eq('status', 'active')
        .order('last_checked_in', { ascending: true, nullsFirst: true })
    : { data: [] }

  const memberList = members ?? []
  const counters = computeCounters(memberList)

  // Contacted members (D-16): open alerts marked contacted within the 7-day
  // silence window. Set gives O(1) lookup per table row.
  const contactCutoff = new Date(
    Date.now() - CONTACT_SILENCE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const { data: contactedAlerts } = org_id
    ? await supabase
        .from('alerts')
        .select('member_id')
        .eq('org_id', org_id)
        .is('resolved_at', null)
        .gte('contact_marked_at', contactCutoff)
    : { data: [] }

  const contactedIds = new Set((contactedAlerts ?? []).map((a) => a.member_id))

  return (
    <div className="bg-gray-50 min-h-full p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Membros</h1>
        <div className="flex items-center gap-3">
          <VerificarAgoraButton />
          <Link
            href="/dashboard/members/new"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Novo Membro
          </Link>
        </div>
      </div>

      {/* Risk counters — per D-06, D-07, D-08 */}
      <div className="flex gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[120px]">
          <p className="text-2xl font-semibold text-gray-900">{counters.active}</p>
          <p className="text-sm text-gray-900">Ativos</p>
          <p className="text-xs text-gray-500">até 4 dias</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[120px]">
          <p className="text-2xl font-semibold text-gray-900">{counters.atRisk}</p>
          <p className="text-sm text-gray-900">Em risco</p>
          <p className="text-xs text-gray-500">4-7 dias</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[120px]">
          <p className="text-2xl font-semibold text-gray-900">{counters.inactive}</p>
          <p className="text-sm text-gray-900">Inativos</p>
          <p className="text-xs text-gray-500">7+ dias</p>
        </div>
      </div>

      {/* Empty state */}
      {memberList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-900 font-semibold text-lg mb-2">Nenhum membro cadastrado</p>
          <p className="text-gray-600 text-sm">
            Comece criando o primeiro membro da academia. Clique em &ldquo;+ Novo Membro&rdquo; para começar.
          </p>
        </div>
      ) : (
        /* Member table */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Dias sem aparecer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Nível de risco</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Ação</th>
              </tr>
            </thead>
            <tbody>
              {memberList.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/dashboard/members/${member.id}`}
                      className="font-medium hover:text-emerald-600 block w-full"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatLastCheckin(member.last_checked_in)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const days = getDaysAgo(member.last_checked_in)
                      const risk = classifyRisk(days)
                      const styles = {
                        active: 'bg-emerald-100 text-emerald-700',
                        at_risk: 'bg-amber-100 text-amber-700',
                        inactive: 'bg-gray-100 text-gray-500',
                      }
                      const labels = {
                        active: 'Ativo',
                        at_risk: 'Em risco',
                        inactive: 'Inativo',
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[risk]}`}>
                          {labels[risk]}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      // Ação column (D-01/D-04/D-05): only at-risk/inactive
                      // members get an action — button OR badge, never both.
                      const risk = classifyRisk(getDaysAgo(member.last_checked_in))
                      if (risk === 'active') return null
                      if (contactedIds.has(member.id)) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            Contatado
                          </span>
                        )
                      }
                      return <MarkContactedButton memberId={member.id} />
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
