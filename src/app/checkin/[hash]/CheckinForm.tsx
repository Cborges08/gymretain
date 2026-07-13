'use client'

import { useState } from 'react'
import { stripCpf } from '@/lib/utils/cpf'

interface CheckinFormProps {
  orgId: string
  orgName: string
  qrHash: string
}

export function CheckinForm({ orgId: _orgId, orgName: _orgName, qrHash }: CheckinFormProps) {
  const [cpf, setCpf] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ name: string; checkedInAt: string } | null>(null)

  // D-07: CPF mask handler — vanilla JS, no new dependency
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.length > 11) digits = digits.slice(0, 11)
    // Format as 000.000.000-00
    let formatted = digits
    if (digits.length > 9) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`
    }
    setCpf(formatted)
  }

  // D-09, D-10: Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const cleanCpf = stripCpf(cpf)
    // D-08: Client validates 11 digits before submitting
    if (!cleanCpf) {
      setError('CPF é obrigatório')
      return
    }
    if (cleanCpf.length !== 11) {
      setError('CPF deve ter 11 dígitos')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_hash: qrHash, cpf: cleanCpf }),
      })
      const data = await res.json() as { ok: boolean; code?: string; memberName?: string; checkedInAt?: string }

      if (!data.ok) {
        // D-13: Generic error — no distinction between "not found" vs "inactive"
        if (data.code === 'DUPLICATE' && data.checkedInAt) {
          // D-14: Show previous check-in time in HH:MM format
          const prevTime = new Date(data.checkedInAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          setError(`Você já fez check-in hoje às ${prevTime}.`)
        } else if (data.code === 'NOT_FOUND') {
          setError('CPF não encontrado ou não cadastrado.')
        } else if (data.code === 'INVALID_HASH') {
          setError('QR Code inválido.')
        } else if (data.code === 'RATE_LIMITED') {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
        } else {
          setError('Não foi possível registrar seu check-in. Tente novamente.')
        }
      } else {
        setSuccess({ name: data.memberName!, checkedInAt: data.checkedInAt! })
      }
    } catch {
      setError('Não foi possível registrar seu check-in. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  // D-15: Success screen
  if (success) {
    const dt = new Date(success.checkedInAt)
    const day = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hour = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const formatted = `${day} às ${hour.replace(':', 'h')}`
    // Extract first name only
    const firstName = success.name.split(' ')[0]

    return (
      <div className="text-center">
        <p className="text-2xl font-semibold text-emerald-600 mb-4">✓ Check-in registrado!</p>
        <p className="text-lg font-semibold text-gray-900 mb-2">Bem-vindo, {firstName}!</p>
        <p className="text-sm text-gray-600">{formatted}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <input
          type="text"
          id="cpf"
          name="cpf"
          value={cpf}
          onChange={handleCpfChange}
          placeholder="000.000.000-00"
          maxLength={14}
          disabled={pending}
          aria-label="CPF"
          aria-describedby={error ? 'cpf-error' : undefined}
          className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && (
          <p id="cpf-error" className="text-red-500 text-xs mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait mt-2"
      >
        {pending ? 'Registrando...' : 'Confirmar Check-in'}
      </button>
    </form>
  )
}
