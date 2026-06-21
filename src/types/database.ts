export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          xp: number
          streak: number
          last_active_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          xp?: number
          streak?: number
          last_active_date?: string | null
        }
        Update: {
          display_name?: string
          xp?: number
          streak?: number
          last_active_date?: string | null
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          user_id: string
          code: string
          name: string
          description: string | null
          weeks: number
          progress: number
          professor_name: string | null
          professor_email: string | null
          office_hours: string | null
          room: string | null
          notes_extra: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          name: string
          description?: string | null
          weeks?: number
          progress?: number
          professor_name?: string | null
          professor_email?: string | null
          office_hours?: string | null
          room?: string | null
          notes_extra?: string | null
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
          weeks?: number
          progress?: number
          professor_name?: string | null
          professor_email?: string | null
          office_hours?: string | null
          room?: string | null
          notes_extra?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          course_id: string | null
          title: string
          content: string | null
          week: number | null
          concepts: string[]
          file_url: string | null
          file_type: string | null
          file_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id?: string | null
          title: string
          content?: string | null
          week?: number | null
          concepts?: string[]
          file_url?: string | null
          file_type?: string | null
          file_name?: string | null
        }
        Update: {
          title?: string
          content?: string | null
          week?: number | null
          concepts?: string[]
          file_url?: string | null
          file_type?: string | null
          file_name?: string | null
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          course_code: string | null
          score: number
          total_questions: number
          xp_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_code?: string | null
          score: number
          total_questions: number
          xp_earned?: number
        }
        Update: {
          score?: number
          total_questions?: number
          xp_earned?: number
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_type: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: string
        }
        Update: {
          badge_type?: string
        }
      }
      learning_objectives: {
        Row: {
          id: string
          user_id: string
          course_id: string
          week: number
          objective: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          week: number
          objective: string
          completed?: boolean
        }
        Update: {
          objective?: string
          completed?: boolean
        }
      }
      assessments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          title: string
          type: string
          due_date: string | null
          weight: number | null
          weeks: number[]
          description: string | null
          grade: number | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          title: string
          type?: string
          due_date?: string | null
          weight?: number | null
          weeks?: number[]
          description?: string | null
          grade?: number | null
          completed?: boolean
        }
        Update: {
          title?: string
          type?: string
          due_date?: string | null
          weight?: number | null
          weeks?: number[]
          description?: string | null
          grade?: number | null
          completed?: boolean
        }
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string
          display_name: string
          xp: number
          streak: number
          rank: number
        }
      }
    }
    Functions: {
      add_xp: {
        Args: { user_uuid: string; amount: number }
        Returns: void
      }
      update_streak: {
        Args: { user_uuid: string }
        Returns: void
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type QuizAttempt = Database['public']['Tables']['quiz_attempts']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']
export type LearningObjective = Database['public']['Tables']['learning_objectives']['Row']
export type Assessment = Database['public']['Tables']['assessments']['Row']
export type LeaderboardEntry = Database['public']['Views']['leaderboard']['Row']
