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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          ai_model: string
          api_key_encrypted: string | null
          chat_completions_url: string | null
          created_at: string
          general_assistant_id: string | null
          global_prompt: string
          id: string
          max_base_documents: number
          max_enterprise_documents: number
          max_pro_documents: number
          payment_required: boolean
          platform_assistant_id: string | null
          platform_prompt: string | null
          price_base_cents: number
          price_enterprise_cents: number
          price_pro_cents: number
          stripe_price_id_base: string | null
          stripe_price_id_enterprise: string | null
          stripe_price_id_pro: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string
          api_key_encrypted?: string | null
          chat_completions_url?: string | null
          created_at?: string
          general_assistant_id?: string | null
          global_prompt?: string
          id?: string
          max_base_documents?: number
          max_enterprise_documents?: number
          max_pro_documents?: number
          payment_required?: boolean
          platform_assistant_id?: string | null
          platform_prompt?: string | null
          price_base_cents?: number
          price_enterprise_cents?: number
          price_pro_cents?: number
          stripe_price_id_base?: string | null
          stripe_price_id_enterprise?: string | null
          stripe_price_id_pro?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string
          api_key_encrypted?: string | null
          chat_completions_url?: string | null
          created_at?: string
          general_assistant_id?: string | null
          global_prompt?: string
          id?: string
          max_base_documents?: number
          max_enterprise_documents?: number
          max_pro_documents?: number
          payment_required?: boolean
          platform_assistant_id?: string | null
          platform_prompt?: string | null
          price_base_cents?: number
          price_enterprise_cents?: number
          price_pro_cents?: number
          stripe_price_id_base?: string | null
          stripe_price_id_enterprise?: string | null
          stripe_price_id_pro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      assessment_usage: {
        Row: {
          created_at: string
          id: string
          last_reset_date: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reset_date?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reset_date?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          assessment_data: Json | null
          assessment_type: string | null
          company_name: string | null
          conversation_summary: string | null
          created_at: string
          id: string
          priority_level: string | null
          priority_score: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_data?: Json | null
          assessment_type?: string | null
          company_name?: string | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          priority_level?: string | null
          priority_score?: number | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_data?: Json | null
          assessment_type?: string | null
          company_name?: string | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          priority_level?: string | null
          priority_score?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          amount: number | null
          client_name: string
          content: string
          created_at: string | null
          document_type: string
          file_path: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          client_name: string
          content: string
          created_at?: string | null
          document_type: string
          file_path?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          client_name?: string
          content?: string
          created_at?: string | null
          document_type?: string
          file_path?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      global_ai_documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      helpful_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      helpful_worksheets: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          subscription_tier: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          subscription_tier?: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at?: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          subscription_tier?: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      login: {
        Row: {
          Company: Json | null
          created_at: string
          Email: Json | null
          id: number
          "memory information": Json | null
          Name: string | null
        }
        Insert: {
          Company?: Json | null
          created_at?: string
          Email?: Json | null
          id?: number
          "memory information"?: Json | null
          Name?: string | null
        }
        Update: {
          Company?: Json | null
          created_at?: string
          Email?: Json | null
          id?: number
          "memory information"?: Json | null
          Name?: string | null
        }
        Relationships: []
      }
      security_reports: {
        Row: {
          id: string
          user_id: string
          company_name: string
          file_path: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          file_path: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          file_path?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      profiles: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          state: string | null
          tax_id: string | null
          token_usage: number | null
          updated_at: string
          website: string | null
          zip_code: string | null
          role: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          token_usage?: number | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
          role?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          token_usage?: number | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
          role?: string | null
        }
        Relationships: []
      },
      user_documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      },
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          max_documents: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_documents?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_documents?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
