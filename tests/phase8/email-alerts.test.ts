/**
 * tests/phase8/email-alerts.test.ts
 * Phase 8 — Email alerts & delivery (ALRT-02, ALRT-03, ALRT-06, ALRT-07).
 *
 * Template tests: real data interpolated, no unreplaced variables (Pitfall 8).
 * sendChurnAlerts tests: pending-alert selection, batch cap, per-email
 * failure isolation, email_sent_at idempotency flag.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Mock Resend before importing the sender module
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

import {
  renderChurnAlertEmail,
  buildOutreachSuggestion,
} from '@/lib/email/churn-alert'
import {
  sendChurnAlerts,
  buildWeeklyHistory,
  getAppBaseUrl,
  EMAIL_BATCH_LIMIT,
} from '@/lib/email/send-churn-alerts'

const DAY = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

describe('renderChurnAlertEmail', () => {
  const input = {
    gymName: 'Academia Teste',
    memberName: 'Maria Oliveira',
    daysSinceLastCheckin: 9,
    weeklyHistory: [
      { weekLabel: '01/06 – 08/06', checkinCount: 3 },
      { weekLabel: '08/06 – 15/06', checkinCount: 1 },
      { weekLabel: '15/06 – 22/06', checkinCount: 0 },
      { weekLabel: '22/06 – 29/06', checkinCount: 0 },
    ],
    memberProfileUrl: 'https://app.test/dashboard/members/abc-123',
  }

  it('includes member name, exact days count, and gym name (ALRT-02)', () => {
    const { subject, html } = renderChurnAlertEmail(input)
    expect(subject).toContain('Maria Oliveira')
    expect(subject).toContain('9 dias')
    expect(subject).toContain('Academia Teste')
    expect(html).toContain('Maria Oliveira')
    expect(html).toContain('<strong>9 dias</strong>')
  })

  it('includes the 4-week check-in history (ALRT-02)', () => {
    const { html } = renderChurnAlertEmail(input)
    expect(html).toContain('01/06 – 08/06')
    expect(html).toContain('3 check-ins')
    expect(html).toContain('1 check-in')
  })

  it('includes a working profile link (ALRT-03)', () => {
    const { html } = renderChurnAlertEmail(input)
    expect(html).toContain('href="https://app.test/dashboard/members/abc-123"')
  })

  it('includes an outreach suggestion with the member first name (ALRT-03)', () => {
    const { html } = renderChurnAlertEmail(input)
    expect(html).toContain('Oi Maria!')
    expect(html).toContain('9 dias')
  })

  it('handles never-checked-in members (days = null)', () => {
    const { subject, html } = renderChurnAlertEmail({ ...input, daysSinceLastCheckin: null })
    expect(subject).toContain('nunca fez check-in')
    expect(html).toContain('nunca registrou um check-in')
  })

  it('leaves no unreplaced template variables (Pitfall 8)', () => {
    const { subject, html } = renderChurnAlertEmail(input)
    for (const text of [subject, html]) {
      expect(text).not.toMatch(/\$\{/)
      expect(text).not.toMatch(/\{\{/)
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('null')
    }
  })
})

describe('buildOutreachSuggestion', () => {
  it('uses only the first name', () => {
    expect(buildOutreachSuggestion('João da Silva', 8)).toContain('Oi João!')
  })
})

// ---------------------------------------------------------------------------
// buildWeeklyHistory
// ---------------------------------------------------------------------------

describe('buildWeeklyHistory', () => {
  it('buckets check-ins into 4 rolling weeks, oldest first', () => {
    const now = new Date('2026-07-13T12:00:00Z')
    const checkins = [
      new Date(now.getTime() - 26 * DAY).toISOString(), // week 1 (oldest)
      new Date(now.getTime() - 25 * DAY).toISOString(), // week 1
      new Date(now.getTime() - 15 * DAY).toISOString(), // week 2
      new Date(now.getTime() - 2 * DAY).toISOString(),  // week 4 (latest)
    ]

    const history = buildWeeklyHistory(checkins, 4, now)

    expect(history).toHaveLength(4)
    expect(history.map((w) => w.checkinCount)).toEqual([2, 1, 0, 1])
    expect(history[0].weekLabel).toMatch(/^\d{2}\/\d{2} – \d{2}\/\d{2}$/)
  })

  it('returns all-zero weeks when there are no check-ins', () => {
    const history = buildWeeklyHistory([])
    expect(history).toHaveLength(4)
    expect(history.every((w) => w.checkinCount === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getAppBaseUrl
// ---------------------------------------------------------------------------

describe('getAppBaseUrl', () => {
  it('prefers NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    expect(getAppBaseUrl()).toBe('https://app.example.com')

    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('VERCEL_URL', 'my-app.vercel.app')
    expect(getAppBaseUrl()).toBe('https://my-app.vercel.app')

    vi.stubEnv('VERCEL_URL', '')
    expect(getAppBaseUrl()).toBe('http://localhost:3000')

    vi.unstubAllEnvs()
  })
})

// ---------------------------------------------------------------------------
// sendChurnAlerts
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string } }

function buildSendMock({
  alertsResult,
  membersResult = { data: [], error: null },
  orgsResult = { data: [], error: null },
  checkinsResult = { data: [], error: null },
  updateError = null,
}: {
  alertsResult: MockResult
  membersResult?: MockResult
  orgsResult?: MockResult
  checkinsResult?: MockResult
  updateError?: null | { message: string }
}) {
  // alerts select chain: .select().is().is().is().order().limit()
  const alertsLimit = vi.fn().mockResolvedValue(alertsResult)
  const alertsOrder = vi.fn().mockReturnValue({ limit: alertsLimit })
  const alertsIs3 = vi.fn().mockReturnValue({ order: alertsOrder })
  const alertsIs2 = vi.fn().mockReturnValue({ is: alertsIs3 })
  const alertsIs1 = vi.fn().mockReturnValue({ is: alertsIs2 })
  const alertsSelect = vi.fn().mockReturnValue({ is: alertsIs1 })

  // alerts update chain: .update().eq()
  const alertsUpdateEq = vi.fn().mockResolvedValue({ error: updateError })
  const alertsUpdate = vi.fn().mockReturnValue({ eq: alertsUpdateEq })

  // members chain: .select().in()
  const membersIn = vi.fn().mockResolvedValue(membersResult)
  const membersSelect = vi.fn().mockReturnValue({ in: membersIn })

  // orgs chain: .select().in()
  const orgsIn = vi.fn().mockResolvedValue(orgsResult)
  const orgsSelect = vi.fn().mockReturnValue({ in: orgsIn })

  // checkins chain: .select().in().gte()
  const checkinsGte = vi.fn().mockResolvedValue(checkinsResult)
  const checkinsIn = vi.fn().mockReturnValue({ gte: checkinsGte })
  const checkinsSelect = vi.fn().mockReturnValue({ in: checkinsIn })

  const from = vi.fn((table: string) => {
    if (table === 'alerts') return { select: alertsSelect, update: alertsUpdate }
    if (table === 'members') return { select: membersSelect }
    if (table === 'organizations') return { select: orgsSelect }
    if (table === 'checkins') return { select: checkinsSelect }
    return {}
  })

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    alertsLimit,
    alertsUpdate,
    alertsUpdateEq,
  }
}

const baseAlert = { id: 'a1', member_id: 'm1', org_id: 'org1' }
const baseMember = {
  id: 'm1',
  name: 'Carlos Souza',
  last_checked_in: new Date(Date.now() - 10 * DAY).toISOString(),
  status: 'active',
}
const baseOrg = { id: 'org1', name: 'Academia X', admin_email: 'dono@academia.com' }

describe('sendChurnAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  it('sends an email per pending alert and sets email_sent_at (ALRT-02, idempotency)', async () => {
    const { client, alertsUpdate, alertsUpdateEq } = buildSendMock({
      alertsResult: { data: [baseAlert], error: null },
      membersResult: { data: [baseMember], error: null },
      orgsResult: { data: [baseOrg], error: null },
    })

    const result = await sendChurnAlerts(client)

    expect(result).toEqual({ attempted: 1, sent: 1, failed: 0, skipped: 0 })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const sendArgs = mockSend.mock.calls[0][0]
    expect(sendArgs.to).toBe('dono@academia.com')
    expect(sendArgs.subject).toContain('Carlos Souza')
    expect(sendArgs.html).toContain('/dashboard/members/m1')
    // email_sent_at flag set right after the send
    expect(alertsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ email_sent_at: expect.any(String) })
    )
    expect(alertsUpdateEq).toHaveBeenCalledWith('id', 'a1')
  })

  it('caps the batch at 100 alerts per run (ALRT-07)', async () => {
    const { client, alertsLimit } = buildSendMock({
      alertsResult: { data: [], error: null },
    })

    await sendChurnAlerts(client)

    expect(EMAIL_BATCH_LIMIT).toBe(100)
    expect(alertsLimit).toHaveBeenCalledWith(100)
  })

  it('a failed send does not block other emails (ALRT-06)', async () => {
    const alerts = [
      { id: 'a1', member_id: 'm1', org_id: 'org1' },
      { id: 'a2', member_id: 'm2', org_id: 'org1' },
    ]
    const members = [
      baseMember,
      { ...baseMember, id: 'm2', name: 'Ana Lima' },
    ]
    const { client, alertsUpdateEq } = buildSendMock({
      alertsResult: { data: alerts, error: null },
      membersResult: { data: members, error: null },
      orgsResult: { data: [baseOrg], error: null },
    })

    mockSend
      .mockRejectedValueOnce(new Error('Resend API down'))
      .mockResolvedValueOnce({ data: { id: 'email-2' }, error: null })

    const result = await sendChurnAlerts(client)

    expect(result.sent).toBe(1)
    expect(result.failed).toBe(1)
    // Only the successful alert got its flag set
    expect(alertsUpdateEq).toHaveBeenCalledTimes(1)
    expect(alertsUpdateEq).toHaveBeenCalledWith('id', 'a2')
  })

  it('counts a Resend error response (not throw) as failed', async () => {
    const { client } = buildSendMock({
      alertsResult: { data: [baseAlert], error: null },
      membersResult: { data: [baseMember], error: null },
      orgsResult: { data: [baseOrg], error: null },
    })
    mockSend.mockResolvedValue({ data: null, error: { message: 'invalid api key' } })

    const result = await sendChurnAlerts(client)
    expect(result).toMatchObject({ sent: 0, failed: 1 })
  })

  it('skips alerts for deactivated members without emailing', async () => {
    const { client } = buildSendMock({
      alertsResult: { data: [baseAlert], error: null },
      membersResult: { data: [{ ...baseMember, status: 'inactive' }], error: null },
      orgsResult: { data: [baseOrg], error: null },
    })

    const result = await sendChurnAlerts(client)
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 0, skipped: 1 })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns zeros when no alerts are pending', async () => {
    const { client } = buildSendMock({ alertsResult: { data: [], error: null } })
    const result = await sendChurnAlerts(client)
    expect(result).toEqual({ attempted: 0, sent: 0, failed: 0, skipped: 0 })
    expect(mockSend).not.toHaveBeenCalled()
  })
})
