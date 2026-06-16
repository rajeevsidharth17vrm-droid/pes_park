import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { authApi } from "../lib/api"
import { useAuthStore } from "../store/authStore"

export default function Login() {
  const navigate        = useNavigate()
  const setAuth         = useAuthStore(s => s.setAuth)
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return setError("Please fill in all fields")
    setError("")
    setLoading(true)
    try {
      const { token, user } = await authApi.login(email, password)
      setAuth(user, token)
      navigate(user.role === "admin" ? "/admin" : "/team")
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password")
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

        <div className="card p-6 space-y-4">
          {error && (
            <div className="bg-rose-400/10 border border-rose-400/25 rounded-lg px-3 py-2.5">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="you@example.com"
              className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors mt-2"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}