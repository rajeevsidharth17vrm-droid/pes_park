import { useState } from "react"
import { Users, CheckCircle, Eye, EyeOff } from "lucide-react"
import { useCreateTeam } from "../../lib/queries"
import { cn } from "../../lib/utils"

export default function CreateTeam({ onSuccess }) {
  const [name, setName]         = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [done, setDone]         = useState(null)
  const createTeam              = useCreateTeam()

  const canSubmit = name && username && email && password

  const handleSubmit = () => {
    if (!canSubmit) return
    createTeam.mutate(
      { name, ownerUsername: username, ownerEmail: email, ownerPassword: password },
      {
        onSuccess: (data) => {
          setDone(data)
          setName(""); setUsername(""); setEmail(""); setPassword("")
          onSuccess?.()
        },
        onError: (err) => alert(err.response?.data?.error || "Failed to create team"),
      }
    )
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-white">Create new team</h3>
      </div>

      {done && (
        <div className="bg-emerald-400/10 border border-emerald-400/25 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Team created!</span>
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-white font-medium">{done.team.name}</span> created.
            Owner login: <span className="font-medium text-white">{done.owner.email}</span>
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Team name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Tamil Tigers"
          className="w-full bg-pitch-800 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/40 transition-colors" />
      </div>

      <div className="border-t border-surface-border pt-4">
        <p className="text-xs text-slate-500 mb-3">Team owner login credentials</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="e.g. tamiltigers_owner"
              className="w-full bg-pitch-800 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/40 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="owner@email.com"
              className="w-full bg-pitch-800 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/40 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Set a password for the owner"
                className="w-full bg-pitch-800 border border-surface-border rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/40 transition-colors" />
              <button onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit || createTeam.isPending}
        className={cn("w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
          canSubmit ? "bg-accent hover:bg-accent-dim text-white" : "bg-surface-border text-slate-600 cursor-not-allowed")}>
        {createTeam.isPending ? "Creating…" : "Create team + owner account"}
      </button>
    </div>
  )
}