import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database'

export async function middleware(request: NextRequest) {
  // Create a mutable response so Supabase can write Set-Cookie headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // createServerClient from @supabase/auth-helpers-nextjs reads cookies from
  // the request and writes Set-Cookie to the response — Edge Runtime compatible.
  // This differs from src/lib/supabase/server.ts which uses next/headers cookies()
  // and is NOT safe in middleware (Edge Runtime).
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() refreshes expired tokens and writes updated Set-Cookie back to response.
  // This is what enables AUTH-04: session persists across browser close/reopen.
  // CRITICAL: Use getUser(), NOT getSession() — getSession() does not refresh the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect dashboard and admin API routes (per D-13)
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public auth pages (do not need session refresh but are not protected)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
