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
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      payment_proofs: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          original_filename: string
          reservation_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          original_filename: string
          reservation_id: string
          size_bytes: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          original_filename?: string
          reservation_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_proofs_reservation_id_fkey'
            columns: ['reservation_id']
            isOneToOne: true
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      raffle_numbers: {
        Row: {
          created_at: string
          current_reservation_id: string | null
          id: string
          number: number
          raffle_id: string
          reserved_until: string | null
          status: Database['public']['Enums']['raffle_number_status']
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_reservation_id?: string | null
          id?: string
          number: number
          raffle_id: string
          reserved_until?: string | null
          status?: Database['public']['Enums']['raffle_number_status']
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_reservation_id?: string | null
          id?: string
          number?: number
          raffle_id?: string
          reserved_until?: string | null
          status?: Database['public']['Enums']['raffle_number_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'raffle_numbers_current_reservation_fk'
            columns: ['current_reservation_id', 'raffle_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id', 'raffle_id']
          },
          {
            foreignKeyName: 'raffle_numbers_raffle_id_fkey'
            columns: ['raffle_id']
            isOneToOne: false
            referencedRelation: 'raffles'
            referencedColumns: ['id']
          },
        ]
      }
      raffles: {
        Row: {
          bundle_price: number
          bundle_quantity: number
          contact_whatsapp: string
          created_at: string
          currency: string
          description: string | null
          draw_description: string | null
          id: string
          max_numbers_per_reservation: number
          number_price: number
          organizer_name: string
          owner_id: string
          payment_alias: string
          prize_description: string | null
          prize_image_url: string | null
          prize_title: string
          reservation_duration_minutes: number
          slug: string
          status: Database['public']['Enums']['raffle_status']
          title: string
          total_numbers: number
          updated_at: string
        }
        Insert: {
          bundle_price: number
          bundle_quantity?: number
          contact_whatsapp: string
          created_at?: string
          currency?: string
          description?: string | null
          draw_description?: string | null
          id?: string
          max_numbers_per_reservation?: number
          number_price: number
          organizer_name: string
          owner_id: string
          payment_alias: string
          prize_description?: string | null
          prize_image_url?: string | null
          prize_title: string
          reservation_duration_minutes?: number
          slug: string
          status?: Database['public']['Enums']['raffle_status']
          title: string
          total_numbers?: number
          updated_at?: string
        }
        Update: {
          bundle_price?: number
          bundle_quantity?: number
          contact_whatsapp?: string
          created_at?: string
          currency?: string
          description?: string | null
          draw_description?: string | null
          id?: string
          max_numbers_per_reservation?: number
          number_price?: number
          organizer_name?: string
          owner_id?: string
          payment_alias?: string
          prize_description?: string | null
          prize_image_url?: string | null
          prize_title?: string
          reservation_duration_minutes?: number
          slug?: string
          status?: Database['public']['Enums']['raffle_status']
          title?: string
          total_numbers?: number
          updated_at?: string
        }
        Relationships: []
      }
      reservation_numbers: {
        Row: {
          created_at: string
          number: number
          raffle_id: string
          raffle_number_id: string
          reservation_id: string
        }
        Insert: {
          created_at?: string
          number: number
          raffle_id: string
          raffle_number_id: string
          reservation_id: string
        }
        Update: {
          created_at?: string
          number?: number
          raffle_id?: string
          raffle_number_id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reservation_numbers_raffle_number_fk'
            columns: ['raffle_number_id', 'raffle_id']
            isOneToOne: false
            referencedRelation: 'raffle_numbers'
            referencedColumns: ['id', 'raffle_id']
          },
          {
            foreignKeyName: 'reservation_numbers_reservation_fk'
            columns: ['reservation_id', 'raffle_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id', 'raffle_id']
          },
        ]
      }
      reservations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          customer_name: string
          customer_whatsapp: string
          expires_at: string | null
          id: string
          lookup_token: string
          payment_method: Database['public']['Enums']['payment_method']
          raffle_id: string
          rejection_reason: string | null
          status: Database['public']['Enums']['reservation_status']
          submitted_at: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          expires_at?: string | null
          id?: string
          lookup_token?: string
          payment_method: Database['public']['Enums']['payment_method']
          raffle_id: string
          rejection_reason?: string | null
          status?: Database['public']['Enums']['reservation_status']
          submitted_at?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          expires_at?: string | null
          id?: string
          lookup_token?: string
          payment_method?: Database['public']['Enums']['payment_method']
          raffle_id?: string
          rejection_reason?: string | null
          status?: Database['public']['Enums']['reservation_status']
          submitted_at?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reservations_raffle_id_fkey'
            columns: ['raffle_id']
            isOneToOne: false
            referencedRelation: 'raffles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_raffle_reservation: {
        Args: { p_reservation_id: string }
        Returns: Json
      }
      create_raffle_hold: {
        Args: {
          p_customer_name: string
          p_customer_whatsapp: string
          p_numbers: number[]
          p_payment_method: Database['public']['Enums']['payment_method']
          p_raffle_id: string
        }
        Returns: Json
      }
      reject_raffle_reservation: {
        Args: { p_reason?: string; p_reservation_id: string }
        Returns: Json
      }
      release_expired_reservations: {
        Args: { p_raffle_id?: string }
        Returns: number
      }
      submit_raffle_reservation: {
        Args: {
          p_lookup_token: string
          p_mime_type?: string
          p_original_filename?: string
          p_size_bytes?: number
          p_storage_path?: string
        }
        Returns: Json
      }
    }
    Enums: {
      payment_method: 'transfer' | 'cash'
      raffle_number_status: 'available' | 'held' | 'pending' | 'paid'
      raffle_status: 'draft' | 'active' | 'closed' | 'drawn' | 'cancelled'
      reservation_status:
        'held' | 'pending' | 'paid' | 'rejected' | 'expired' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      payment_method: ['transfer', 'cash'],
      raffle_number_status: ['available', 'held', 'pending', 'paid'],
      raffle_status: ['draft', 'active', 'closed', 'drawn', 'cancelled'],
      reservation_status: [
        'held',
        'pending',
        'paid',
        'rejected',
        'expired',
        'cancelled',
      ],
    },
  },
} as const
