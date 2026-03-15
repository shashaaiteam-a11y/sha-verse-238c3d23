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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      book_deletion_requests: {
        Row: {
          admin_notes: string | null
          book_id: string
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          book_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          book_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_deletion_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_ratings: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          rating: number
          review: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reading_progress: {
        Row: {
          book_id: string
          completed: boolean | null
          current_page: number | null
          id: string
          last_read_at: string | null
          total_pages: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          completed?: boolean | null
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          total_pages?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          completed?: boolean | null
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          age_restriction: string | null
          author: string
          book_url: string | null
          category: string | null
          channel_id: string
          comments_count: number | null
          comments_enabled: boolean | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          downloads_count: number | null
          id: string
          language: string | null
          likes_count: number | null
          pages: number | null
          rating_avg: number | null
          rating_count: number | null
          ratings_enabled: boolean | null
          tags: string[] | null
          title: string
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          age_restriction?: string | null
          author: string
          book_url?: string | null
          category?: string | null
          channel_id: string
          comments_count?: number | null
          comments_enabled?: boolean | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          language?: string | null
          likes_count?: number | null
          pages?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          ratings_enabled?: boolean | null
          tags?: string[] | null
          title: string
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          age_restriction?: string | null
          author?: string
          book_url?: string | null
          category?: string | null
          channel_id?: string
          comments_count?: number | null
          comments_enabled?: boolean | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          language?: string | null
          likes_count?: number | null
          pages?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          ratings_enabled?: boolean | null
          tags?: string[] | null
          title?: string
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_approval_logs: {
        Row: {
          action: string
          channel_id: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          channel_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          channel_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_approval_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_membership_tiers: {
        Row: {
          badge_url: string | null
          benefits: string[] | null
          channel_id: string
          created_at: string | null
          id: string
          name: string
          price_cents: number
        }
        Insert: {
          badge_url?: string | null
          benefits?: string[] | null
          channel_id: string
          created_at?: string | null
          id?: string
          name: string
          price_cents?: number
        }
        Update: {
          badge_url?: string | null
          benefits?: string[] | null
          channel_id?: string
          created_at?: string | null
          id?: string
          name?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_membership_tiers_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_memberships: {
        Row: {
          channel_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          started_at: string | null
          status: string | null
          tier_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          tier_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_memberships_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "channel_membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_monetization: {
        Row: {
          channel_id: string
          cpm_rate_cents: number | null
          created_at: string | null
          id: string
          is_eligible: boolean | null
          minimum_payout_cents: number | null
          payout_email: string | null
          payout_method: string | null
          revenue_balance_cents: number | null
          total_earnings_cents: number | null
          total_watch_hours: number | null
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          cpm_rate_cents?: number | null
          created_at?: string | null
          id?: string
          is_eligible?: boolean | null
          minimum_payout_cents?: number | null
          payout_email?: string | null
          payout_method?: string | null
          revenue_balance_cents?: number | null
          total_earnings_cents?: number | null
          total_watch_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          cpm_rate_cents?: number | null
          created_at?: string | null
          id?: string
          is_eligible?: boolean | null
          minimum_payout_cents?: number | null
          payout_email?: string | null
          payout_method?: string | null
          revenue_balance_cents?: number | null
          total_earnings_cents?: number | null
          total_watch_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_monetization_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          banner_url: string | null
          category: string | null
          channel_type: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          rejection_reason: string | null
          subscribers_count: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          category?: string | null
          channel_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          rejection_reason?: string | null
          subscribers_count?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          category?: string | null
          channel_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          rejection_reason?: string | null
          subscribers_count?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          book_id: string | null
          content: string
          created_at: string | null
          group_post_id: string | null
          id: string
          parent_comment_id: string | null
          post_id: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          book_id?: string | null
          content: string
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          book_id?: string | null
          content?: string
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_fingerprints: {
        Row: {
          audio_hash: string | null
          combined_hash: string
          created_at: string
          id: string
          owner_id: string
          video_hash: string | null
          video_id: string
        }
        Insert: {
          audio_hash?: string | null
          combined_hash: string
          created_at?: string
          id?: string
          owner_id: string
          video_hash?: string | null
          video_id: string
        }
        Update: {
          audio_hash?: string | null
          combined_hash?: string
          created_at?: string
          id?: string
          owner_id?: string
          video_hash?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_fingerprints_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_group: boolean | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copyright_claims: {
        Row: {
          action: string | null
          admin_notes: string | null
          claimant_id: string
          created_at: string
          id: string
          match_percentage: number | null
          original_video_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          video_id: string
        }
        Insert: {
          action?: string | null
          admin_notes?: string | null
          claimant_id: string
          created_at?: string
          id?: string
          match_percentage?: number | null
          original_video_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          video_id: string
        }
        Update: {
          action?: string | null
          admin_notes?: string | null
          claimant_id?: string
          created_at?: string
          id?: string
          match_percentage?: number | null
          original_video_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copyright_claims_original_video_id_fkey"
            columns: ["original_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copyright_claims_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_badges: {
        Row: {
          achievements: Json | null
          badge_icon_url: string | null
          badge_level: string
          channel_id: string
          created_at: string
          id: string
          total_boosts_received: number | null
          total_followers: number | null
          total_motions: number | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          achievements?: Json | null
          badge_icon_url?: string | null
          badge_level?: string
          channel_id: string
          created_at?: string
          id?: string
          total_boosts_received?: number | null
          total_followers?: number | null
          total_motions?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          achievements?: Json | null
          badge_icon_url?: string | null
          badge_level?: string
          channel_id?: string
          created_at?: string
          id?: string
          total_boosts_received?: number | null
          total_followers?: number | null
          total_motions?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_badges_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_boosts: {
        Row: {
          amount_cents: number
          animation_type: string | null
          boost_tier: string
          channel_id: string
          created_at: string
          id: string
          is_highlighted: boolean | null
          message: string | null
          sender_id: string
          video_id: string | null
        }
        Insert: {
          amount_cents: number
          animation_type?: string | null
          boost_tier?: string
          channel_id: string
          created_at?: string
          id?: string
          is_highlighted?: boolean | null
          message?: string | null
          sender_id: string
          video_id?: string | null
        }
        Update: {
          amount_cents?: number
          animation_type?: string | null
          boost_tier?: string
          channel_id?: string
          created_at?: string
          id?: string
          is_highlighted?: boolean | null
          message?: string | null
          sender_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_boosts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_boosts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_boosts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          ad_revenue_cents: number | null
          boost_revenue_cents: number | null
          channel_id: string
          created_at: string
          id: string
          membership_revenue_cents: number | null
          period_end: string
          period_start: string
          total_views: number | null
          total_watch_minutes: number | null
        }
        Insert: {
          ad_revenue_cents?: number | null
          boost_revenue_cents?: number | null
          channel_id: string
          created_at?: string
          id?: string
          membership_revenue_cents?: number | null
          period_end: string
          period_start: string
          total_views?: number | null
          total_watch_minutes?: number | null
        }
        Update: {
          ad_revenue_cents?: number | null
          boost_revenue_cents?: number | null
          channel_id?: string
          created_at?: string
          id?: string
          membership_revenue_cents?: number | null
          period_end?: string
          period_start?: string
          total_views?: number | null
          total_watch_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_suggestions: {
        Row: {
          created_at: string | null
          id: string
          reason: Json | null
          score: number | null
          suggested_user_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: Json | null
          score?: number | null
          suggested_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: Json | null
          score?: number | null
          suggested_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_suggestions_suggested_user_id_fkey"
            columns: ["suggested_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          group_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          group_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          group_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_blocked_users_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_blocked_users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_blocked_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_insights: {
        Row: {
          active_members: number | null
          comments_count: number | null
          created_at: string | null
          date: string
          group_id: string
          id: string
          left_members: number | null
          new_members: number | null
          posts_count: number | null
          reactions_count: number | null
        }
        Insert: {
          active_members?: number | null
          comments_count?: number | null
          created_at?: string | null
          date?: string
          group_id: string
          id?: string
          left_members?: number | null
          new_members?: number | null
          posts_count?: number | null
          reactions_count?: number | null
        }
        Update: {
          active_members?: number | null
          comments_count?: number | null
          created_at?: string | null
          date?: string
          group_id?: string
          id?: string
          left_members?: number | null
          new_members?: number | null
          posts_count?: number | null
          reactions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_insights_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          group_id: string
          id: string
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          edited: boolean | null
          file_name: string | null
          file_url: string | null
          group_id: string
          id: string
          image_url: string | null
          is_deleted: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string | null
          profiles: Json | null
          reactions: Json | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          edited?: boolean | null
          file_name?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          profiles?: Json | null
          reactions?: Json | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          edited?: boolean | null
          file_name?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          profiles?: Json | null
          reactions?: Json | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          approval_status: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          image_url: string | null
          is_announcement: boolean | null
          likes_count: number | null
          pinned: boolean | null
          post_type: string | null
          shares_count: number | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          approval_status?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_announcement?: boolean | null
          likes_count?: number | null
          pinned?: boolean | null
          post_type?: string | null
          shares_count?: number | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          approval_status?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_announcement?: boolean | null
          likes_count?: number | null
          pinned?: boolean | null
          post_type?: string | null
          shares_count?: number | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_reports: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          reason: string
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          reason: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          reason?: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          group_id: string
          id: string
          position: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_id: string
          id?: string
          position?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_id?: string
          id?: string
          position?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_user_warnings: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          reason: string
          user_id: string
          warned_by: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          reason: string
          user_id: string
          warned_by: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          reason?: string
          user_id?: string
          warned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_user_warnings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_private: boolean | null
          members_count: number | null
          name: string
          posts_count: number | null
          require_join_approval: boolean | null
          require_post_approval: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          members_count?: number | null
          name: string
          posts_count?: number | null
          require_join_approval?: boolean | null
          require_post_approval?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          members_count?: number | null
          name?: string
          posts_count?: number | null
          require_join_approval?: boolean | null
          require_post_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          book_id: string | null
          comment_id: string | null
          created_at: string | null
          group_post_id: string | null
          id: string
          post_id: string | null
          reaction_type: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          book_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          book_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          bucket: string
          created_at: string | null
          duration: number | null
          height: number | null
          id: string
          metadata: Json | null
          owner: string | null
          path: string
          size: number | null
          type: string | null
          width: number | null
        }
        Insert: {
          bucket: string
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          metadata?: Json | null
          owner?: string | null
          path: string
          size?: number | null
          type?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          metadata?: Json | null
          owner?: string | null
          path?: string
          size?: number | null
          type?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          edited: boolean | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          edited?: boolean | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          edited?: boolean | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          id: string
          page_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          id?: string
          page_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          id?: string
          page_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocked_users_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_blocked_users_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_blocked_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_followers: {
        Row: {
          created_at: string | null
          id: string
          page_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_insights: {
        Row: {
          created_at: string | null
          date: string
          engagement: number | null
          id: string
          new_followers: number | null
          page_id: string
          page_views: number | null
          post_impressions: number | null
          reach: number | null
          unfollowers: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          engagement?: number | null
          id?: string
          new_followers?: number | null
          page_id: string
          page_views?: number | null
          post_impressions?: number | null
          reach?: number | null
          unfollowers?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          engagement?: number | null
          id?: string
          new_followers?: number | null
          page_id?: string
          page_views?: number | null
          post_impressions?: number | null
          reach?: number | null
          unfollowers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_insights_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          engagement_count: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          page_id: string
          posted_by: string
          published_at: string | null
          reach_count: number | null
          scheduled_at: string | null
          shares_count: number | null
          updated_at: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          page_id: string
          posted_by: string
          published_at?: string | null
          reach_count?: number | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          page_id?: string
          posted_by?: string
          published_at?: string | null
          reach_count?: number | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_posts_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          page_id: string
          role: Database["public"]["Enums"]["page_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          page_id: string
          role?: Database["public"]["Enums"]["page_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          page_id?: string
          role?: Database["public"]["Enums"]["page_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_roles_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          about: string | null
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          followers_count: number | null
          hours: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          slug: string | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          followers_count?: number | null
          hours?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          followers_count?: number | null
          hours?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount_cents: number
          channel_id: string
          id: string
          payout_details: Json | null
          payout_method: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          amount_cents: number
          channel_id: string
          id?: string
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number
          channel_id?: string
          id?: string
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          added_at: string | null
          id: string
          playlist_id: string
          position: number | null
          video_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          playlist_id: string
          position?: number | null
          video_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          playlist_id?: string
          position?: number | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          video_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          video_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_count?: number | null
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          position: number
          post_id: string
          vote_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          position?: number
          post_id: string
          vote_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          position?: number
          post_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          id: string
          media_id: string | null
          ordinal: number | null
          post_id: string | null
        }
        Insert: {
          id?: string
          media_id?: string | null
          ordinal?: number | null
          post_id?: string | null
        }
        Update: {
          id?: string
          media_id?: string | null
          ordinal?: number | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          edited: boolean | null
          edited_at: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          media_urls: string[] | null
          metadata: Json | null
          parent_post: string | null
          pinned: boolean | null
          poll_data: Json | null
          shares_count: number | null
          type: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          edited?: boolean | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          media_urls?: string[] | null
          metadata?: Json | null
          parent_post?: string | null
          pinned?: boolean | null
          poll_data?: Json | null
          shares_count?: number | null
          type?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          edited?: boolean | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          media_urls?: string[] | null
          metadata?: Json | null
          parent_post?: string | null
          pinned?: boolean | null
          poll_data?: Json | null
          shares_count?: number | null
          type?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_parent_post_fkey"
            columns: ["parent_post"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_field_privacy: {
        Row: {
          created_at: string | null
          field_name: string
          id: string
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: string
          updated_at?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_field_privacy_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          cover_url: string | null
          created_at: string | null
          current_city: string | null
          display_name: string
          education: string | null
          facebook_url: string | null
          gender: string | null
          hobbies: string[] | null
          hometown: string | null
          id: string
          instagram_url: string | null
          is_verified: boolean | null
          last_login: string | null
          location: string | null
          phone: string | null
          phone_number: string | null
          privacy: Json | null
          provider: string | null
          relationship_status: string | null
          twitter_url: string | null
          updated_at: string | null
          username: string
          website: string | null
          work: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_city?: string | null
          display_name: string
          education?: string | null
          facebook_url?: string | null
          gender?: string | null
          hobbies?: string[] | null
          hometown?: string | null
          id: string
          instagram_url?: string | null
          is_verified?: boolean | null
          last_login?: string | null
          location?: string | null
          phone?: string | null
          phone_number?: string | null
          privacy?: Json | null
          provider?: string | null
          relationship_status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
          work?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_city?: string | null
          display_name?: string
          education?: string | null
          facebook_url?: string | null
          gender?: string | null
          hobbies?: string[] | null
          hometown?: string | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean | null
          last_login?: string | null
          location?: string | null
          phone?: string | null
          phone_number?: string | null
          privacy?: Json | null
          provider?: string | null
          relationship_status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
          work?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          reason: string | null
          reporter: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          reason?: string | null
          reporter?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          reason?: string | null
          reporter?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_fkey"
            columns: ["reporter"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_transactions: {
        Row: {
          amount_cents: number
          channel_id: string
          created_at: string | null
          description: string | null
          id: string
          type: string
          video_id: string | null
        }
        Insert: {
          amount_cents?: number
          channel_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          video_id?: string | null
        }
        Update: {
          amount_cents?: number
          channel_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_books: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          group_post_id: string | null
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_videos: {
        Row: {
          id: string
          saved_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          id?: string
          saved_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          id?: string
          saved_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          comment: string | null
          created_at: string | null
          group_post_id: string | null
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          group_post_id?: string | null
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          background_color: string | null
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          privacy: string | null
          story_type: string | null
          text_content: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          background_color?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          privacy?: string | null
          story_type?: string | null
          text_content?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          background_color?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          privacy?: string | null
          story_type?: string | null
          text_content?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_replies: {
        Row: {
          created_at: string
          id: string
          message: string
          recipient_id: string
          sender_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          recipient_id: string
          sender_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string
          sender_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          notification_level: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          notification_level?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          notification_level?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      superchats: {
        Row: {
          amount_cents: number
          channel_id: string
          color: string | null
          created_at: string | null
          id: string
          message: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          amount_cents: number
          channel_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          amount_cents?: number
          channel_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "superchats_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "superchats_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      transcoding_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          progress: number | null
          started_at: string | null
          status: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          progress?: number | null
          started_at?: string | null
          status?: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          progress?: number | null
          started_at?: string | null
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcoding_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feed: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          score: number | null
          source_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          score?: number | null
          source_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          score?: number | null
          source_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          category: string
          created_at: string | null
          id: string
          message: string
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          last_seen: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_seen?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_seen?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active: string | null
          location: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active?: string | null
          location?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active?: string | null
          location?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analytics: {
        Row: {
          avg_view_duration_seconds: number | null
          comments: number | null
          date: string
          dislikes: number | null
          estimated_revenue_cents: number | null
          id: string
          likes: number | null
          shares: number | null
          video_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          avg_view_duration_seconds?: number | null
          comments?: number | null
          date?: string
          dislikes?: number | null
          estimated_revenue_cents?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          video_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          avg_view_duration_seconds?: number | null
          comments?: number | null
          date?: string
          dislikes?: number | null
          estimated_revenue_cents?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          video_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      video_dislikes: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_dislikes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          user_id: string
          video_id: string
          watch_duration_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          user_id: string
          video_id: string
          watch_duration_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          user_id?: string
          video_id?: string
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_interactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_management_requests: {
        Row: {
          admin_notes: string | null
          channel_id: string
          created_at: string | null
          id: string
          proposed_changes: Json | null
          reason: string
          request_type: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          video_id: string
        }
        Insert: {
          admin_notes?: string | null
          channel_id: string
          created_at?: string | null
          id?: string
          proposed_changes?: Json | null
          reason: string
          request_type: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          video_id: string
        }
        Update: {
          admin_notes?: string | null
          channel_id?: string
          created_at?: string | null
          id?: string
          proposed_changes?: Json | null
          reason?: string
          request_type?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_management_requests_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_management_requests_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_qualities: {
        Row: {
          bitrate: number | null
          created_at: string | null
          file_size: number | null
          height: number | null
          id: string
          resolution: string
          status: string
          video_id: string
          video_url: string
          width: number | null
        }
        Insert: {
          bitrate?: number | null
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          resolution: string
          status?: string
          video_id: string
          video_url: string
          width?: number | null
        }
        Update: {
          bitrate?: number | null
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          resolution?: string
          status?: string
          video_id?: string
          video_url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_qualities_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string | null
          channel_id: string
          comments_count: number | null
          created_at: string | null
          description: string | null
          duration: number | null
          hls_url: string | null
          id: string
          is_short: boolean | null
          likes_count: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          transcoding_status: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          category?: string | null
          channel_id: string
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          hls_url?: string | null
          id?: string
          is_short?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          transcoding_status?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          category?: string | null
          channel_id?: string
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          hls_url?: string | null
          id?: string
          is_short?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          transcoding_status?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          id: string
          progress: number | null
          user_id: string
          video_id: string
          watch_duration_seconds: number | null
          watch_percentage: number | null
          watched_at: string | null
        }
        Insert: {
          id?: string
          progress?: number | null
          user_id: string
          video_id: string
          watch_duration_seconds?: number | null
          watch_percentage?: number | null
          watched_at?: string | null
        }
        Update: {
          id?: string
          progress?: number | null
          user_id?: string
          video_id?: string
          watch_duration_seconds?: number | null
          watch_percentage?: number | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_later: {
        Row: {
          added_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_later_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      are_friends: {
        Args: { _user1: string; _user2: string }
        Returns: boolean
      }
      calculate_friend_suggestions: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      can_view_private_profile_data: {
        Args: { _profile_owner_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_attempt_type: string; p_identifier: string }
        Returns: boolean
      }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          notif_body?: string
          notif_data?: Json
          notif_title: string
          notif_type: string
          target_user_id: string
        }
        Returns: string
      }
      generate_feed_for_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_group_role: {
        Args: { _group_id: string; _user_id: string }
        Returns: string
      }
      get_visible_profile_fields: {
        Args: { _profile_owner_id: string; _viewer_id: string }
        Returns: Json
      }
      has_page_role: {
        Args: {
          _page_id: string
          _roles: Database["public"]["Enums"]["page_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      increment_member_warnings: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_public: { Args: { _group_id: string }; Returns: boolean }
      is_page_admin: {
        Args: { _page_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { _blocked_id: string; _blocker_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      page_role: "admin" | "editor" | "moderator" | "advertiser" | "analyst"
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
      page_role: ["admin", "editor", "moderator", "advertiser", "analyst"],
    },
  },
} as const
