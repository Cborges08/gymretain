'use client'

// Phase 6 — DASH-04: inline "Marcar Contatado" button in the member list.
// Same Client Component + useFormState pattern as DeactivateButton (D-03).

import { useFormState, useFormStatus } from 'react-dom'
import { markContactedAction } from '@/lib/actions/churn'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-white text-gray-700 border border-gray-300 px-3 py-1 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Marcando…' : 'Marcar Contatado'}
    </button>
  )
}

export function MarkContactedButton({ memberId }: { memberId: string }) {
  const [state, formAction] = useFormState(markContactedAction, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton />
      {state?.error && (
        <p className="text-xs text-red-600 mt-1">{state.error}</p>
      )}
    </form>
  )
}
