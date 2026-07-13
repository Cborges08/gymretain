import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { LocalDateTime } from '@/components/LocalDateTime'

// Supabase free tier fits roughly this many rows for the MVP schema —
// the widget is a visual early warning, not a hard quota (Phase 9).
const FREE_TIER_ROW_GUIDE = 100_000

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  // Row counts via head-only queries — no data transferred (Pitfall 5)
  const [membersRes, checkinsRes, alertsRes, orgRes] = org_id
    ? await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('org_id', org_id),
        supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('org_id', org_id),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('org_id', org_id),
        supabase.from('organizations').select('last_churn_check_at').eq('id', org_id).single(),
      ])
    : [null, null, null, null]

  const memberCount = membersRes?.count ?? 0
  const checkinCount = checkinsRes?.count ?? 0
  const alertCount = alertsRes?.count ?? 0
  const totalRows = memberCount + checkinCount + alertCount
  const usagePct = Math.min(100, Math.round((totalRows / FREE_TIER_ROW_GUIDE) * 100))
  const lastChurnCheck = orgRes?.data?.last_churn_check_at ?? null

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Bem-vindo</h1>
      {user?.email && (
        <p className="mt-2 text-sm text-gray-500">{user.email}</p>
      )}

      {/* Churn check visibility (Pitfall 3): a silent cron failure shows up
          here as a stale timestamp */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4 max-w-xl">
        <p className="text-sm font-semibold text-gray-900 mb-1">Verificação de churn</p>
        {lastChurnCheck ? (
          <p className="text-sm text-gray-600">
            Última verificação: <LocalDateTime iso={lastChurnCheck} />
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Nenhuma verificação executada ainda — use &ldquo;Verificar Churn Agora&rdquo; na
            página de membros ou aguarde a execução automática diária (6h UTC).
          </p>
        )}
      </div>

      {/* Free tier usage widget (Phase 9) */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 max-w-xl">
        <p className="text-sm font-semibold text-gray-900 mb-3">Uso do Supabase (free tier)</p>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-xl font-semibold text-gray-900">{memberCount}</p>
            <p className="text-xs text-gray-500">membros</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{checkinCount}</p>
            <p className="text-xs text-gray-500">check-ins</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{alertCount}</p>
            <p className="text-xs text-gray-500">alertas</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={usagePct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-2 rounded-full ${usagePct > 80 ? 'bg-red-500' : usagePct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.max(2, usagePct)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {totalRows.toLocaleString('pt-BR')} linhas de ~{FREE_TIER_ROW_GUIDE.toLocaleString('pt-BR')} confortáveis no plano gratuito
        </p>
      </div>

      <p className="mt-6 text-gray-600">
        <Link href="/dashboard/members" className="text-emerald-600 hover:text-emerald-700 font-medium">
          Ver membros
        </Link>
        {' '}ou selecione uma opção no menu lateral.
      </p>
    </div>
  )
}
