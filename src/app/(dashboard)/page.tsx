import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Bem-vindo</h1>
      {user?.email && (
        <p className="mt-2 text-sm text-gray-500">{user.email}</p>
      )}
      <p className="mt-4 text-gray-600">
        Selecione uma opção no menu lateral para começar.
      </p>
    </div>
  )
}
