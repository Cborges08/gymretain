# Phase 2: Admin Authentication - Research

**Researched:** 2026-03-26
**Domain:** Supabase Auth integration with Next.js 14, custom JWT claims (org_id), session management, middleware protection, password reset flow
**Confidence:** HIGH

## Summary

Phase 2 establishes a complete authentication system for the admin user: account creation (signup), login with session persistence, logout, password reset, and route protection via Next.js middleware. The core challenge is correctly implementing org_id as a custom JWT claim so that all future RLS policies can scope data by organization. Session persistence across browser refreshes and tabs requires middleware to handle token refresh and cookie management.

The critical architectural decision from Phase 1 carries forward: org_id must be stored in JWT app_metadata (not React state or cookies) because RLS policies evaluate claims at the database level. This phase implements that decision at the auth layer.

**Primary recommendation:** Implement org_id insertion and JWT population using a three-step flow: (1) Create organization record with placeholder name immediately after signup success, (2) Use `admin.auth.updateUserById()` from a server action to set app_metadata.org_id with the new org's ID, (3) Ensure middleware refreshes the session so the next request includes the updated token. Protect routes via a standard Next.js middleware that checks `getUser()` (not `getSession()`) and redirects unauthenticated traffic to `/auth/login`. Test with DevTools JWT decoding to verify app_metadata.org_id is present in both local and post-refresh tokens.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 1-step signup — email and password only. No gym name collected during signup.
- **D-02:** Org record created silently on first signup with a placeholder name (e.g., "Minha Academia"). Admin renames it in a future settings phase.
- **D-03:** `org_id` stored in JWT custom claims (`app_metadata.org_id`) at signup — RLS policies in future phases depend on this being present in the token, not in React state or cookies.
- **D-04:** Minimal centered card layout — white card on light gray background (`bg-gray-50`). Logo/app name ("GymRetain") above the form.
- **D-05:** Primary color: green/energy tone (e.g., Tailwind `green-600` or `emerald-600`). This becomes the app-wide primary color for buttons, links, and active states.
- **D-06:** No split layout, no full-page gradient — clean and fast to build.
- **D-07:** Form errors displayed inline — red message directly below the relevant input field.
- **D-08:** All UI text and error messages in **Portuguese (pt-BR)**.
- **D-09:** After successful login → redirect to `/dashboard`.
- **D-10:** `/dashboard` in Phase 2 is a **minimal placeholder with nav sidebar** — shows a sidebar with navigation links and a "Bem-vindo" heading. Provides the app shell layout (`DashboardLayout`) that all future dashboard phases will reuse.
- **D-11:** After logout → redirect to `/auth/login`.
- **D-12:** Visiting `/` when logged in → redirect to `/dashboard`. Visiting `/` when not logged in → stay on landing page (or redirect to `/auth/login` — Claude's discretion).
- **D-13:** Next.js middleware protects `/dashboard/:path*` AND `/api/admin/:path*`. Unauthenticated requests redirect to `/auth/login`.
- **D-14:** Password reset email link redirects to `/auth/reset-password` (a form in the app) where the admin sets a new password — not Supabase's hosted UI.

### Claude's Discretion
- Exact Tailwind shade for green primary (green-600 vs emerald-600 vs teal-600) — pick whichever looks best
- Loading/spinner state during form submission — Claude decides approach
- Whether to use `react-hook-form` or native form state — Claude decides based on simplicity
- Exact sidebar nav structure (icons vs text-only) — Claude decides
- Redirect on `/` when not logged in — stay on landing page or go to `/auth/login` — Claude's choice

### Deferred Ideas (OUT OF SCOPE)
- **Multi-gym per account / gym selection screen** — Multi-tenant functionality explicitly Out of Scope for MVP; candidate for v2 (MULT-01, MULT-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Admin pode criar conta com email e senha | Supabase Auth signup with `signUp()`, organization record created on success, org_id stored in app_metadata via admin API |
| AUTH-02 | Admin pode fazer login com email e senha | Supabase Auth login with `signInWithPassword()`, session stored in cookies via auth-helpers-nextjs, middleware refreshes token |
| AUTH-03 | Admin pode fazer logout | Supabase Auth `signOut()` clears cookies, middleware redirects to `/auth/login` |
| AUTH-04 | Sessão persiste entre refreshes do browser | Cookie-based session management via auth-helpers-nextjs, middleware handles token refresh and Set-Cookie response headers |
| AUTH-05 | Rotas do dashboard são protegidas por middleware | Next.js middleware checks `getUser()` (not getSession), redirects unauthenticated to `/auth/login`, covers `/dashboard/:path*` and `/api/admin/:path*` |
| AUTH-06 | Admin pode resetar senha via email | `resetPasswordForEmail()` sends link to `/auth/reset-password`, `verifyOtp()` validates token, `updateUser()` sets new password |
</phase_requirements>

---

## Standard Stack

### Core Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/auth-helpers-nextjs | ^0.15.0 | Manages session cookies, provides `createServerClient`, `createBrowserClient` | Officially recommended by Supabase for Next.js SSR; handles token refresh automatically |
| @supabase/supabase-js | ^2.100.0 | Core Supabase client for auth, database queries | Already installed in Phase 1; production-ready |
| next | 14.2.35 | Next.js App Router | Already installed and deployed in Phase 1 |
| react | ^18 | UI framework | Already installed in Phase 1 |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting and manipulation | Format timestamps in check-in history, relative time displays |
| zod | (NOT YET INSTALLED) | Server-side form validation | Validate email format, password strength before server action execution |

### Optional (For Simplicity, Skip in Phase 2)
| Library | Purpose | Decision |
|---------|---------|----------|
| react-hook-form | Form state management | Use native form state + useActionState instead for minimal dependencies |
| typescript-eslint | TypeScript linting | Already configured in Phase 1 |

**Installation:**
```bash
npm install zod
```

**Version verification (as of 2026-03-26):**
- @supabase/auth-helpers-nextjs: ^0.15.0 (current, verified 2026-03-26)
- @supabase/supabase-js: ^2.100.0 (current, verified 2026-03-26)
- zod: ^3.22.x (lightweight validation, no dependencies)

### Why These Choices
1. **auth-helpers-nextjs is required** — Only official Next.js adapter that handles SSR session refresh and cookie management correctly
2. **No react-hook-form** — Native form state + Server Actions simpler for a 1-form phase; avoid adding npm packages for single-use features
3. **Zod for validation** — Lightweight, zero-dependency, works server-side and client-side

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/              # Auth route group
│   │   ├── layout.tsx       # Auth layout (white card, centered)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── confirm/
│   │       └── route.ts     # POST handler for password reset verification
│   ├── dashboard/
│   │   ├── layout.tsx       # DashboardLayout (sidebar + main)
│   │   └── page.tsx         # Welcome page with nav shell
│   ├── layout.tsx           # Root layout (pt-BR, font, globals.css)
│   └── page.tsx             # Landing page (/)
├── api/
│   ├── admin/
│   │   └── signup/
│   │       └── route.ts     # POST: verify org creation, return 200
│   └── auth/
│       └── callback/
│           └── route.ts     # POST: handle password reset callback (optional)
├── lib/
│   ├── supabase/
│   │   ├── browser.ts       # createBrowserClient (already exists)
│   │   ├── server.ts        # createServerClient (already exists)
│   │   └── service.ts       # createServiceRoleClient (already exists)
│   ├── types/
│   │   └── database.ts      # TypeScript types (already exists)
│   ├── auth.ts              # Auth helpers: createOrg(), verifyOtp(), etc.
│   └── actions/
│       ├── signup.ts        # Server action: auth.signUp() + createOrg()
│       ├── login.ts         # Server action: auth.signInWithPassword()
│       ├── logout.ts        # Server action: auth.signOut()
│       └── reset-password.ts # Server action: resetPasswordForEmail() and updateUser()
├── middleware.ts            # Protect /dashboard, /api/admin
└── middleware.config.ts     # (optional) centralize matcher config
```

### Pattern 1: Org Creation on Signup

**What:** On successful signup, immediately create an organizations record and store its ID in the user's JWT app_metadata so RLS policies can use it.

**When to use:** Every admin signup. No alternative flow.

**Implementation flow:**

```typescript
// src/lib/actions/signup.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Step 1: Signup user
  const supabase = await createServerClient()
  const { data, error: signupError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (signupError) {
    return { error: signupError.message }
  }

  // Step 2: Create organization record
  const service = createServiceRoleClient()
  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name: 'Minha Academia',
      admin_email: email,
    })
    .select()
    .single()

  if (orgError || !org) {
    // Cleanup: delete the user
    await service.auth.admin.deleteUser(data.user!.id)
    return { error: 'Failed to create organization' }
  }

  // Step 3: Set org_id in app_metadata via admin API
  const { error: metadataError } = await service.auth.admin.updateUserById(
    data.user!.id,
    {
      app_metadata: { org_id: org.id },
    }
  )

  if (metadataError) {
    return { error: 'Failed to set organization' }
  }

  // Step 4: Redirect to login (or auto-login and go to dashboard)
  redirect('/auth/login')
}
```

**Key details:**
- Use `createServiceRoleClient()` to bypass RLS and set app_metadata (RLS prevents users from setting their own metadata)
- If org creation fails, delete the user to avoid orphaned auth records
- Redirect to login so the user can log in with their new account
- Session refresh via middleware will pick up the updated app_metadata on next login

### Pattern 2: Session Persistence with Middleware

**What:** Next.js middleware refreshes expired access tokens and writes them back to cookies. This allows sessions to persist across browser closes and tab reopens.

**When to use:** All authenticated routes. Required for AUTH-04.

**Implementation:**

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Protect dashboard and admin API routes
  if (!request.nextUrl.pathname.startsWith('/dashboard') &&
      !request.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  // Create a response we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client with the request cookies
  const supabase = await createServerClient()

  // Get the user — refreshes token if expired and writes Set-Cookie
  const { data, error } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (error || !data.user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Supabase has already written updated cookies to response via Set-Cookie
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Key details:**
- Use `getUser()`, NOT `getSession()` — getSession is not guaranteed to refresh the token
- createServerClient() extracts cookies from the request and is safe for middleware
- Supabase handles Set-Cookie automatically; no manual cookie.set() needed
- Middleware runs on every request, ensuring tokens are always fresh

### Pattern 3: Server Action for Login

**What:** Handle login requests with email/password validation, error handling, and redirect.

**Implementation:**

```typescript
// src/lib/actions/login.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Session is automatically persisted to cookies by auth-helpers-nextjs
  redirect('/dashboard')
}
```

**Key details:**
- auth-helpers-nextjs automatically writes session cookies in signIn/signUp responses
- No manual session handling needed
- Middleware will refresh the token on next request

### Pattern 4: Password Reset Flow

**What:** Multi-step password reset: request email → verify token → set new password.

**Step 1: Request password reset**

```typescript
// src/lib/actions/reset-password.ts
'use server'

