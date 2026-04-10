'use client'

import { useFormState } from 'react-dom'
import { deactivateMemberAction } from '@/lib/actions/members'

interface ReactivateButtonProps {
  memberId: string
}

export function ReactivateButton({ memberId }: ReactivateButtonProps) {
  const [, formAction] = useFormState(deactivateMemberAction, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={memberId} />
      <input type="hidden" name="action" value="reactivate" />
      <button
        type="submit"
        className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700"
      >
        Reativar
      </button>
    </form>
  )
}
