import { describe, it } from 'vitest'

describe('middleware route protection (AUTH-05)', () => {
  it.todo('redirects unauthenticated request to /dashboard to /auth/login')
  it.todo('redirects unauthenticated request to /api/admin/* to /auth/login')
  it.todo('passes authenticated request through to /dashboard')
  it.todo('does not protect non-dashboard, non-api/admin routes')
})
