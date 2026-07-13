import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')
  const isPublicCheckinRoute = pathname.startsWith('/checkin')
  const isPublicCheckinApi = pathname.startsWith('/api/checkin')
  // Cron endpoints have no browser session — they authenticate via
  // CRON_SECRET inside the route handler (Phase 7, ALRT-04).
  const isCronApi = pathname.startsWith('/api/cron')

  // Deny-by-default: every route is protected unless explicitly public.
  // Covers /dashboard/* and any future /api/admin/* without an allow-list.
  const isProtected = !(
    isAuthRoute ||
    isPublicCheckinRoute ||
    isPublicCheckinApi ||
    isCronApi
  )

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
