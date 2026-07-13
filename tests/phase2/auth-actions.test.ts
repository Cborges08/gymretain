import { describe, it } from 'vitest'

// Stubs pass immediately — implementation fills in real assertions in Task 1
describe('signupAction (AUTH-01)', () => {
  it.todo('creates an organizations record on successful signup')
  it.todo('sets app_metadata.org_id in the JWT via admin API')
  it.todo('returns { error } when signup fails (e.g., email already in use)')
  it.todo('deletes user if org creation fails (no orphaned auth records)')
})

describe('loginAction (AUTH-02)', () => {
  it.todo('redirects to /dashboard on valid credentials')
  it.todo('returns { error: "Email ou senha incorretos" } on invalid credentials')
})

describe('logoutAction (AUTH-03)', () => {
  it.todo('calls signOut and redirects to /auth/login')
})

describe('requestPasswordReset (AUTH-06)', () => {
  it.todo('calls resetPasswordForEmail with redirectTo pointing to /auth/reset-password')
  it.todo('returns { success: true } on success')
  it.todo('returns { error } if resetPasswordForEmail fails')
})

describe('confirmPasswordReset (AUTH-06)', () => {
  it.todo('calls verifyOtp then updateUser with the new password')
  it.todo('returns { error: "Link expirado ou inválido. Solicite um novo." } when token is invalid')
})