export async function requestPasswordReset(email: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
```

**Step 2: Handle the email link (server action after user clicks link)**

```typescript
// src/lib/actions/reset-password.ts (continued)
export async function confirmPasswordReset(
  newPassword: string,
  token_hash: string,
  type: 'recovery'
) {
  const supabase = await createServerClient()

  // Verify the OTP/token
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  if (verifyError) {
    return { error: verifyError.message }
  }

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  redirect('/dashboard')
}
```

**Step 3: Reset password page that calls the action**

```typescript
// src/app/(auth)/reset-password/page.tsx
'use client'

import { confirmPasswordReset } from '@/lib/actions/reset-password'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token_hash = searchParams.get('token_hash') || ''
  const type = (searchParams.get('type') as 'recovery') || 'recovery'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await confirmPasswordReset(password, token_hash, type)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
    // If success, confirmPasswordReset redirects
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nova senha"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
      </button>
    </form>
  )
}
```

**Key details:**
- Email template must include link to `/auth/reset-password?token_hash=X&type=recovery`
- Must verify token with verifyOtp before allowing password update
- Token is single-use; verifying it automatically creates a valid session
- After updateUser succeeds, user is logged in and can be redirected to dashboard

### Pattern 5: Form Error Display (Portuguese, Inline)

**What:** Display validation and auth errors inline below form fields, in Portuguese.

**Example:**

```typescript
// src/app/(auth)/login/page.tsx
'use client'

