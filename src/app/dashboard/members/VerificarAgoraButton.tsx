'use client'

// Phase 6 — DASH-05: manual churn check trigger in the page header.
// Secondary (outlined) style to differentiate from the primary "+ Novo Membro"
// action (D-07). Pending state prevents double-clicks (D-09).

import { useState, useTransition } from 'react'
import { runChurnCheckAction } from '@/lib/actions/churn'

export function VerificarAgoraButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await runChurnCheckAction()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="bg-white text-emerald-700 border border-emerald-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Verificando…' : 'Verificar Churn Agora'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
