import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { EditMemberForm } from './EditMemberForm'

interface Props {
  params: { id: string }
}

export default async function MemberEditPage({ params }: Props) {
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

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <a href="/members" className="text-sm text-gray-500 hover:text-gray-900">
            Membros
          </a>
          <span className="text-gray-300">/</span>
          <a
            href={`/members/${member.id}`}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            {member.name}
          </a>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900">Editar</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Editar Membro</h1>
        <EditMemberForm member={member} />
      </div>
    </div>
  )
}
