import type { Checkin } from '@/lib/types/database'

const now = Date.now()
const DAY = 24 * 60 * 60 * 1000

export const mockCheckins: Checkin[] = Array.from({ length: 150 }, (_, i) => ({
  id: `c${i + 1}`,
  org_id: 'org1',
  member_id: 'm1',
  checked_in_at: new Date(now - i * DAY).toISOString(),
  ip_address: '192.168.1.1',
  user_agent: null,
  created_at: new Date(now - i * DAY).toISOString(),
}))
