import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { QRCodeDisplay } from './QRCodeDisplay'

export default async function QRCodePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  if (!org_id) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('qr_code_hash, name')
    .eq('id', org_id)
    .single()

  if (!org) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gymretain.vercel.app'
  const qrValue = `${appUrl}/checkin/${org.qr_code_hash}`

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <h1 className="text-2xl font-semibold text-gray-900">QR Code da Academia</h1>
      <p className="text-sm text-gray-600 mt-2 mb-8">
        Seus alunos escaneiam este código para fazer check-in
      </p>
      <QRCodeDisplay qrValue={qrValue} orgName={org.name} />
    </div>
  )
}
