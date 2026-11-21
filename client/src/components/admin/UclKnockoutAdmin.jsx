import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Trophy, Trash2, ChevronRight, Zap, Check } from "lucide-react"
import { useUclKnockoutList, useCreateUclKnockout, useDeleteUclKnockout } from "../../lib/queries"
import { uclKnockoutApi } from "../../lib/api"
import { cn } from "../../lib/utils"

const STATUS_CONFIG = {
  draw:      { label: "Draw Ready", color: "text-amber-400",   bg: "bg-amber-400/15 border border-amber-400/30" },
  active:    { label: "Active",     color: "text-emerald-400", bg: "bg-emerald-400/15 border border-emerald-400/30" },
  completed: { label: "Completed",  color: "text-accent",      bg: "bg-accent/15 border border-accent/30" },
}

// Step 1: Enter a name
// Step 2: Manually pick qualifiers from each group (default = top 4)
function CreateForm({ onClose }) {
  const navigate = useNavigate()
  const createTournament = useCreateUclKnockout()

  const [step, setStep]           = useState("name")  // "name" | "pick"
  const [name, setName]           = useState("")
  const [groups, setGroups]       = useState([])       // [{groupId, groupName, players:[{id,name,points,gd,gf}]}]
  const [selected, setSelected]   = useState({})       // { groupId: Set<playerId> }
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadErr, setLoadErr]     = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)

  async function loadStandings() {
    setLoadingGroups(true)
    setLoadErr(null)
    try {
      const data = await uclKnockoutApi.previewStandings()
      // data = array of groups, each = array of player objects sorted by standings
      const normalised = data.map(grp => ({
        groupId:   grp[0]?.groupId,
        groupName: grp[0]?.groupName ?? "Group",
        players:   grp,
      })).filter(g => g.groupId)

      setGroups(normalised)
      setActiveGroup(normalised[0]?.groupId ?? null)

      // Default: auto-select top 4 from each group
      const defaults = {}
      for (const g of normalised) {
        defaults[g.groupId] = new Set(g.players.slice(0, 4).map(p => p.id))
      }
      setSelected(defaults)
    } catch (e) {
      setLoadErr("Could not load group standings. Make sure UCL groups have players.")
    } finally {
      setLoadingGroups(false)
    }
  }

  async function handleNameNext() {
    if (!name.trim()) return
    await loadStandings()
    setStep("pick")
  }

  function togglePlayer(groupId, playerId) {
    setSelected(prev => {
      const next = { ...prev, [groupId]: new Set(prev[groupId] ?? []) }
      if (next[groupId].has(playerId)) next[groupId].delete(playerId)
      else next[groupId].add(playerId)
      return next
    })
  }

  async function handleGenerate() {
    const playerIds = Object.values(selected).flatMap(s => [...s])
    if (playerIds.length < 2) return
    const t = await createTournament.mutateAsync({ name: name.trim(), playerIds })
    onClose()
    navigate(`/ucl-knockout/draw/${t.id}`)
  }

  const totalSelected = Object.values(selected).reduce((s, set) => s + set.size, 0)

  if (step === "name") {
    return (
      <div className="card p-5 space-y-4 mb-5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-white">Generate UCL Knockout</h3>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Tournament Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNameNext()}
            placeholder="e.g. UCL Knockout 2025"
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/40" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm">Cancel</button>
          <button onClick={handleNameNext} disabled={!name.trim() || loadingGroups}
            className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40">
            {loadingGroups ? "Loading…" : "Next: Pick Qualifiers →"}
          </button>
        </div>
      </div>
    )
  }

  // Step 2: pick players per group
  const activeGroupData = groups.find(g => g.groupId === activeGroup)

  return (
    <div className="card p-5 space-y-4 mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-white">Select KO Qualifiers — {name}</h3>
        </div>
        <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
          {totalSelected} selected
        </span>
      </div>

      <p className="text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        ⚠️ Top 4 from each group pre-selected. Click any player to toggle qualification. Works for groups of any size.
      </p>

      {loadErr && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{loadErr}</p>}

      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap">
        {groups.map(g => {
          const qCount = selected[g.groupId]?.size ?? 0
          return (
            <button key={g.groupId} onClick={() => setActiveGroup(g.groupId)}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                activeGroup === g.groupId ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
              )}>
              {g.groupName}
              <span className="ml-1.5 text-xs text-emerald-400">✓{qCount}</span>
            </button>
          )
        })}
      </div>

      {/* Player list for active group */}
      {activeGroupData && (
        <div className="card overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <h4 className="text-sm font-semibold text-white">{activeGroupData.groupName} — {activeGroupData.players.length} players</h4>
          </div>
          <div className="divide-y divide-surface-border/50">
            {activeGroupData.players.map((p, i) => {
              const isQ = selected[activeGroupData.groupId]?.has(p.id) ?? false
              return (
                <div key={p.id}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors",
                    isQ && "bg-emerald-500/5 border-l-2 border-emerald-500"
                  )}
                  onClick={() => togglePlayer(activeGroupData.groupId, p.id)}>
                  <span className="text-slate-500 text-sm w-5 text-center">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.points != null ? `${p.points}pts · GD ${p.gd > 0 ? `+${p.gd}` : p.gd}` : "No results yet"}
                    </p>
                  </div>
                  {isQ ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />Qualified
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                      + Qualify
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => setStep("name")} className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm">← Back</button>
        <button onClick={handleGenerate}
          disabled={totalSelected < 2 || createTournament.isPending}
          className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40">
          {createTournament.isPending ? "Generating…" : `Generate Draw (${totalSelected} players) →`}
        </button>
      </div>
    </div>
  )
}

export default function UclKnockoutAdmin() {
  const navigate = useNavigate()
  const { data: tournaments = [], isLoading } = useUclKnockoutList()
  const deleteTournament = useDeleteUclKnockout()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">UCL Knockout Stage</h2>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-accent text-white border border-accent/50 hover:bg-accent-dim transition-colors">
            <Zap className="w-3.5 h-3.5" /> Generate Knockout
          </button>
        )}
      </div>

      {showCreate && <CreateForm onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <p className="text-sm text-slate-500 text-center py-6">Loading…</p>
      ) : tournaments.length === 0 && !showCreate ? (
        <div className="card px-5 py-10 text-center">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No UCL Knockout tournament yet</p>
          <p className="text-slate-600 text-xs mt-1">Generate one after UCL group stage is complete</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.draw
            return (
              <div key={t.id} className="card flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {confirmDel === t.id ? (
                    <>
                      <button onClick={() => setConfirmDel(null)} className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-slate-400">Cancel</button>
                      <button onClick={() => { deleteTournament.mutate(t.id); setConfirmDel(null) }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold">Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setConfirmDel(t.id)}
                        className="w-7 h-7 rounded-lg hover:bg-rose-400/10 flex items-center justify-center text-slate-500 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {t.status === "draw" && (
                        <button onClick={() => navigate(`/ucl-knockout/draw/${t.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30 text-xs font-semibold">
                          View Draw <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(t.status === "active" || t.status === "completed") && (
                        <button onClick={() => navigate(`/ucl-knockout/bracket/${t.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent border border-accent/25 text-xs font-semibold">
                          View Bracket <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}