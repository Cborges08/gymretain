import type { Member } from '@/lib/types/database'

const now = Date.now()
const DAY = 24 * 60 * 60 * 1000

export const mockMembers: Member[] = [
  {
    id: 'm1',
    org_id: 'org1',
    name: 'Ana Lima',
    email: 'ana@example.com',
    cpf: null,
    phone: null,
    last_checked_in: null, // Never checked in → Inactive, appears first in nullsFirst sort
    status: 'active',
    external_id: null,
    created_at: new Date(now - 90 * DAY).toISOString(),
    updated_at: new Date(now - 90 * DAY).toISOString(),
  },
  {
    id: 'm2',
    org_id: 'org1',
    name: 'Bruno Costa',
    email: 'bruno@example.com',
    cpf: null,
    phone: null,
    last_checked_in: new Date(now - 9 * DAY).toISOString(), // 9 days ago → Inactive (days > 7)
    status: 'active',
    external_id: null,
    created_at: new Date(now - 60 * DAY).toISOString(),
    updated_at: new Date(now - 9 * DAY).toISOString(),
  },
  {
    id: 'm3',
    org_id: 'org1',
    name: 'Carla Souza',
    email: 'carla@example.com',
    cpf: null,
    phone: null,
    last_checked_in: new Date(now - 6 * DAY).toISOString(), // 6 days ago → At-risk (4 < days ≤ 7)
    status: 'active',
    external_id: null,
    created_at: new Date(now - 60 * DAY).toISOString(),
    updated_at: new Date(now - 6 * DAY).toISOString(),
  },
  {
    id: 'm4',
    org_id: 'org1',
    name: 'Diego Ferreira',
    email: 'diego@example.com',
    cpf: null,
    phone: null,
    last_checked_in: new Date(now - 4 * DAY).toISOString(), // 4 days ago → Active (days ≤ 4)
    status: 'active',
    external_id: null,
    created_at: new Date(now - 30 * DAY).toISOString(),
    updated_at: new Date(now - 4 * DAY).toISOString(),
  },
  {
    id: 'm5',
    org_id: 'org1',
    name: 'Eva Rodrigues',
    email: 'eva@example.com',
    cpf: null,
    phone: null,
    last_checked_in: new Date(now - 1 * DAY).toISOString(), // 1 day ago → Active (days ≤ 4)
    status: 'active',
    external_id: null,
    created_at: new Date(now - 30 * DAY).toISOString(),
    updated_at: new Date(now - 1 * DAY).toISOString(),
  },
  {
    id: 'm6',
    org_id: 'org1',
    name: 'Felipe Santos',
    email: 'felipe@example.com',
    cpf: null,
    phone: null,
    last_checked_in: new Date(now).toISOString(), // Today → Active (days = 0)
    status: 'active',
    external_id: null,
    created_at: new Date(now - 14 * DAY).toISOString(),
    updated_at: new Date(now).toISOString(),
  },
]
