import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers (required by createServerClient)
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({})) }))

// Mock next/navigation
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// Mock the Supabase server client
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

describe('createMemberAction — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { org_id: 'org-123' } } },
    })
  })

  it('returns error when name is empty', async () => {
    const { createMemberAction } = await import('@/lib/actions/members')
    const fd = new FormData()
    fd.set('name', '')
    fd.set('email', 'test@test.com')
    fd.set('cpf', '12345678901')
    const result = await createMemberAction(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when CPF has wrong format', async () => {
    const { createMemberAction } = await import('@/lib/actions/members')
    const fd = new FormData()
    fd.set('name', 'João')
    fd.set('email', 'joao@test.com')
    fd.set('cpf', '123')
    const result = await createMemberAction(null, fd)
    expect(result.error).toMatch(/CPF/i)
  })
})

describe('updateMemberAction — validation', () => {
  it('returns error when name is empty', async () => {
    const { updateMemberAction } = await import('@/lib/actions/members')
    const fd = new FormData()
    fd.set('id', 'member-123')
    fd.set('name', '')
    fd.set('email', 'joao@test.com')
    fd.set('cpf', '12345678901')
    const result = await updateMemberAction(null, fd)
    expect(result.error).toBeDefined()
  })
})
