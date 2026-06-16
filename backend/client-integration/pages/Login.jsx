/**
 * pages/Login.jsx  — updated to call the real backend
 * Replace your existing Login.jsx with this file.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import { useAuthStore } from "../store/authStore"

export default function Login() {
  const navigate  = useNavigate()
  const login     = useAuthStore((s) => s.login)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === "admin" ? "/admin" : "/team")
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">Welcome back</h1>
        <p className="text-slate-400 text-center text-sm mb-8">Sign in to your team dashboard</p>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tamil-efl.com"
                required
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Dev hint */}
        <div className="mt-6 card p-4 space-y-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Quick access (dev)</p>
          {[
            { label: "Admin",      email: "admin@tamil-efl.com",    pw: "Admin@123" },
            { label: "Nexus FC",   email: "nexusfc@tamil-efl.com",  pw: "Owner@123" },
          ].map(({ label, email: e, pw }) => (
            <button
              key={label}
              onClick={() => { setEmail(e); setPassword(pw) }}
              className="w-full text-left text-xs text-slate-400 hover:text-accent transition-colors px-2 py-1 rounded"
            >
              {label} → {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