import { loginAction } from '@/lib/actions/login'
import { useState } from 'react'
import { useActionState } from 'react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, { error: '' })

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">GymRetain</h1>

        <form action={formAction} className="space-y-4">
          <div>
            <input
              type="email"
              name="email"
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Senha"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {state?.error && (
            <p className="text-red-500 text-sm">{state.error}</p>
          )}

          <button
            disabled={isPending}
            className="w-full bg-emerald-600 text-white font-medium py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Não tem conta?{' '}
          <a href="/auth/signup" className="text-emerald-600 hover:underline">
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  )
}
```

**Key details:**
- Use `useActionState` hook (React 19) to manage pending state and errors
- Error displayed inline below form
- All text is in Portuguese (pt-BR)
- Primary color is emerald-600 (you can adjust to green-600 if preferred)

### Anti-Patterns to Avoid

- **Don't use `getSession()` in middleware or Server Components** — It may return a cached/expired session. Always use `getUser()` which performs token refresh.
- **Don't store org_id in React state or cookies** — JWT app_metadata is the single source of truth for RLS policies. If org_id isn't in the token, RLS will fail silently.
- **Don't manually manage session cookies** — auth-helpers-nextjs handles this automatically. Overriding it breaks token refresh.
- **Don't call auth.signUp() twice** — It creates duplicate users. Wrap signup and org creation in a transaction (or delete on failure).
- **Don't skip email verification** — If Confirm email is enabled in Supabase (the default), users cannot log in until they verify. Handle this in signup flow.
- **Don't hardcode redirect URLs** — Use `process.env.NEXT_PUBLIC_SITE_URL` so password reset links work in both local dev and Vercel production.
- **Don't forget to set `redirectTo` in `resetPasswordForEmail()`** — Without it, users land on Supabase's default page, not your app.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom token refresh logic in fetch interceptors | @supabase/auth-helpers-nextjs + middleware | Framework handles edge cases: token expiry, clock skew, cookie domain, SameSite, Secure flags, ISR caching pitfalls |
| Authentication state | Redux/Zustand auth store that mirrors JWT claims | Supabase.auth.getUser() + server-side auth checks | Server-side auth is the source of truth; client-side state can diverge, leak, or cause XSS if not carefully escaped |
| Form validation | Custom regex for email, password strength | zod schemas + server-side validation | zod gives you composable, type-safe validation; custom regex is fragile and doesn't prevent type errors |
| Password reset | Custom token generation and expiry logic | Supabase.auth.resetPasswordForEmail() + verifyOtp() | Supabase's tokens are one-time-use, time-limited, and signed; custom logic is vulnerable to replay and timing attacks |
| Org scoping in RLS | Check org_id from user_metadata in trigger | Store org_id in JWT app_metadata + let RLS evaluate it | JWT is evaluated server-side by PostgreSQL; user_metadata is stale (doesn't auto-refresh when user is updated); app_metadata is committed to the JWT at login time |

**Key insight:** Session management and authentication are notoriously easy to misconfigure. Supabase handles token refresh, cookie security, and JWT validation. Writing custom auth code is slower, less secure, and breaks on edge cases (token expiry during form submission, clock skew between servers, ISR caching).

---

## Common Pitfalls

### Pitfall 1: Forgetting to Set org_id in JWT After Signup

**What goes wrong:** Admin signs up, organization is created, but `app_metadata.org_id` is not set. Next login, the JWT has no org_id. Future RLS policies check for org_id in claims and return no rows (silent failure). Admin sees empty lists everywhere.

**Why it happens:** org_id must be set by the admin API (requires service role key), not by the user. Easy to forget to call `admin.auth.updateUserById()` after signup.

**How to avoid:**
1. Always call `admin.auth.updateUserById()` immediately after creating the organization record.
2. Don't skip this step even if it feels redundant.
3. Test by decoding the JWT in browser DevTools after login — verify app_metadata.org_id is present.

**Warning signs:**
- Admin logs in but dashboard shows no data
- RLS policy logs show "denied by row-level security policy" even for own data

### Pitfall 2: Using getSession() in Middleware or Server Components

**What goes wrong:** Middleware calls `getSession()` to check if user is logged in. It returns cached session from previous request. Token has expired but middleware doesn't know. User with expired token gets through. Or user logs out, but stale session object says they're still logged in.

**Why it happens:** `getSession()` returns what's in memory; it doesn't refresh expired tokens. Only `getUser()` triggers token refresh.

**How to avoid:**
- Always use `getUser()` for auth checks.
- Never use `getSession()` except to display user info in client components where expiry is acceptable.
- In middleware, Server Components, Server Actions: always use `getUser()`.

**Warning signs:**
- Users report being able to access dashboard after logging out
- Middleware doesn't redirect after token expiry
- "getUser returns null but getSession returns user" in logs

### Pitfall 3: Storing org_id in React State or Cookies

**What goes wrong:** Admin component reads org_id from the JWT, stores it in React state. State goes out of sync if user metadata is updated. Or org_id is stored in a cookie that doesn't get refreshed. RLS policy reads the stale org_id and returns wrong data or no data.

**Why it happens:** It's convenient to store org_id in state so you don't have to decode the JWT every time. But the JWT is the source of truth.

**How to avoid:**
- Never store org_id in state.
- If you need org_id in a client component, decode it from the session.access_token.
- Or: make every request through a Server Action that fetches org_id from getUser() and passes it to the component.
- Better: use server-side auth checks (middleware, Server Components) instead of client-side checks.

**Warning signs:**
- User changes org in settings, but old org_id is still used for queries
- Refresh token doesn't update org_id in component state
- RLS policy blocks queries after auth metadata is updated

### Pitfall 4: Email Confirmation Blocking Signup

**What goes wrong:** Supabase has "Confirm email" enabled (the default). Admin signs up, they expect to land in the dashboard. Instead, they get redirected to "check your email" because they haven't verified yet. If you don't handle this in signup, they're stuck.

**Why it happens:** Email confirmation is a security feature (prevents typos and spam), but it requires additional steps in the signup flow.

**How to avoid:**
- If using email confirmation (recommended), inform the user they need to click the email link before logging in.
- Do NOT auto-login after signup; require them to verify first.
- Alternatively, disable email confirmation in Supabase settings (less secure, but simpler UX).
- For Phase 2, recommended: keep email confirmation ON, but show a clear message: "Verifique seu email antes de fazer login."

**Warning signs:**
- Users complain: "I signed up but can't log in"
- Signup returns `user` but no `session`
- Email confirmation link lands on error page (email template not configured correctly)

### Pitfall 5: Hardcoded Redirect URLs (Password Reset)

**What goes wrong:** Password reset link includes hardcoded `redirectTo: 'http://localhost:3000/auth/reset-password'`. In production (Vercel), the domain is different. User clicks the link, gets redirected to localhost instead of your production domain.

**Why it happens:** Easy to copy-paste localhost URLs during dev.

**How to avoid:**
- Use `process.env.NEXT_PUBLIC_SITE_URL` for all redirect URLs.
- Set it in `.env.local` (dev) and Vercel project settings (prod).
- Example: `redirectTo: ${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`

**Warning signs:**
- Password reset link works locally but redirects to wrong domain in production
- Vercel logs show redirect loop or 404

### Pitfall 6: Forgetting to Register Redirect URLs in Supabase Dashboard

**What goes wrong:** You call `resetPasswordForEmail({ redirectTo: 'https://example.com/auth/reset-password' })`, but that URL is not registered in Supabase's "Redirect URLs" settings. Supabase blocks the redirect as a CSRF prevention measure. User clicks the link, gets "Invalid redirect URL" error.

**Why it happens:** Supabase requires all redirect URLs to be explicitly whitelisted.

**How to avoid:**
1. In Supabase Dashboard → Authentication → URL Configuration
2. Add all your redirect URLs:
   - `http://localhost:3000/auth/reset-password` (dev)
   - `https://yourapp.vercel.app/auth/reset-password` (prod)
   - `http://localhost:3000/auth/login` (for signup confirmation if used)

**Warning signs:**
- Email link works but lands on "Invalid redirect" page
- Supabase logs show CORS errors for reset password

### Pitfall 7: Calling admin.auth.updateUserById() Without Service Role Key

**What goes wrong:** You try to set app_metadata using the anon key or user's session. It fails silently or throws "permission denied". org_id is never set.

**Why it happens:** Only the admin API (service role key) can modify auth.users.raw_app_meta_data. Regular users can't modify their own metadata.

**How to avoid:**
- Always use `createServiceRoleClient()` (which uses SUPABASE_SERVICE_ROLE_KEY) when calling admin.auth.updateUserById().
- Never use the anon key for this.
- Test locally: ensure SUPABASE_SERVICE_ROLE_KEY is set in `.env.local`.

**Warning signs:**
- updateUserById() throws "permission denied" or "invalid request"
- SUPABASE_SERVICE_ROLE_KEY is not set in env
- Service logs in Supabase show "Unauthorized" for auth.admin calls

### Pitfall 8: ISR Caching and Session Cookies

**What goes wrong:** You use Incremental Static Regeneration (ISR) on a dashboard page. The page is cached by Vercel. User A logs in, their session cookie is baked into the cached response. User B requests the same page, gets User A's cached response, and sees User A's data (security breach).

**Why it happens:** ISR caches the HTTP response, including Set-Cookie headers. If cookies are cached, they're served to all users.

**How to avoid:**
- Don't use ISR on authenticated pages.
- For dashboard and authenticated routes, use dynamic rendering (no caching).
- Use `const dynamic = 'force-dynamic'` in layout/page.
- Middleware already handles session refresh without ISR.

**Warning signs:**
- Users report seeing other users' data after login
- Vercel Cache-Control headers include ISR values
- Same Set-Cookie header is served to multiple IPs

---

## Code Examples

Verified patterns from Supabase official documentation and Phase 1 existing code:

### Signup Form with org_id Setup

```typescript
// src/app/(auth)/signup/page.tsx
'use client'

import { signupAction } from '@/lib/actions/signup'
import { useActionState } from 'react'
import Link from 'next/link'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    async (_, formData) => {
      const result = await signupAction(formData)
      return result
    },
    { error: '' }
  )

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-center mb-2">GymRetain</h1>
        <p className="text-center text-gray-600 mb-6">Plataforma de Retenção para Academias</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              name="password"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {state?.error && (
            <p className="text-red-500 text-sm font-medium">{state.error}</p>
          )}

          <button
            disabled={isPending}
            className="w-full bg-emerald-600 text-white font-medium py-2 rounded hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isPending ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Já tem conta?{' '}
          <Link href="/auth/login" className="text-emerald-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
```

Source: Combination of Next.js Server Actions guide and Supabase signup quickstart

### Server Action for Signup with Org Creation

```typescript
// src/lib/actions/signup.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export async function signupAction(formData: FormData) {
  const email = formData.get('email')?.toString() || ''
  const password = formData.get('password')?.toString() || ''

  // Validate input
  const validation = signupSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  try {
    // Step 1: Create user via regular client
    const supabase = await createServerClient()
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
    })

    if (signupError || !authData.user) {
      return { error: signupError?.message || 'Falha ao criar conta' }
    }

    // Step 2: Create organization record via service role
    const service = createServiceRoleClient()
    const { data: org, error: orgError } = await service
      .from('organizations')
      .insert({
        name: 'Minha Academia',
        admin_email: validation.data.email,
      })
      .select()
      .single()

    if (orgError || !org) {
      // Cleanup: delete the user
      await service.auth.admin.deleteUser(authData.user.id)
      return { error: 'Falha ao criar organização' }
    }

    // Step 3: Set org_id in JWT app_metadata
    const { error: metadataError } = await service.auth.admin.updateUserById(
      authData.user.id,
      {
        app_metadata: { org_id: org.id },
      }
    )

    if (metadataError) {
      // Cleanup: delete org and user
      await service.from('organizations').delete().eq('id', org.id)
      await service.auth.admin.deleteUser(authData.user.id)
      return { error: 'Falha ao configurar organização' }
    }

    // Success: redirect to login
    redirect('/auth/login?message=Conta+criada.+Verifique+seu+email+e+faça+login.')
  } catch (err) {
    console.error('Signup error:', err)
    return { error: 'Erro ao processar solicitação' }
  }
}
```

Source: Supabase custom access token hook docs + Next.js server actions guide

### Middleware for Route Protection

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Only protect authenticated routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/api/admin')

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Create a Supabase client with request cookies
  const supabase = await createServerClient()

  // Check if user is authenticated
  // getUser() automatically refreshes expired tokens
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    // Redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // User is authenticated; continue
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)',
  ],
}
```

Source: Supabase auth-helpers-nextjs middleware guide + Next.js middleware documentation

---

## Validation Architecture

**Test Framework:** Vitest (already configured in Phase 1)

### Test Framework Config
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | vitest.config.ts (if exists, else default) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User can signup with email + password; org created; org_id in app_metadata | Integration | `npm run test -- src/lib/actions/signup.test.ts --run` | ❌ Wave 0 |
| AUTH-02 | User can login with valid credentials; session persists in cookies | Integration | `npm run test -- src/lib/actions/login.test.ts --run` | ❌ Wave 0 |
| AUTH-03 | User can logout; cookies cleared; redirect to login works | Integration | `npm run test -- src/lib/actions/logout.test.ts --run` | ❌ Wave 0 |
| AUTH-04 | Middleware refreshes expired token; getUser() reflects new token | Integration | `npm run test -- src/middleware.test.ts --run` | ❌ Wave 0 |
| AUTH-05 | Unauthorized access to /dashboard redirects to /auth/login | Integration | `npm run test -- src/middleware.test.ts --run` | ❌ Wave 0 |
| AUTH-06 | Password reset email triggers; verifyOtp() succeeds; updateUser() sets password | Integration | `npm run test -- src/lib/actions/reset-password.test.ts --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (quick sanity check)
- **Per wave merge:** `npm run test:run` (full auth test suite)
- **Phase gate:** Full test suite passes, manual UAT confirms: signup → login → dashboard → logout → password reset works end-to-end

