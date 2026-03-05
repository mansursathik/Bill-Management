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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          action_timestamp: string | null
          approver_role: Database["public"]["Enums"]["app_role"]
          approver_user_id: string | null
          bill_id: string
          comments: string | null
          created_at: string
          id: string
          is_active: boolean
          sequence_order: number
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          action_timestamp?: string | null
          approver_role: Database["public"]["Enums"]["app_role"]
          approver_user_id?: string | null
          bill_id: string
          comments?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          sequence_order?: number
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          action_timestamp?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"]
          approver_user_id?: string | null
          bill_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          sequence_order?: number
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          bill_id: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string
          user_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          action: string
          bill_id: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          action?: string
          bill_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_duplicates: {
        Row: {
          detection_method: string
          duplicate_bill_id: string
          flagged_at: string
          id: string
          justification: string | null
          original_bill_id: string
        }
        Insert: {
          detection_method: string
          duplicate_bill_id: string
          flagged_at?: string
          id?: string
          justification?: string | null
          original_bill_id: string
        }
        Update: {
          detection_method?: string
          duplicate_bill_id?: string
          flagged_at?: string
          id?: string
          justification?: string | null
          original_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_duplicates_duplicate_bill_id_fkey"
            columns: ["duplicate_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_duplicates_original_bill_id_fkey"
            columns: ["original_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          bill_date: string
          bill_image_path: string | null
          category: Database["public"]["Enums"]["bill_category"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          ocr_confidence: number | null
          ocr_extracted_data: Json | null
          status: Database["public"]["Enums"]["bill_status"]
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          bill_date: string
          bill_image_path?: string | null
          category?: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_data?: Json | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          bill_date?: string
          bill_image_path?: string | null
          category?: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_data?: Json | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role: "employee" | "accounts" | "manager" | "md"
      approval_status: "pending" | "approved" | "rejected"
      bill_category:
        | "travel"
        | "office_supplies"
        | "meals"
        | "equipment"
        | "software"
        | "utilities"
        | "marketing"
        | "other"
      bill_status: "pending" | "under_review" | "approved" | "rejected"
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
      app_role: ["employee", "accounts", "manager", "md"],
      approval_status: ["pending", "approved", "rejected"],
      bill_category: [
        "travel",
        "office_supplies",
        "meals",
        "equipment",
        "software",
        "utilities",
        "marketing",
        "other",
      ],
      bill_status: ["pending", "under_review", "approved", "rejected"],
    },
  },
} as const
