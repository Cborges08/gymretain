/**
 * tests/checkin/checkin-page.test.tsx
 * Tests for CHKN-01 and CHKN-06: the public check-in page Server Component.
 *
 * Strategy: vitest env is 'node'. Since @testing-library/react is not installed,
 * we call the async Server Component function directly and use
 * ReactDOMServer.renderToStaticMarkup to convert the JSX to an HTML string.
 */
import { vi, describe, it, expect, afterEach } from 'vitest'

// Mock the Supabase server client BEFORE importing the page
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

// Mock next/headers (used by createServerClient internally but we mock at the module level)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}))

import { createServerClient } from '@/lib/supabase/server'
import ReactDOMServer from 'react-dom/server'

const mockCreateServerClient = vi.mocked(createServerClient)

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * Helper: build a mock Supabase client that resolves the organizations.select chain.
 * Returns { data, error } when .single() is called.
 */
function buildMockClient(response: { data: unknown; error: unknown }) {
  const mockSingle = vi.fn().mockResolvedValue(response)
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
  return { from: mockFrom }
}

describe('CheckinPage — CHKN-01 (valid QR hash)', () => {
  it('renders gym name when QR hash is valid', async () => {
    const org = { id: 'org-1', name: 'Academia Força', qr_code_hash: 'abc123' }
    mockCreateServerClient.mockReturnValue(buildMockClient({ data: org, error: null }) as never)

    // Import AFTER mock is set up — dynamic import to reload fresh module
    const { default: CheckinPage } = await import('@/app/checkin/[hash]/page')

    const jsx = await CheckinPage({ params: { hash: 'abc123' } })
    const html = ReactDOMServer.renderToStaticMarkup(jsx as React.ReactElement)

    expect(html).toContain('Academia Força')
  })

  it('renders CPF input when QR hash is valid', async () => {
    const org = { id: 'org-1', name: 'Academia Força', qr_code_hash: 'abc123' }
    mockCreateServerClient.mockReturnValue(buildMockClient({ data: org, error: null }) as never)

    const { default: CheckinPage } = await import('@/app/checkin/[hash]/page')

    const jsx = await CheckinPage({ params: { hash: 'abc123' } })
    const html = ReactDOMServer.renderToStaticMarkup(jsx as React.ReactElement)

    // The CheckinForm renders an input with aria-label="CPF" and placeholder containing CPF
    expect(html.toLowerCase()).toContain('cpf')
  })
})

describe('CheckinPage — CHKN-06 (invalid QR hash)', () => {
  it('renders error card when QR hash is invalid', async () => {
    mockCreateServerClient.mockReturnValue(
      buildMockClient({ data: null, error: { message: 'not found' } }) as never,
    )

    const { default: CheckinPage } = await import('@/app/checkin/[hash]/page')

    const jsx = await CheckinPage({ params: { hash: 'invalid-hash' } })
    const html = ReactDOMServer.renderToStaticMarkup(jsx as React.ReactElement)

    expect(html).toContain('QR Code inválido')
  })
})
