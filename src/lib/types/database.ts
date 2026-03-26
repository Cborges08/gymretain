// src/lib/types/database.ts
// TypeScript row types matching /supabase/migrations/001-init-schema.sql
// These are the canonical types used across all plans.

export interface Organization {
  id: string;
  name: string;
  admin_email: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
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

export interface Checkin {
  id: string;
  org_id: string;
  member_id: string;
  checked_in_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Alert {
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
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      members: {
        Row: Member;
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'qr_code_generated_at'>;
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'org_id'>>;
      };
      checkins: {
        Row: Checkin;
        Insert: Omit<Checkin, 'id' | 'created_at'>;
        Update: never; // Checkins are immutable audit log
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Alert, 'id' | 'created_at' | 'org_id' | 'member_id'>>;
      };
    };
  };
}
