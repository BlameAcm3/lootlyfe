export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          owner_user_id: string;
          subscription_tier: 'free' | 'pro' | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          subscription_tier?: 'free' | 'pro' | null;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          subscription_tier?: 'free' | 'pro' | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string | null;
        };
        Relationships: [];
      };
      chores: {
        Row: { id: string; family_id: string };
        Insert: { id?: string; family_id: string };
        Update: { id?: string; family_id?: string };
        Relationships: [];
      };
      rewards: {
        Row: { id: string; family_id: string };
        Insert: { id?: string; family_id: string };
        Update: { id?: string; family_id?: string };
        Relationships: [];
      };
      redemptions: {
        Row: { id: string; family_id: string };
        Insert: { id?: string; family_id: string };
        Update: { id?: string; family_id?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
