export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      families: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          timezone: string;
          subscription_tier: 'free' | 'pro';
          parent_pin_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          timezone?: string;
          subscription_tier?: 'free' | 'pro';
          parent_pin_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          timezone?: string;
          subscription_tier?: 'free' | 'pro';
          parent_pin_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          profile_id: string;
          role: 'parent' | 'co_parent';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          profile_id: string;
          role: 'parent' | 'co_parent';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          profile_id?: string;
          role?: 'parent' | 'co_parent';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kids: {
        Row: {
          id: string;
          family_id: string;
          display_name: string;
          avatar_emoji: string | null;
          birth_year: number | null;
          color_theme: string | null;
          points_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          display_name: string;
          avatar_emoji?: string | null;
          birth_year?: number | null;
          color_theme?: string | null;
          points_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          display_name?: string;
          avatar_emoji?: string | null;
          birth_year?: number | null;
          color_theme?: string | null;
          points_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          profile_id: string;
          token: string;
          platform: string | null;
          device_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          token: string;
          platform?: string | null;
          device_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          token?: string;
          platform?: string | null;
          device_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chores: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          description: string | null;
          points: number;
          schedule_type: 'one_time' | 'daily' | 'weekly' | 'custom';
          schedule_config: Json | null;
          requires_approval: boolean;
          high_value: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          description?: string | null;
          points: number;
          schedule_type: 'one_time' | 'daily' | 'weekly' | 'custom';
          schedule_config?: Json | null;
          requires_approval?: boolean;
          high_value?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          title?: string;
          description?: string | null;
          points?: number;
          schedule_type?: 'one_time' | 'daily' | 'weekly' | 'custom';
          schedule_config?: Json | null;
          requires_approval?: boolean;
          high_value?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chore_assignments: {
        Row: {
          id: string;
          chore_id: string;
          kid_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chore_id: string;
          kid_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chore_id?: string;
          kid_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chore_instances: {
        Row: {
          id: string;
          chore_id: string;
          kid_id: string;
          family_id: string;
          due_date: string;
          status: 'pending' | 'completed_unverified' | 'completed_verified' | 'skipped' | 'expired';
          completed_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
          points_awarded: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chore_id: string;
          kid_id: string;
          family_id: string;
          due_date: string;
          status?: 'pending' | 'completed_unverified' | 'completed_verified' | 'skipped' | 'expired';
          completed_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          points_awarded?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chore_id?: string;
          kid_id?: string;
          family_id?: string;
          due_date?: string;
          status?: 'pending' | 'completed_unverified' | 'completed_verified' | 'skipped' | 'expired';
          completed_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          points_awarded?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      points_transactions: {
        Row: {
          id: string;
          family_id: string;
          kid_id: string;
          amount: number;
          source_type: 'chore' | 'reward_redemption' | 'bonus' | 'adjustment';
          source_id: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          kid_id: string;
          amount: number;
          source_type: 'chore' | 'reward_redemption' | 'bonus' | 'adjustment';
          source_id?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          kid_id?: string;
          amount?: number;
          source_type?: 'chore' | 'reward_redemption' | 'bonus' | 'adjustment';
          source_id?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          description: string | null;
          cost_points: number;
          icon_emoji: string | null;
          stock: number | null;
          requires_approval: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          description?: string | null;
          cost_points: number;
          icon_emoji?: string | null;
          stock?: number | null;
          requires_approval?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          title?: string;
          description?: string | null;
          cost_points?: number;
          icon_emoji?: string | null;
          stock?: number | null;
          requires_approval?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reward_redemptions: {
        Row: {
          id: string;
          family_id: string;
          reward_id: string;
          kid_id: string;
          cost_points: number;
          status: 'requested' | 'approved' | 'delivered' | 'rejected';
          approved_at: string | null;
          approved_by: string | null;
          delivered_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          reward_id: string;
          kid_id: string;
          cost_points: number;
          status?: 'requested' | 'approved' | 'delivered' | 'rejected';
          approved_at?: string | null;
          approved_by?: string | null;
          delivered_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          reward_id?: string;
          kid_id?: string;
          cost_points?: number;
          status?: 'requested' | 'approved' | 'delivered' | 'rejected';
          approved_at?: string | null;
          approved_by?: string | null;
          delivered_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      streaks: {
        Row: {
          id: string;
          kid_id: string;
          current_weekly_streak: number;
          longest_weekly_streak: number;
          last_week_completed: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kid_id: string;
          current_weekly_streak?: number;
          longest_weekly_streak?: number;
          last_week_completed?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kid_id?: string;
          current_weekly_streak?: number;
          longest_weekly_streak?: number;
          last_week_completed?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      award_points: {
        Args: {
          p_family_id: string;
          p_kid_id: string;
          p_amount: number;
          p_source_type: 'chore' | 'reward_redemption' | 'bonus' | 'adjustment';
          p_source_id: string | null;
          p_note: string | null;
        };
        Returns: string;
      };
      redeem_reward: {
        Args: {
          p_reward_id: string;
          p_kid_id: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
