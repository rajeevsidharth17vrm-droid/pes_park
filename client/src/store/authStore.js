import { create } from "zustand"

export const useAuthStore = create((set) => ({
  user:  null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem("token", token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null })
  },

  init: () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token")
        return
      }
      set({ user: payload, token })
    } catch {
      localStorage.removeItem("token")
    }
  },
}))