### Wave 0 Gaps
- [ ] `src/lib/actions/signup.test.ts` — mocks createServerClient, createServiceRoleClient, verifies org creation and app_metadata update
- [ ] `src/lib/actions/login.test.ts` — mocks auth.signInWithPassword, verifies session cookie set
- [ ] `src/lib/actions/logout.test.ts` — mocks auth.signOut, verifies redirect
- [ ] `src/middleware.test.ts` — mocks getUser, verifies redirect logic and token refresh behavior
- [ ] `src/lib/actions/reset-password.test.ts` — mocks resetPasswordForEmail, verifyOtp, updateUser; verifies flow
- [ ] `vitest.config.ts` — ensure configured for server-side test environment (already set to 'node' in Phase 1)
- [ ] `src/lib/test-utils.ts` — helper to mock Supabase clients (optional but recommended)

---

## Runtime State Inventory

> This phase creates new auth tables and users in Supabase Auth. No prior runtime state to track.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 1 tables exist but auth-specific data is new | None |
| Live service config | Supabase Auth settings (email confirmation, redirect URLs, auth hooks) | Configure redirect URLs in Supabase Dashboard for password reset |
| OS-registered state | None — No cron or task scheduler yet | None |
| Secrets/env vars | NEXT_PUBLIC_SITE_URL (if not set) — used for password reset redirectTo | Set in .env.local and Vercel |
| Build artifacts | None — No new compiled binaries | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev + build | ✓ | 18+ | — |
| npm | Package management | ✓ | 9+ | — |
| Supabase project | Auth + database | ✓ | (cloud) | — |
| NEXT_PUBLIC_SUPABASE_URL | Auth client init | ✓ | (Phase 1) | — |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Auth client init | ✓ | (Phase 1) | — |
| SUPABASE_SERVICE_ROLE_KEY | Org creation signup hook | ✓ | (Phase 1) | Must have — blocks signup |
| NEXT_PUBLIC_SITE_URL | Password reset redirectTo | Depends | — | Use http://localhost:3000 locally |
| Email service (Resend) | Password reset emails | ✓ | (Phase 1) | — |

