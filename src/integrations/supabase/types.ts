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
      advertisements: {
        Row: {
          category_id: string | null
          clicks: number
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          image_url: string
          link: string | null
          location: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          category_id?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          link?: string | null
          location?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          category_id?: string | null
          clicks?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          link?: string | null
          location?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          meta: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      banner_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          image_url: string
          link_url: string | null
          notes: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          image_url: string
          link_url?: string | null
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          image_url?: string
          link_url?: string | null
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          banner_type: string
          click_count: number
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          link_url: string | null
          position: number
          starts_at: string | null
          subtitle: string | null
          title: string
          view_count: number
        }
        Insert: {
          active?: boolean
          banner_type?: string
          click_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          view_count?: number
        }
        Update: {
          active?: boolean
          banner_type?: string
          click_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          view_count?: number
        }
        Relationships: []
      }
      bump_purchases: {
        Row: {
          bumped_at: string
          id: string
          listing_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          bumped_at?: string
          id?: string
          listing_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          bumped_at?: string
          id?: string
          listing_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bump_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bump_purchases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_name: string
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          hours: Json
          id: string
          logo_url: string | null
          socials: Json
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          business_name: string
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hours?: Json
          id?: string
          logo_url?: string | null
          socials?: Json
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          business_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hours?: Json
          id?: string
          logo_url?: string | null
          socials?: Json
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          image_url: string | null
          is_featured: boolean
          name_en: string
          name_ml: string
          parent_slug: string | null
          position: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name_en: string
          name_ml: string
          parent_slug?: string | null
          position?: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name_en?: string
          name_ml?: string
          parent_slug?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      chats: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          active: boolean
          created_at: string
          expiry_date: string
          id: string
          listing_id: string
          priority: number
          start_date: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expiry_date: string
          id?: string
          listing_id: string
          priority?: number
          start_date?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expiry_date?: string
          id?: string
          listing_id?: string
          priority?: number
          start_date?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          bumped_at: string | null
          category_slug: string
          condition: Database["public"]["Enums"]["listing_condition"]
          contact_number: string
          created_at: string
          description: string
          featured: boolean
          featured_until: string | null
          id: string
          is_hidden: boolean
          is_pinned: boolean
          island: string
          location: string | null
          pin_priority: number
          price: number
          priority: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          view_count: number
          views: number
        }
        Insert: {
          bumped_at?: string | null
          category_slug: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          contact_number: string
          created_at?: string
          description: string
          featured?: boolean
          featured_until?: string | null
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          island: string
          location?: string | null
          pin_priority?: number
          price: number
          priority?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
          views?: number
        }
        Update: {
          bumped_at?: string | null
          category_slug?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          contact_number?: string
          created_at?: string
          description?: string
          featured?: boolean
          featured_until?: string | null
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          island?: string
          location?: string | null
          pin_priority?: number
          price?: number
          priority?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ad_free_until: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          firebase_uid: string | null
          full_name: string | null
          hide_contact: boolean
          id: string
          is_banned: boolean
          island: string | null
          phone: string | null
          subscription_tier: string
          terms_accepted_at: string | null
          updated_at: string
          verified_seller: boolean
        }
        Insert: {
          ad_free_until?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          firebase_uid?: string | null
          full_name?: string | null
          hide_contact?: boolean
          id: string
          is_banned?: boolean
          island?: string | null
          phone?: string | null
          subscription_tier?: string
          terms_accepted_at?: string | null
          updated_at?: string
          verified_seller?: boolean
        }
        Update: {
          ad_free_until?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          firebase_uid?: string | null
          full_name?: string | null
          hide_contact?: boolean
          id?: string
          is_banned?: boolean
          island?: string | null
          phone?: string | null
          subscription_tier?: string
          terms_accepted_at?: string | null
          updated_at?: string
          verified_seller?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reporter_id: string
          resolved: boolean
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reporter_id: string
          resolved?: boolean
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reporter_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ad_free: boolean
          benefits: Json
          code: string
          created_at: string
          currency: string
          duration_days: number
          id: string
          is_active: boolean
          max_listings: number | null
          name: string
          price: number
          priority_support: boolean
          search_priority: number
          sort_order: number
          tier: string
          updated_at: string
          verified_badge: boolean
        }
        Insert: {
          ad_free?: boolean
          benefits?: Json
          code: string
          created_at?: string
          currency?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_listings?: number | null
          name: string
          price?: number
          priority_support?: boolean
          search_priority?: number
          sort_order?: number
          tier?: string
          updated_at?: string
          verified_badge?: boolean
        }
        Update: {
          ad_free?: boolean
          benefits?: Json
          code?: string
          created_at?: string
          currency?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_listings?: number | null
          name?: string
          price?: number
          priority_support?: boolean
          search_priority?: number
          sort_order?: number
          tier?: string
          updated_at?: string
          verified_badge?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          expiry_date: string
          id: string
          plan_id: string
          start_date: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expiry_date: string
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expiry_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          meta: Json
          provider: string
          provider_ref: string | null
          purpose: string
          status: string
          target_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          meta?: Json
          provider?: string
          provider_ref?: string | null
          purpose: string
          status?: string
          target_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          meta?: Json
          provider?: string
          provider_ref?: string | null
          purpose?: string
          status?: string
          target_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      verification_requests: {
        Row: {
          additional_docs: Json | null
          address_document_url: string | null
          admin_notes: string | null
          created_at: string
          fee_transaction_id: string | null
          full_name: string | null
          id: string
          id_document_url: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_docs?: Json | null
          address_document_url?: string | null
          admin_notes?: string | null
          created_at?: string
          fee_transaction_id?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_docs?: Json | null
          address_document_url?: string | null
          admin_notes?: string | null
          created_at?: string
          fee_transaction_id?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_fee_transaction_id_fkey"
            columns: ["fee_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          island: string | null
          verified_seller: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          island?: string | null
          verified_seller?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          island?: string | null
          verified_seller?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      listing_condition: "new" | "used"
      listing_status: "pending" | "approved" | "rejected" | "sold"
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
      app_role: ["admin", "user"],
      listing_condition: ["new", "used"],
      listing_status: ["pending", "approved", "rejected", "sold"],
    },
  },
} as const
