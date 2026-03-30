import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: any | null
  isAdmin: boolean
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: any | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile, isAdmin: profile?.is_admin === true }),
  setLoading: (loading) => set({ loading }),

  initialize: () => {
    if (get().initialized) return () => {}
    
    const supabase = createClient()

    // 1. 초기 세션 확인 (시작 시 한 번만)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      set({ user, initialized: true })
      
      if (user) {
        // 프로필 정보 가져오기 (지연시간 추가로 락 경쟁 방지)
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            
            set({ 
              profile, 
              isAdmin: profile?.is_admin === true,
              loading: false 
            })
          } catch (error) {
            console.error('Initial profile fetch error:', error)
            set({ loading: false })
          }
        }, 150)
      } else {
        set({ loading: false })
      }
    })

    // 2. 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        set({ user })
        
        if (user) {
          set({ loading: true })
          // 지연시간 추가로 락 경쟁 방지
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
              
              set({ 
                profile, 
                isAdmin: profile?.is_admin === true,
                loading: false 
              })
            } catch (error) {
              console.error('Auth state change profile fetch error:', error)
              set({ loading: false })
            }
          }, 150)
        } else {
          set({ profile: null, isAdmin: false, loading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }
}))
