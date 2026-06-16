/**
 * store/authStore.js
 *
 * Drop into client/src/store/authStore.js
 * Wraps login/logout and persists the JWT to localStorage.
 */
import { create } from "zustand"
import { authApi } from "../lib/api.js"

export const useAuthStore = create((set) => ({
  user:  null,
  token: localStorage.getItem("token") ?? null,

  // Called on app boot — fetches /auth/me if a token already exists
  init: async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const user = await authApi.me()
      set({ user, token })
    } catch {
      localStorage.removeItem("token")
      set({ user: null, token: null })
    }
  },

  login: async (email, password) => {
    const { user, token } = await authApi.login(email, password)
    localStorage.setItem("token", token)
    set({ user, token })
    return user
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null })
  },
}))

// Convenience selectors
export const selectUser    = (s) => s.user
export const selectRole    = (s) => s.user?.role
export const selectTeamId  = (s) => s.user?.teamId
export const selectIsAdmin = (s) => s.user?.role === "admin"
