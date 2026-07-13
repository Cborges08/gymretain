'use client'

// Global error boundary (Phase 9) — friendly page instead of a blank screen
// or raw stack trace when a Server Component or render throws.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-10 max-w-md text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Algo deu errado</h1>
        <p className="text-sm text-gray-600 mb-6">
          Ocorreu um erro inesperado. Tente novamente — se o problema continuar,
          recarregue a página.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