**Missing dependencies with no fallback:**
- SUPABASE_SERVICE_ROLE_KEY — required to set org_id in app_metadata during signup

**Missing dependencies with fallback:**
- NEXT_PUBLIC_SITE_URL — if not set, falls back to http://localhost:3000 locally, but will fail in Vercel. Set before deploy.

---

## Open Questions

1. **Email confirmation requirement**
   - What we know: Supabase has "Confirm email" enabled by default. Users cannot log in until they verify.
   - What's unclear: Does the gym admin accept this friction, or should it be disabled for simplicity?
   - Recommendation: Keep enabled (more secure); show a clear message after signup: "Um email de confirmação foi enviado. Verifique antes de fazer login."

2. **Password requirements**
   - What we know: Supabase default is 6+ characters. No strength meter.
   - What's unclear: Should we enforce stronger passwords (e.g., uppercase + number)?
   - Recommendation: Keep default (6 chars) for MVP simplicity. Phase 2 doesn't require strength meter. Can add in v2.

3. **Custom Access Token Hook placement**
   - What we know: Custom claims like org_id need a hook to be included in the JWT.
   - What's unclear: Should the hook fetch org_id from the database, or is it simpler to set it via admin.updateUserById() at signup?
   - Recommendation: Use admin.updateUserById() at signup (simpler, no hook setup). If org_id changes later, re-login refreshes the token. For v2 multi-tenant, implement hook to sync org_id from database automatically.

