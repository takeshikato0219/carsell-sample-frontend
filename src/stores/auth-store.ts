import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, UserRole } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
  isAdmin: () => boolean
  isManager: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token)
        set({ user, accessToken: token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
      isAdmin: () => {
        const state = get()
        return state.user?.role === UserRole.ADMIN
      },
      isManager: () => {
        const state = get()
        return state.user?.role === UserRole.ADMIN || state.user?.role === UserRole.MANAGER
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
