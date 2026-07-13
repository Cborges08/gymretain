'use client'

// Renders a UTC timestamp in the admin's browser timezone (Phase 9, Pitfall 10).
// Server Components render dates in the server TZ (UTC on Vercel); this
// component re-renders after hydration with the viewer's local time. The
// UTC value is the no-JS/pre-hydration fallback.

import { useEffect, useState } from 'react'

type Mode = 'date' | 'time' | 'datetime'

function format(iso: string, mode: Mode, utc: boolean): string {
  const dt = new Date(iso)
  const tz = utc ? { timeZone: 'UTC' as const } : {}
  const date = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz })
  const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tz })
  if (mode === 'date') return date
  if (mode === 'time') return time
  return `${date} ${time}`
}

export function LocalDateTime({ iso, mode = 'datetime' }: { iso: string; mode?: Mode }) {
  const [text, setText] = useState(() => format(iso, mode, true))

  useEffect(() => {
    setText(format(iso, mode, false))
  }, [iso, mode])

  return <span suppressHydrationWarning>{text}</span>
}
