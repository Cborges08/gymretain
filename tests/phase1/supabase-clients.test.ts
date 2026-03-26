import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Member, Checkin, Alert } from '@/lib/types/database';

const ROOT = join(__dirname, '../..');

describe('Phase 1: Supabase Client Factory (INFR-02)', () => {
  describe('createServiceRoleClient', () => {
    let originalKey: string | undefined;
    let originalUrl: string | undefined;

    beforeEach(() => {
      originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    afterEach(() => {
      if (originalKey !== undefined) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      } else {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      }
      if (originalUrl !== undefined) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      } else {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      }
    });

    it('throws a clear error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const { createServiceRoleClient } = await import('@/lib/supabase/service');
      expect(() => createServiceRoleClient()).toThrowError(/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL/);
    });

    it('does NOT reference NEXT_PUBLIC_SUPABASE_ANON_KEY in service.ts source', () => {
      const source = readFileSync(join(ROOT, 'src/lib/supabase/service.ts'), 'utf-8');
      expect(source).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });
  });

  describe('TypeScript Database Types', () => {
    it('Member.external_id is typed as string | null (Fácil integration placeholder)', () => {
      // Compile-time check via type assignment
      const member: Member = {
        id: 'uuid',
        org_id: 'org-uuid',
        name: 'Test',
        email: 'test@example.com',
        phone: null,
        qr_code_hash: 'hash',
        qr_code_generated_at: new Date().toISOString(),
        last_checked_in: null,
        status: 'active',
        external_id: null,  // Must accept null
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(member.external_id).toBeNull();
    });

    it('Checkin.user_agent and ip_address are typed as string | null', () => {
      const checkin: Checkin = {
        id: 'uuid',
        org_id: 'org-uuid',
        member_id: 'member-uuid',
        checked_in_at: new Date().toISOString(),
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      };
      expect(checkin.user_agent).toBeNull();
      expect(checkin.ip_address).toBeNull();
    });

    it('Alert.contact_marked_at and email_sent_at are typed as string | null', () => {
      const alert: Alert = {
        id: 'uuid',
        org_id: 'org-uuid',
        member_id: 'member-uuid',
        alert_type: 'churn',
        triggered_at: new Date().toISOString(),
        email_sent_at: null,
        contact_marked_at: null,
        resolved_at: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(alert.contact_marked_at).toBeNull();
      expect(alert.email_sent_at).toBeNull();
    });
  });

  describe('Environment variable documentation', () => {
    it('.env.example exists and contains all five required keys', () => {
      const envExample = join(ROOT, '.env.example');
      expect(existsSync(envExample)).toBe(true);
      const content = readFileSync(envExample, 'utf-8');
      expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(content).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).toContain('RESEND_API_KEY');
      expect(content).toContain('CRON_SECRET');
    });
  });

  describe('Vercel configuration', () => {
    it('vercel.json configures cron for /api/cron/detect-churn', () => {
      const vercelConfig = join(ROOT, 'vercel.json');
      expect(existsSync(vercelConfig)).toBe(true);
      const content = readFileSync(vercelConfig, 'utf-8');
      expect(content).toContain('detect-churn');
      expect(content).toContain('0 6 * * *');
    });
  });
});
