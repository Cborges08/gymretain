// src/lib/types/database.ts
// TypeScript row types matching /supabase/migrations/001-init-schema.sql
// These are the canonical types used across all plans.
// NOTE: Row types use `type` (not `interface`) to satisfy GenericTable constraint
// from @supabase/supabase-js v2.100+ which requires Row extends Record<string, unknown>.

export type Organization = {
  id: string;
  name: string;
  admin_email: string;
  created_at: string;
  updated_at: string;
}

export type Member = {
  id: string;
  org_id: string;
  name: string;
  email: string;
  phone: string | null;
  qr_code_hash: string;
  qr_code_generated_at: string;
  last_checked_in: string | null;  // NULL until first check-in
  status: 'active' | 'inactive';
  external_id: string | null;      // Reserved for Fácil integration (MEMB-07)
  created_at: string;
  updated_at: string;
}

export type Checkin = {
  id: string;
  org_id: string;
  member_id: string;
  checked_in_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type Alert = {
  id: string;
  org_id: string;
  member_id: string;
  alert_type: string;
  triggered_at: string;
  email_sent_at: string | null;
  contact_marked_at: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Supabase Database type for use with createClient<Database>
// Relationships array is required by @supabase/supabase-js v2.100+ (GenericTable constraint)
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'qr_code_generated_at'>;
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'org_id'>>;
        Relationships: [
          {
            foreignKeyName: 'members_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      checkins: {
        Row: Checkin;
        Insert: Omit<Checkin, 'id' | 'created_at'>;
        Update: Record<string, never>; // Checkins are immutable audit log
        Relationships: [
          {
            foreignKeyName: 'checkins_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          }
        ];
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Alert, 'id' | 'created_at' | 'org_id' | 'member_id'>>;
        Relationships: [
          {
            foreignKeyName: 'alerts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
