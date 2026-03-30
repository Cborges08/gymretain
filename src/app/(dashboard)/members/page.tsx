import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatLastCheckin } from '@/lib/utils/members'

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

  return (
    <div className="bg-gray-50 min-h-full p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Membros</h1>
        <Link
          href="/dashboard/members/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + Novo Membro
        </Link>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Último check-in</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Status</th>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      member.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
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