4. **Session timeout**
   - What we know: Supabase default is 1 hour for access token, 7 days for refresh.
   - What's unclear: Is this acceptable for an admin dashboard, or should sessions last longer?
   - Recommendation: Accept defaults for MVP. Middleware handles transparent refresh; user won't notice expiry.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom session storage in Redux | Server Components + getUser() server-side | Next.js 13+ App Router | Simpler auth code, no client-side state to sync, better security |
| Email/password forms with fetch() | Server Actions + useActionState | React 19 / Next.js 14 | Form state automatically managed, errors returned from server, no race conditions |
| Manual JWT decoding in client | Use session.access_token and decode with jwtDecode() | 2024 (latest practices) | Safer than regex parsing, proper error handling |
| Separate auth and org creation | Auth hooks to trigger org creation | 2024 Supabase improvements | Atomic transactions, cleaner code, less debugging |
| Manual token refresh in middleware | auth-helpers-nextjs middleware | 2023 | Automatic refresh, cookie security, handling clock skew |

**Deprecated/outdated:**
- **NextAuth.js for Supabase** — Still maintained but more complex than auth-helpers-nextjs for Supabase-specific features
- **redux-persist for auth state** — Replaced by middleware + server-side auth checks; client-side state divergence is a footgun
- **useEffect for session checks** — Anti-pattern; use Server Components and getUser() instead

