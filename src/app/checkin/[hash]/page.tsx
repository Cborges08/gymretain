import { createServerClient } from '@/lib/supabase/server'
import { CheckinForm } from './CheckinForm'

interface CheckinPageProps {
  params: { hash: string }
}

interface OrgRow {
  id: string
  name: string
}

export default async function CheckinPage({ params }: CheckinPageProps) {
  const supabase = createServerClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('qr_code_hash', params.hash)
    .single() as { data: OrgRow | null; error: { message: string } | null }

  // Full-screen emerald layout (same for both valid and error states)
  // Per D-04: bg-emerald-600 full-screen, centered white card, mobile-first
  const wrapper = 'bg-emerald-600 min-h-screen flex items-center justify-center p-4'
  const card = 'bg-white border border-gray-200 rounded-lg shadow-md p-8 w-full max-w-sm'

  if (error || !org) {
    // D-12: Render inline error card — no 500 error, no redirect
    return (
      <div className={wrapper}>
        <div className={card}>
          <h1 className="text-lg font-semibold text-red-500 mb-2">
            QR Code inválido
          </h1>
          <p className="text-sm text-gray-600">
            Este código não foi encontrado. Fale com seu professor.
          </p>
        </div>
      </div>
    )
  }

  // Valid QR: render form card
  // D-05: Card shows gym name heading, subtitle, then CheckinForm
  return (
    <div className={wrapper}>
      <div className={card}>
        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-1">
          {org.name}
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Registre seu check-in
        </p>
        {/* D-03: CheckinForm is Client Component; receives orgId, orgName, qrHash */}
        <CheckinForm
          orgId={org.id}
          orgName={org.name}
          qrHash={params.hash}
        />
      </div>
    </div>
  )
}
