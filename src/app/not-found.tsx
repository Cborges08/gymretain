// Branded 404 page (Phase 9) — replaces the default Next.js not-found screen.

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-10 max-w-md text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-600 mb-6">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  )
}
