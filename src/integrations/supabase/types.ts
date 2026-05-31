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
      app_settings: {
        Row: {
          id: number
          mailgun_api_key: string | null
          mailgun_domain: string | null
          mailgun_enabled: boolean
          mailgun_from_email: string | null
          printer_settings: Json
          scandit_api_key: string | null
          scandit_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          mailgun_api_key?: string | null
          mailgun_domain?: string | null
          mailgun_enabled?: boolean
          mailgun_from_email?: string | null
          printer_settings?: Json
          scandit_api_key?: string | null
          scandit_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          mailgun_api_key?: string | null
          mailgun_domain?: string | null
          mailgun_enabled?: boolean
          mailgun_from_email?: string | null
          printer_settings?: Json
          scandit_api_key?: string | null
          scandit_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      label_print_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout_json: Json
          name: string
          preset_key: string
          updated_at: string
          zpl_template: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout_json?: Json
          name: string
          preset_key?: string
          updated_at?: string
          zpl_template?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout_json?: Json
          name?: string
          preset_key?: string
          updated_at?: string
          zpl_template?: string | null
        }
        Relationships: []
      }
      integration_event_mappings: {
        Row: {
          bookingqube_event_id: string | null
          bookingqube_form_id: string
          created_at: string
          id: string
          local_event_id: string
          provider: string
        }
        Insert: {
          bookingqube_event_id?: string | null
          bookingqube_form_id: string
          created_at?: string
          id?: string
          local_event_id: string
          provider?: string
        }
        Update: {
          bookingqube_event_id?: string | null
          bookingqube_form_id?: string
          created_at?: string
          id?: string
          local_event_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_event_mappings_local_event_id_fkey"
            columns: ["local_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_field_mappings: {
        Row: {
          bookingqube_field_id: string | null
          bookingqube_label: string
          created_at: string
          event_mapping_id: string
          id: string
          local_field: string
          metadata: Json | null
          provider: string
        }
        Insert: {
          bookingqube_field_id?: string | null
          bookingqube_label: string
          created_at?: string
          event_mapping_id: string
          id?: string
          local_field: string
          metadata?: Json | null
          provider?: string
        }
        Update: {
          bookingqube_field_id?: string | null
          bookingqube_label?: string
          created_at?: string
          event_mapping_id?: string
          id?: string
          local_field?: string
          metadata?: Json | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_field_mappings_event_mapping_id_fkey"
            columns: ["event_mapping_id"]
            isOneToOne: false
            referencedRelation: "integration_event_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          api_key: string | null
          api_key_env_var: string | null
          api_version: string
          base_url: string
          cached_form_schema: Json | null
          custom_endpoints: Json
          default_form_id: string | null
          enabled: boolean
          get_api_url: string | null
          id: string
          post_api_url: string | null
          provider: string
          registration_event_slug: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_key_env_var?: string | null
          api_version?: string
          base_url?: string
          cached_form_schema?: Json | null
          custom_endpoints?: Json
          default_form_id?: string | null
          enabled?: boolean
          get_api_url?: string | null
          id?: string
          post_api_url?: string | null
          provider: string
          registration_event_slug?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_key_env_var?: string | null
          api_version?: string
          base_url?: string
          cached_form_schema?: Json | null
          custom_endpoints?: Json
          default_form_id?: string | null
          enabled?: boolean
          get_api_url?: string | null
          id?: string
          post_api_url?: string | null
          provider?: string
          registration_event_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_log: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          id: string
          payload: Json | null
          provider: string
          registration_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          registration_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          registration_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_log_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          end_date: string
          event_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          event_date: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          event_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          username: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          username?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          username?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          customer_name: string
          email: string | null
          entered_at: string | null
          exited_at: string | null
          guest_count: number
          id: string
          mobile: string
          qr_token: string
          slot_id: string
          status: Database["public"]["Enums"]["registration_status"]
        }
        Insert: {
          created_at?: string
          customer_name: string
          email?: string | null
          entered_at?: string | null
          exited_at?: string | null
          guest_count?: number
          id?: string
          mobile: string
          qr_token?: string
          slot_id: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Update: {
          created_at?: string
          customer_name?: string
          email?: string | null
          entered_at?: string | null
          exited_at?: string | null
          guest_count?: number
          id?: string
          mobile?: string
          qr_token?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Relationships: [
          {
            foreignKeyName: "registrations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          id: string
          mode: Database["public"]["Enums"]["scan_mode"]
          reason: string | null
          registration_id: string | null
          result: Database["public"]["Enums"]["scan_result"]
          scanned_at: string
          scanner_user_id: string | null
          slot_id: string | null
        }
        Insert: {
          id?: string
          mode: Database["public"]["Enums"]["scan_mode"]
          reason?: string | null
          registration_id?: string | null
          result: Database["public"]["Enums"]["scan_result"]
          scanned_at?: string
          scanner_user_id?: string | null
          slot_id?: string | null
        }
        Update: {
          id?: string
          mode?: Database["public"]["Enums"]["scan_mode"]
          reason?: string | null
          registration_id?: string | null
          result?: Database["public"]["Enums"]["scan_result"]
          scanned_at?: string
          scanner_user_id?: string | null
          slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_events_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          bookingqube_ticket_id: string | null
          capacity: number
          created_at: string
          ends_at: string
          event_id: string
          hidden_from_booking: boolean
          id: string
          name: string
          starts_at: string
        }
        Insert: {
          bookingqube_ticket_id?: string | null
          capacity: number
          created_at?: string
          ends_at: string
          event_id: string
          hidden_from_booking?: boolean
          id?: string
          name: string
          starts_at: string
        }
        Update: {
          bookingqube_ticket_id?: string | null
          capacity?: number
          created_at?: string
          ends_at?: string
          event_id?: string
          hidden_from_booking?: boolean
          id?: string
          name?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dashboard" | "pos" | "scanner"
      registration_status:
        | "active"
        | "entered"
        | "exited"
        | "auto_exited"
        | "expired"
        | "invalid"
      scan_mode: "entry" | "exit" | "auto_exit"
      scan_result: "valid" | "invalid"
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
      app_role: ["admin", "dashboard", "pos", "scanner"],
      registration_status: [
        "active",
        "entered",
        "exited",
        "auto_exited",
        "expired",
        "invalid",
      ],
      scan_mode: ["entry", "exit", "auto_exit"],
      scan_result: ["valid", "invalid"],
    },
  },
} as const