---

## Sources

### Primary (HIGH confidence)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) - How to add org_id to JWT
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - org_id in app_metadata and JWT
- [Supabase JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) - What claims are available in tokens
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - auth-helpers-nextjs integration
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Session management, middleware patterns
- [Supabase Passwords Guide](https://supabase.com/docs/guides/auth/passwords) - Password reset flow (resetPasswordForEmail, verifyOtp, updateUser)
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms) - Server Actions, useActionState
- [Next.js Data Fetching: Server Actions](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations) - Form handling patterns

### Secondary (MEDIUM confidence)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions) - Cookie-based session persistence
- [Next.js Server-Side Auth Setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - createServerClient usage
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) - Admin API, updateUserById
- [Robin Wieruch: Next.js Forms with Server Actions](https://www.robinwieruch.de/next-forms/) - Form patterns with server actions
- [Supabase-community custom-claims](https://github.com/supabase-community/supabase-custom-claims) - Real-world custom claims examples

### Tertiary (MEDIUM-LOW confidence - verified from multiple sources)
- [Medium: Next.js + Supabase Cookie-Based Auth Workflow](https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1) - Session persistence patterns
- [Supabase GitHub Issue #28000: Verify Custom Claims in Middleware](https://github.com/supabase/supabase/issues/28000) - JWT verification in middleware (verified against official docs)
- [Egghead.io: Refresh Session Cookie for Next.js Server Components](https://egghead.io/lessons/supabase-refresh-session-cookie-for-next-js-server-components-with-middleware) - Middleware token refresh pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — @supabase/auth-helpers-nextjs is officially recommended by Supabase; versions verified from Phase 1 dependencies and official docs
- Architecture: **HIGH** — Org creation + app_metadata pattern verified in Supabase docs and GitHub discussions; Server Actions + useActionState is official Next.js 14 pattern; middleware token refresh is standard practice
- Pitfalls: **HIGH** — Documented in Supabase docs (getUser() vs getSession(), ISR caching) and common in GitHub issues; cross-verified with official guides
- Password reset flow: **HIGH** — resetPasswordForEmail(), verifyOtp(), updateUser() all documented with examples in official Supabase docs
- Validation & testing: **MEDIUM** — Vitest is configured in Phase 1; test patterns inferred from best practices but not explicitly verified against Phase 2 requirements yet (Wave 0 work)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days — Supabase auth and Next.js 14 are stable; unlikely to change significantly within a month)

**Notes for planner:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in both `.env.local` and Vercel before running tasks
- Email confirmation is ON by default — add a message after signup to check inbox
- Test password reset with actual email (use test email if available) or implement preview endpoint for local QA
- Middleware matcher must exclude static assets and images to avoid slowdowns
- All text must be in Portuguese (pt-BR) — verify with native speaker or PT-BR spellcheck before UAT
