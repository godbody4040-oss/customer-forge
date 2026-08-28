export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          campaign: string | null
          created_at: string
          device: string | null
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          path: string | null
          referrer: string | null
          session_id: string | null
          source: string | null
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
        }
        Update: {
          campaign?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          ends_at: string
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          service_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          ends_at: string
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          service_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          ends_at?: string
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          service_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          action_type: string
          automation_id: string
          body: string | null
          created_at: string
          delay_minutes: number
          id: string
          organization_id: string
          sort_order: number
          subject: string | null
        }
        Insert: {
          action_type?: string
          automation_id: string
          body?: string | null
          created_at?: string
          delay_minutes?: number
          id?: string
          organization_id: string
          sort_order?: number
          subject?: string | null
        }
        Update: {
          action_type?: string
          automation_id?: string
          body?: string | null
          created_at?: string
          delay_minutes?: number
          id?: string
          organization_id?: string
          sort_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          accent_color: string | null
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          font_preference: string | null
          hero_image_url: string | null
          hours: Json
          id: string
          logo_url: string | null
          organization_id: string
          owner_email: string | null
          owner_name: string | null
          phone: string | null
          primary_color: string | null
          review_link: string | null
          secondary_color: string | null
          service_area: string | null
          state: string | null
          support_email: string | null
          tagline: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          font_preference?: string | null
          hero_image_url?: string | null
          hours?: Json
          id?: string
          logo_url?: string | null
          organization_id: string
          owner_email?: string | null
          owner_name?: string | null
          phone?: string | null
          primary_color?: string | null
          review_link?: string | null
          secondary_color?: string | null
          service_area?: string | null
          state?: string | null
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          font_preference?: string | null
          hero_image_url?: string | null
          hours?: Json
          id?: string
          logo_url?: string | null
          organization_id?: string
          owner_email?: string | null
          owner_name?: string | null
          phone?: string | null
          primary_color?: string | null
          review_link?: string | null
          secondary_color?: string | null
          service_area?: string | null
          state?: string | null
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          code: string
          created_at: string
          id: string
          medium: string | null
          name: string
          organization_id: string
          scans: number
          source: string
          target_path: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          medium?: string | null
          name: string
          organization_id: string
          scans?: number
          source?: string
          target_path?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          medium?: string | null
          name?: string
          organization_id?: string
          scans?: number
          source?: string
          target_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          last_appointment_at: string | null
          name: string
          next_appointment_at: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          tags: string[]
          total_value: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_at?: string | null
          name: string
          next_appointment_at?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          tags?: string[]
          total_value?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_at?: string | null
          name?: string
          next_appointment_at?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tags?: string[]
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          organization_id: string
          period_end: string | null
          period_start: string | null
          provider_invoice_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          provider_invoice_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          provider_invoice_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          campaign: string | null
          city: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          estimated_value: number
          id: string
          last_contacted_at: string | null
          message: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          service_id: string | null
          service_interest: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          last_contacted_at?: string | null
          message?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          service_id?: string | null
          service_interest?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          last_contacted_at?: string | null
          message?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          service_id?: string | null
          service_interest?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          category: string | null
          created_at: string
          file_name: string | null
          id: string
          organization_id: string
          size_bytes: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          organization_id: string
          size_bytes?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          organization_id?: string
          size_bytes?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          organization_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          organization_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          conversion_goal: Database["public"]["Enums"]["conversion_goal"] | null
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_demo: boolean
          is_suspended: boolean
          name: string
          onboarding_completed: boolean
          onboarding_step: number
          plan_id: string | null
          slug: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          conversion_goal?:
            | Database["public"]["Enums"]["conversion_goal"]
            | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_demo?: boolean
          is_suspended?: boolean
          name: string
          onboarding_completed?: boolean
          onboarding_step?: number
          plan_id?: string | null
          slug: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          conversion_goal?:
            | Database["public"]["Enums"]["conversion_goal"]
            | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_demo?: boolean
          is_suspended?: boolean
          name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          plan_id?: string | null
          slug?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          annual_price: number
          created_at: string
          features: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          monthly_price: number
          name: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          annual_price?: number
          created_at?: string
          features?: string[]
          id: string
          is_active?: boolean
          is_featured?: boolean
          monthly_price?: number
          name: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          features?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          monthly_price?: number
          name?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_forms: {
        Row: {
          base_price: number
          created_at: string
          id: string
          is_active: boolean
          max_price: number
          min_price: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_price?: number
          min_price?: number
          name?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_price?: number
          min_price?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_options: {
        Row: {
          created_at: string
          id: string
          label: string
          modifier_type: string
          organization_id: string
          price_modifier: number
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          modifier_type?: string
          organization_id: string
          price_modifier?: number
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          modifier_type?: string
          organization_id?: string
          price_modifier?: number
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quote_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_questions: {
        Row: {
          created_at: string
          form_id: string
          helper_text: string | null
          id: string
          label: string
          organization_id: string
          question_type: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          form_id: string
          helper_text?: string | null
          id?: string
          label: string
          organization_id: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          form_id?: string
          helper_text?: string | null
          id?: string
          label?: string
          organization_id?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "quote_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          answers: Json
          created_at: string
          estimate_max: number
          estimate_min: number
          form_id: string | null
          id: string
          lead_id: string | null
          organization_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          estimate_max?: number
          estimate_min?: number
          form_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          estimate_max?: number
          estimate_min?: number
          form_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "quote_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          author_name: string
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_published: boolean
          organization_id: string
          private_feedback: string | null
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          author_name: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_published?: boolean
          organization_id: string
          private_feedback?: string | null
          rating?: number
        }
        Update: {
          appointment_id?: string | null
          author_name?: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_published?: boolean
          organization_id?: string
          private_feedback?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          bookable: boolean
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          featured: boolean
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          organization_id: string
          price: number | null
          sort_order: number
          starting_price: number | null
          updated_at: string
        }
        Insert: {
          bookable?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          organization_id: string
          price?: number | null
          sort_order?: number
          starting_price?: number | null
          updated_at?: string
        }
        Update: {
          bookable?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          organization_id?: string
          price?: number | null
          sort_order?: number
          starting_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          created_at: string
          facebook: string | null
          google_business: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          organization_id: string
          tiktok: string | null
          updated_at: string
          youtube: string | null
        }
        Insert: {
          created_at?: string
          facebook?: string | null
          google_business?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          organization_id: string
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Update: {
          created_at?: string
          facebook?: string | null
          google_business?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          organization_id?: string
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string
          plan_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id: string
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          admin_email: string | null
          admin_id: string
          ended_at: string | null
          id: string
          organization_id: string
          reason: string | null
          started_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_id: string
          ended_at?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          started_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_id?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          created_at: string
          custom_domain: string | null
          domain_checked_at: string | null
          domain_error: string | null
          domain_status: Database["public"]["Enums"]["domain_status"]
          domain_target: string | null
          domain_verified: boolean
          id: string
          last_published_at: string | null
          organization_id: string
          pages: Json
          publish_state: Database["public"]["Enums"]["publish_state"]
          published: boolean
          seo: Json
          ssl_active: boolean
          subdomain: string | null
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          domain_checked_at?: string | null
          domain_error?: string | null
          domain_status?: Database["public"]["Enums"]["domain_status"]
          domain_target?: string | null
          domain_verified?: boolean
          id?: string
          last_published_at?: string | null
          organization_id: string
          pages?: Json
          publish_state?: Database["public"]["Enums"]["publish_state"]
          published?: boolean
          seo?: Json
          ssl_active?: boolean
          subdomain?: string | null
          template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          domain_checked_at?: string | null
          domain_error?: string | null
          domain_status?: Database["public"]["Enums"]["domain_status"]
          domain_target?: string | null
          domain_verified?: boolean
          id?: string
          last_published_at?: string | null
          organization_id?: string
          pages?: Json
          publish_state?: Database["public"]["Enums"]["publish_state"]
          published?: boolean
          seo?: Json
          ssl_active?: boolean
          subdomain?: string | null
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_org: { Args: { _org: string }; Returns: boolean }
      has_support_access: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "staff" | "viewer"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      billing_interval: "monthly" | "annual"
      conversion_goal:
        | "calls"
        | "quotes"
        | "bookings"
        | "consultations"
        | "purchases"
      domain_status:
        | "not_connected"
        | "dns_pending"
        | "verifying"
        | "connected"
        | "ssl_active"
        | "error"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "quoted"
        | "booked"
        | "completed"
        | "lost"
      platform_role: "super_admin"
      publish_state: "draft" | "preview" | "published" | "unpublished"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "staff", "viewer"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      billing_interval: ["monthly", "annual"],
      conversion_goal: [
        "calls",
        "quotes",
        "bookings",
        "consultations",
        "purchases",
      ],
      domain_status: [
        "not_connected",
        "dns_pending",
        "verifying",
        "connected",
        "ssl_active",
        "error",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "quoted",
        "booked",
        "completed",
        "lost",
      ],
      platform_role: ["super_admin"],
      publish_state: ["draft", "preview", "published", "unpublished"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "suspended",
      ],
    },
  },
} as const
