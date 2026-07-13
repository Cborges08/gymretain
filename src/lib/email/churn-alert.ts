// src/lib/email/churn-alert.ts
// Churn alert email template (Phase 8 — ALRT-02, ALRT-03).
// Plain HTML string template: easy to unit test, no client-side rendering.
// All variables are interpolated from real data — never send with
// unreplaced placeholders (Pitfall 8; the preview endpoint QAs this).

export interface WeeklyHistory {
  /** Label like "01/07 – 07/07" (dd/MM, oldest week first). */
  weekLabel: string
  checkinCount: number
}

export interface ChurnAlertEmailInput {
  gymName: string
  memberName: string
  /** Exact days since last check-in; null = never checked in. */
  daysSinceLastCheckin: number | null
  /** Last 4 weeks of check-in history, oldest first. */
  weeklyHistory: WeeklyHistory[]
  /** Absolute URL to the member profile in the dashboard. */
  memberProfileUrl: string
}

/** Suggested outreach message the admin can copy-paste (ALRT-03). */
export function buildOutreachSuggestion(memberName: string, days: number | null): string {
  const firstName = memberName.trim().split(/\s+/)[0]
  if (days === null) {
    return (
      `Oi ${firstName}! Vimos que você ainda não fez seu primeiro check-in na academia. ` +
      `Que tal começar essa semana? Estamos te esperando! 💪`
    )
  }
  return (
    `Oi ${firstName}! Sentimos sua falta — já faz ${days} dias que você não aparece. ` +
    `Que tal retomar o treino essa semana? Conta com a gente! 💪`
  )
}

export function renderChurnAlertEmail(input: ChurnAlertEmailInput): {
  subject: string
  html: string
} {
  const { gymName, memberName, daysSinceLastCheckin: days, weeklyHistory, memberProfileUrl } = input

  const subject =
    days === null
      ? `⚠️ ${memberName} nunca fez check-in — ${gymName}`
      : `⚠️ ${memberName} está sumido há ${days} dias — ${gymName}`

  const daysLine =
    days === null
      ? 'Este aluno <strong>nunca registrou um check-in</strong>.'
      : `Último check-in há <strong>${days} dias</strong>.`

  const historyRows = weeklyHistory
    .map(
      (w) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${w.weekLabel}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;text-align:right;">
            ${w.checkinCount} check-in${w.checkinCount === 1 ? '' : 's'}
          </td>
        </tr>`
    )
    .join('')

  const suggestion = buildOutreachSuggestion(memberName, days)

  const html = `
<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${gymName} — Alerta de retenção</p>
  <h1 style="font-size:20px;color:#111827;margin:0 0 16px;">${memberName} está em risco de churn</h1>

  <p style="font-size:15px;color:#374151;line-height:1.5;">${daysLine}</p>

  <h2 style="font-size:14px;color:#111827;margin:24px 0 8px;">Frequência nas últimas 4 semanas</h2>
  <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;border-radius:8px;">
    ${historyRows}
  </table>

  <h2 style="font-size:14px;color:#111827;margin:24px 0 8px;">Sugestão de abordagem</h2>
  <p style="font-size:14px;color:#374151;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;line-height:1.5;">
    ${suggestion}
  </p>

  <a href="${memberProfileUrl}"
     style="display:inline-block;margin-top:20px;background:#059669;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">
    Ver perfil do aluno
  </a>

  <p style="font-size:12px;color:#9ca3af;margin-top:28px;">
    Você recebeu este alerta porque o aluno passou 7+ dias sem check-in.
    Marque como &ldquo;Contatado&rdquo; no painel para silenciar novos alertas por 7 dias.
  </p>
</div>`.trim()

  return { subject, html }
}
