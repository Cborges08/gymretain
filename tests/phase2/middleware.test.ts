/**
 * Phase 2 Plan 02: Middleware tests
 *
 * These tests verify the middleware source file properties and logic
 * without executing in the Edge Runtime (which is not available in vitest/node).
 *
 * Integration behavior (actual redirect in a running server) is validated
 * manually or via E2E tests (out of scope for MVP).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const MIDDLEWARE_PATH = join(ROOT, 'src/middleware.ts');

describe('Phase 2: Middleware Route Protection (AUTH-04, AUTH-05)', () => {
  describe('File existence', () => {
    it('src/middleware.ts exists', () => {
      expect(existsSync(MIDDLEWARE_PATH)).toBe(true);
    });
  });

  describe('Edge Runtime compatibility', () => {
    it('uses createServerClient from @supabase/ssr with request/response cookies — Edge Runtime safe', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      // Must import from the package directly (not from src/lib/supabase/server.ts which uses next/headers)
      expect(source).toContain("from '@supabase/ssr'");
      expect(source).toContain('createServerClient');
    });

    it('does NOT import cookies from next/headers (not available in Edge Runtime)', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).not.toContain("from 'next/headers'");
    });

    it('reads cookies from the NextRequest object', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain('request.cookies');
    });
  });

  describe('AUTH-04: Session persistence via token refresh', () => {
    it('calls getUser() to refresh expired tokens', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain('getUser()');
    });

    it('does NOT call auth.getSession() (does not refresh tokens)', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      // Ensure getSession is not invoked on supabase.auth
      expect(source).not.toContain('auth.getSession');
    });
  });

  describe('AUTH-05: Route protection', () => {
    it('protects all routes by default (deny-by-default), exempting only public routes', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      // Deny-by-default: isProtected is the negation of the public route checks,
      // so /dashboard/* and /api/admin/* are covered without an explicit allow-list.
      expect(source).toContain('const isProtected = !(');
      expect(source).toContain("pathname.startsWith('/auth')");
    });

    it('exempts the public check-in page and API from protection', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain("pathname.startsWith('/checkin')");
      expect(source).toContain("pathname.startsWith('/api/checkin')");
    });

    it('redirects unauthenticated requests to /auth/login', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain('/auth/login');
      expect(source).toContain('NextResponse.redirect');
    });
  });

  describe('Middleware config', () => {
    it('exports a config object with matcher', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain('export const config');
      expect(source).toContain('matcher');
    });

    it('exports the middleware function', () => {
      const source = readFileSync(MIDDLEWARE_PATH, 'utf-8');
      expect(source).toContain('export async function middleware');
    });
  });
});
