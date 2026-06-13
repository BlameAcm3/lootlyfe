export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          id: string
          kind: string
          points: number
          threshold: number
        }
        Insert: {
          created_at?: string
          id: string
          kind: string
          points: number
          threshold?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          points?: number
          threshold?: number
        }
        Relationships: []
      }
      adventurer_achievements: {
        Row: {
          achievement_id: string
          adventurer_id: string
          earned_at: string
          id: string
        }
        Insert: {
          achievement_id: string
          adventurer_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          achievement_id?: string
          adventurer_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventurer_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adventurer_achievements_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adventurer_cosmetics: {
        Row: {
          adventurer_id: string
          cosmetic_id: string
          equipped: boolean
          id: string
          unlocked_at: string
        }
        Insert: {
          adventurer_id: string
          cosmetic_id: string
          equipped?: boolean
          id?: string
          unlocked_at?: string
        }
        Update: {
          adventurer_id?: string
          cosmetic_id?: string
          equipped?: boolean
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventurer_cosmetics_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adventurer_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
        ]
      }
      adventurer_profiles: {
        Row: {
          achievement_points: number
          age_bucket: string
          archived_at: string | null
          avatar_config: Json
          created_at: string
          current_streak_days: number
          gold_balance: number
          guild_id: string
          id: string
          level: number
          longest_streak_days: number
          nickname: string
          theme_id: string
          variant_id: string
          xp_total: number
        }
        Insert: {
          achievement_points?: number
          age_bucket: string
          archived_at?: string | null
          avatar_config?: Json
          created_at?: string
          current_streak_days?: number
          gold_balance?: number
          guild_id: string
          id?: string
          level?: number
          longest_streak_days?: number
          nickname: string
          theme_id?: string
          variant_id?: string
          xp_total?: number
        }
        Update: {
          achievement_points?: number
          age_bucket?: string
          archived_at?: string | null
          avatar_config?: Json
          created_at?: string
          current_streak_days?: number
          gold_balance?: number
          guild_id?: string
          id?: string
          level?: number
          longest_streak_days?: number
          nickname?: string
          theme_id?: string
          variant_id?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "adventurer_profiles_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_events: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          method: string
          npc_id: string
          type: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          method: string
          npc_id: string
          type: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          method?: string
          npc_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_events_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetic_items: {
        Row: {
          achievement_point_cost: number
          created_at: string
          id: string
          item_key: string
          name: string
          premium_only: boolean
          season: string | null
          slot: string
        }
        Insert: {
          achievement_point_cost?: number
          created_at?: string
          id?: string
          item_key: string
          name: string
          premium_only?: boolean
          season?: string | null
          slot: string
        }
        Update: {
          achievement_point_cost?: number
          created_at?: string
          id?: string
          item_key?: string
          name?: string
          premium_only?: boolean
          season?: string | null
          slot?: string
        }
        Relationships: []
      }
      device_bindings: {
        Row: {
          adventurer_id: string
          created_at: string
          guild_id: string
          id: string
          label: string | null
          last_seen_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          adventurer_id: string
          created_at?: string
          guild_id: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          adventurer_id?: string
          created_at?: string
          guild_id?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_bindings_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_bindings_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          id: string
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gold_xp_ledger: {
        Row: {
          adventurer_id: string
          created_at: string
          delta_achievement_points: number
          delta_gold: number
          delta_xp: number
          id: string
          source_id: string | null
          source_type: string
        }
        Insert: {
          adventurer_id: string
          created_at?: string
          delta_achievement_points?: number
          delta_gold?: number
          delta_xp?: number
          id?: string
          source_id?: string | null
          source_type: string
        }
        Update: {
          adventurer_id?: string
          created_at?: string
          delta_achievement_points?: number
          delta_gold?: number
          delta_xp?: number
          id?: string
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gold_xp_ledger_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_npc_id: string | null
          code: string
          created_at: string
          expires_at: string
          guild_id: string
          id: string
          invited_by_npc_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_npc_id?: string | null
          code: string
          created_at?: string
          expires_at?: string
          guild_id: string
          id?: string
          invited_by_npc_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_npc_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          guild_id?: string
          id?: string
          invited_by_npc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_invites_accepted_by_npc_id_fkey"
            columns: ["accepted_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_invites_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_invites_invited_by_npc_id_fkey"
            columns: ["invited_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          created_at: string
          crest: string | null
          id: string
          name: string
          owner_npc_id: string | null
          subscription_entitlement: string
        }
        Insert: {
          created_at?: string
          crest?: string | null
          id?: string
          name: string
          owner_npc_id?: string | null
          subscription_entitlement?: string
        }
        Update: {
          created_at?: string
          crest?: string | null
          id?: string
          name?: string
          owner_npc_id?: string | null
          subscription_entitlement?: string
        }
        Relationships: [
          {
            foreignKeyName: "guilds_owner_npc_id_fkey"
            columns: ["owner_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_items: {
        Row: {
          created_at: string
          created_by_npc_id: string
          description: string | null
          gold_cost: number
          guild_id: string
          id: string
          name: string
          stock: number | null
        }
        Insert: {
          created_at?: string
          created_by_npc_id: string
          description?: string | null
          gold_cost: number
          guild_id: string
          id?: string
          name: string
          stock?: number | null
        }
        Update: {
          created_at?: string
          created_by_npc_id?: string
          description?: string | null
          gold_cost?: number
          guild_id?: string
          id?: string
          name?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_items_created_by_npc_id_fkey"
            columns: ["created_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_items_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_redemptions: {
        Row: {
          adventurer_id: string
          approved_at: string | null
          approved_by_npc_id: string | null
          gold_spent: number
          id: string
          loot_id: string
          requested_at: string
          status: string
        }
        Insert: {
          adventurer_id: string
          approved_at?: string | null
          approved_by_npc_id?: string | null
          gold_spent: number
          id?: string
          loot_id: string
          requested_at?: string
          status?: string
        }
        Update: {
          adventurer_id?: string
          approved_at?: string | null
          approved_by_npc_id?: string | null
          gold_spent?: number
          id?: string
          loot_id?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loot_redemptions_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_redemptions_approved_by_npc_id_fkey"
            columns: ["approved_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_redemptions_loot_id_fkey"
            columns: ["loot_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_wishlist: {
        Row: {
          adventurer_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          proposed_gold_cost: number | null
          status: string
        }
        Insert: {
          adventurer_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          proposed_gold_cost?: number | null
          status?: string
        }
        Update: {
          adventurer_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          proposed_gold_cost?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loot_wishlist_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          enabled: boolean
          id: string
          npc_id: string
          scope_id: string | null
          scope_type: string
        }
        Insert: {
          channel: string
          enabled?: boolean
          id?: string
          npc_id: string
          scope_id?: string | null
          scope_type: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          id?: string
          npc_id?: string
          scope_id?: string | null
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_notification_settings: {
        Row: {
          master_enabled: boolean
          npc_id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
        }
        Insert: {
          master_enabled?: boolean
          npc_id: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
        }
        Update: {
          master_enabled?: boolean
          npc_id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_notification_settings_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: true
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_profiles: {
        Row: {
          avatar: string | null
          created_at: string
          display_name: string
          guild_id: string
          id: string
          pin_hash: string | null
          role: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          display_name: string
          guild_id: string
          id?: string
          pin_hash?: string | null
          role?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          display_name?: string
          guild_id?: string
          id?: string
          pin_hash?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_profiles_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_codes: {
        Row: {
          adventurer_id: string
          code: string
          consumed_at: string | null
          created_at: string
          created_by_npc_id: string
          expires_at: string
          guild_id: string
          id: string
        }
        Insert: {
          adventurer_id: string
          code: string
          consumed_at?: string | null
          created_at?: string
          created_by_npc_id: string
          expires_at: string
          guild_id: string
          id?: string
        }
        Update: {
          adventurer_id?: string
          code?: string
          consumed_at?: string | null
          created_at?: string
          created_by_npc_id?: string
          expires_at?: string
          guild_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_codes_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_codes_created_by_npc_id_fkey"
            columns: ["created_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_codes_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_completions: {
        Row: {
          adventurer_id: string
          approved_at: string | null
          approved_by_npc_id: string | null
          completed_at: string
          due_date: string
          id: string
          proof_url: string | null
          quest_id: string
          rejection_reason: string | null
          status: string
        }
        Insert: {
          adventurer_id: string
          approved_at?: string | null
          approved_by_npc_id?: string | null
          completed_at?: string
          due_date?: string
          id?: string
          proof_url?: string | null
          quest_id: string
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          adventurer_id?: string
          approved_at?: string | null
          approved_by_npc_id?: string | null
          completed_at?: string
          due_date?: string
          id?: string
          proof_url?: string | null
          quest_id?: string
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_adventurer_id_fkey"
            columns: ["adventurer_id"]
            isOneToOne: false
            referencedRelation: "adventurer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_approved_by_npc_id_fkey"
            columns: ["approved_by_npc_id"]
            isOneToOne: false
            referencedRelation: "npc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          archived_at: string | null
          assigned_adventurer_ids: string[]
          category: string | null
          created_at: string
          description: string | null
          gold_reward: number
          guild_id: string
          id: string
          is_required: boolean
          recurrence: Json | null
          requires_approval: boolean
          source_preset_id: string | null
          title: string
          xp_reward: number
        }
        Insert: {
          archived_at?: string | null
          assigned_adventurer_ids?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          gold_reward?: number
          guild_id: string
          id?: string
          is_required?: boolean
          recurrence?: Json | null
          requires_approval?: boolean
          source_preset_id?: string | null
          title: string
          xp_reward?: number
        }
        Update: {
          archived_at?: string | null
          assigned_adventurer_ids?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          gold_reward?: number
          guild_id?: string
          id?: string
          is_required?: boolean
          recurrence?: Json | null
          requires_approval?: boolean
          source_preset_id?: string | null
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "quests_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_guild_invite: {
        Args: { p_code: string; p_display_name?: string }
        Returns: string
      }
      accept_wishlist_item: {
        Args: { p_gold_cost: number; p_stock?: number; p_wishlist_id: string }
        Returns: string
      }
      adventurer_guild_id: {
        Args: { p_adventurer_id: string }
        Returns: string
      }
      assert_npc_seat_available: {
        Args: { p_extra: number; p_guild_id: string }
        Returns: undefined
      }
      award_achievements: {
        Args: { p_adventurer_id: string; p_as_of: string }
        Returns: undefined
      }
      bound_adventurer_id: { Args: never; Returns: string }
      bound_guild_id: { Args: never; Returns: string }
      can_act_for_adventurer: {
        Args: { p_adventurer_id: string }
        Returns: boolean
      }
      compute_streak: {
        Args: { p_adventurer_id: string; p_as_of: string }
        Returns: number
      }
      create_guild: {
        Args: {
          p_consent_method?: string
          p_crest: string
          p_display_name: string
          p_name: string
        }
        Returns: string
      }
      create_guild_invite: {
        Args: never
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      create_pairing_code: {
        Args: { p_adventurer_id: string }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      delete_guild: { Args: { p_guild_id: string }; Returns: undefined }
      enqueue_push: { Args: { p_payload: Json }; Returns: undefined }
      had_full_required_week: {
        Args: { p_adventurer_id: string; p_as_of: string }
        Returns: boolean
      }
      in_quiet_hours: {
        Args: { p_end: string; p_start: string; p_tz: string }
        Returns: boolean
      }
      is_full_user: { Args: never; Returns: boolean }
      is_guild_npc: { Args: { p_guild_id: string }; Returns: boolean }
      level_for_xp: { Args: { p_xp: number }; Returns: number }
      purchase_cosmetic: {
        Args: { p_adventurer_id: string; p_cosmetic_id: string }
        Returns: string
      }
      quest_due_on: {
        Args: { p_day: string; p_recurrence: Json }
        Returns: boolean
      }
      resolve_push_targets: {
        Args: { p_adventurer_id: string; p_guild_id: string; p_type: string }
        Returns: {
          platform: string
          token: string
          user_id: string
        }[]
      }
      set_avatar_base: {
        Args: { p_adventurer_id: string; p_base: number }
        Returns: undefined
      }
      set_equipped_cosmetic: {
        Args: {
          p_adventurer_id: string
          p_cosmetic_id: string
          p_equipped: boolean
        }
        Returns: undefined
      }
      set_mode_pin: { Args: { p_pin: string }; Returns: undefined }
      streak_multiplier: { Args: { p_days: number }; Returns: number }
      touch_device_binding: { Args: never; Returns: boolean }
      verify_mode_pin: { Args: { p_pin: string }; Returns: boolean }
      xp_for_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

