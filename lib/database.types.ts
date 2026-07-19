/**
 * Type definitions matching Supabase Postgres schema
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          owner_id: string
          handle: string
          persona: 'service' | 'professional' | 'jobseeker'
          display_name: string
          avatar_url: string | null
          role_line: string | null
          tagline: string | null
          socials: any[]
          category: string | null
          location_area: string | null
          is_public: boolean
          discoverable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          handle: string
          persona: 'service' | 'professional' | 'jobseeker'
          display_name: string
          avatar_url?: string | null
          role_line?: string | null
          tagline?: string | null
          socials?: any[]
          category?: string | null
          location_area?: string | null
          is_public?: boolean
          discoverable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          handle?: string
          persona?: 'service' | 'professional' | 'jobseeker'
          display_name?: string
          avatar_url?: string | null
          role_line?: string | null
          tagline?: string | null
          socials?: any[]
          category?: string | null
          location_area?: string | null
          is_public?: boolean
          discoverable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      proof_items: {
        Row: {
          id: string
          profile_id: string
          pillar: 'did' | 'trained' | 'vouched' | 'aiming'
          title: string
          detail: string | null
          when_label: string | null
          visible: boolean
          sort_order: number
          source: 'owner' | 'vouch_request'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          pillar: 'did' | 'trained' | 'vouched' | 'aiming'
          title: string
          detail?: string | null
          when_label?: string | null
          visible?: boolean
          sort_order?: number
          source?: 'owner' | 'vouch_request'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          pillar?: 'did' | 'trained' | 'vouched' | 'aiming'
          title?: string
          detail?: string | null
          when_label?: string | null
          visible?: boolean
          sort_order?: number
          source?: 'owner' | 'vouch_request'
          created_at?: string
          updated_at?: string
        }
      }
      evidence: {
        Row: {
          id: string
          proof_item_id: string
          type: 'img' | 'pdf' | 'vid'
          storage_key: string
          caption: string | null
          bytes_original: number | null
          bytes_compressed: number | null
          created_at: string
        }
        Insert: {
          id?: string
          proof_item_id: string
          type: 'img' | 'pdf' | 'vid'
          storage_key: string
          caption?: string | null
          bytes_original?: number | null
          bytes_compressed?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          proof_item_id?: string
          type?: 'img' | 'pdf' | 'vid'
          storage_key?: string
          caption?: string | null
          bytes_original?: number | null
          bytes_compressed?: number | null
          created_at?: string
        }
      }
      vouch_requests: {
        Row: {
          id: string
          profile_id: string
          token: string
          recipient_label: string | null
          message: string | null
          status: 'pending' | 'completed' | 'expired'
          created_at: string
          expires_at: string
          completed_at: string | null
          resulting_proof_item_id: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          token?: string
          recipient_label?: string | null
          message?: string | null
          status?: 'pending' | 'completed' | 'expired'
          created_at?: string
          expires_at?: string
          completed_at?: string | null
          resulting_proof_item_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          token?: string
          recipient_label?: string | null
          message?: string | null
          status?: 'pending' | 'completed' | 'expired'
          created_at?: string
          expires_at?: string
          completed_at?: string | null
          resulting_proof_item_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          profile_id: string
          plan: 'free' | 'plus'
          current_period_end: string | null
          last_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan?: 'free' | 'plus'
          current_period_end?: string | null
          last_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          plan?: 'free' | 'plus'
          current_period_end?: string | null
          last_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          profile_id: string
          paystack_reference: string
          amount_kes: number
          plan_period: '6m' | '12m'
          channel: string | null
          status: 'pending' | 'success' | 'failed'
          paystack_data: any
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          paystack_reference: string
          amount_kes: number
          plan_period: '6m' | '12m'
          channel?: string | null
          status?: 'pending' | 'success' | 'failed'
          paystack_data?: any
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          paystack_reference?: string
          amount_kes?: number
          plan_period?: '6m' | '12m'
          channel?: string | null
          status?: 'pending' | 'success' | 'failed'
          paystack_data?: any
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: number
          profile_id: string
          event_type: string
          proof_item_id: string | null
          referrer_host: string | null
          device_type: string | null
          country: string | null
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: string
          event_type: string
          proof_item_id?: string | null
          referrer_host?: string | null
          device_type?: string | null
          country?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: string
          event_type?: string
          proof_item_id?: string | null
          referrer_host?: string | null
          device_type?: string | null
          country?: string | null
          created_at?: string
        }
      }
      pricing_plans: {
        Row: {
          id: '6m' | '12m'
          label: string
          amount_kes: number
          months: number
          description: string | null
        }
        Insert: {
          id: '6m' | '12m'
          label: string
          amount_kes: number
          months: number
          description?: string | null
        }
        Update: {
          id?: '6m' | '12m'
          label?: string
          amount_kes?: number
          months?: number
          description?: string | null
        }
      }
      affiliates: {
        Row: {
          profile_id: string
          code: string
          created_at: string
        }
        Insert: {
          profile_id: string
          code: string
          created_at?: string
        }
        Update: {
          profile_id?: string
          code?: string
          created_at?: string
        }
      }
      affiliate_payouts: {
        Row: {
          id: string
          profile_id: string
          amount_kes: number
          payment_details: string
          status: 'pending' | 'completed' | 'failed'
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          amount_kes: number
          payment_details: string
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          amount_kes?: number
          payment_details?: string
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_profile_id: string
          referred_profile_id: string
          created_at: string
          payout_status: 'unpaid' | 'paid'
          payout_id: string | null
        }
        Insert: {
          id?: string
          referrer_profile_id: string
          referred_profile_id: string
          created_at?: string
          payout_status?: 'unpaid' | 'paid'
          payout_id?: string | null
        }
        Update: {
          id?: string
          referrer_profile_id?: string
          referred_profile_id?: string
          created_at?: string
          payout_status?: 'unpaid' | 'paid'
          payout_id?: string | null
        }
      }
    }
    Functions: {
      get_public_profile: {
        Args: { p_handle: string }
        Returns: any
      }
      search_profiles: {
        Args: { p_query: string; p_category: string | null; p_location: string | null; p_limit: number; p_offset: number }
        Returns: any[]
      }
      apply_payment: {
        Args: {
          p_profile_id: string
          p_paystack_reference: string
          p_amount_kes: number
          p_plan_period: string
          p_channel?: string
          p_paystack_data?: any
        }
        Returns: void
      }
      submit_vouch: {
        Args: {
          p_token: string
          p_quote: string
          p_voucher_name: string
          p_relationship: string
          p_evidence_keys?: string[]
        }
        Returns: any
      }
      log_event: {
        Args: {
          p_profile_id: string
          p_event_type: string
          p_proof_item_id?: string
          p_referrer_host?: string
          p_device_type?: string
          p_country?: string
        }
        Returns: void
      }
      get_analytics_summary: {
        Args: { p_profile_id: string; p_days?: number }
        Returns: any
      }
      create_vouch_request: {
        Args: {
          p_profile_id: string
          p_recipient_label: string
          p_message?: string
        }
        Returns: any
      }
    }
    Views: {
      profile_completeness: {
        Row: {
          profile_id: string
          handle: string
          completeness_score: number
        }
      }
      affiliate_referrals_summary: {
        Row: {
          id: string
          referrer_profile_id: string
          referred_profile_id: string
          created_at: string
          referred_name: string
          referred_handle: string
          payout_status: 'unpaid' | 'paid'
          payout_id: string | null
          upgraded_within_30_days: boolean
          payment_date: string | null
          commission_kes: number
          status: 'earned' | 'pending'
        }
      }
    }
  }
}
