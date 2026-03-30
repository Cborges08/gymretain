'use client'

import { deactivateMemberAction } from '@/lib/actions/members'

interface DeactivateButtonProps {
  memberId: string
}

export function DeactivateButton({ memberId }: DeactivateButtonProps) {
  return (
    <form
      action={deactivateMemberAction}
      onSubmit={(e) => {
        if (
          !confirm(
            'Tem certeza que deseja desativar este membro? Ele não aparecerá na lista de ativos.'
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={memberId} />
      <input type="hidden" name="action" value="deactivate" />
      <button
        type="submit"
        className="bg-red-50 text-red-600 border border-red-200 px-4 h-10 rounded-lg text-sm font-medium hover:bg-red-100"
      >
        Desativar
      </button>
    </form>
  )
}
