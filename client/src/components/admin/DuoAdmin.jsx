/**
 * DuoAdmin.jsx — Dynamic Team Tournament (Duo) admin module
 *
 * Tabs: Tournaments → Teams & Players → Groups (group_knockout only) → Fixtures → Standings
 */
import { useState, useMemo } from "react"
import {
  Plus, Trash2, ChevronRight, Users, Trophy, RefreshCw,
  CheckCircle, AlertCircle, X, Shield, ListOrdered, Shuffle, Settings2
} from "lucide-react"
import {
  useDuoTournaments, useDuoTournament, useDuoFixtures, useDuoStandings, useDuoTopScorers,
  useCreateDuoTournament, useDeleteDuoTournament, useUpdateDuoTournament, useCompleteDuoTournament,
  useCreateDuoTeam, useDeleteDuoTeam,
  useAddDuoPlayer, useRemoveDuoPlayer,
  useGenerateDuoFixtures, useDeleteDuoFixtures,
  useSaveDuoResult, useResetDuoFixture, useSetDuoTiebreaker,
  usePlayers,
  useDrawDuoGroups, useGenerateDuoGroupFixtures, useDuoGroupStandings,
  useGenerateDuoKnockout, useDeleteDuoKnockoutFixtures,
  useDuoFixturesByStage,
} from "../../lib/queries"
import { cn } from "../../lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { label: "Draft",     cls: "text-slate-400 bg-slate-700" },
  active:    { label: "Active",    cls: "text-emerald-400 bg-emerald-400/15 border border-emerald-400/30" },
  completed: { label: "Completed", cls: "text-accent bg-accent/15 border border-accent/30" },
}

const FORMAT_LABELS = {
  round_robin:    "Round Robin",
  knockout:       "Knockout",
  group_knockout: "Group + Knockout",
}

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-white mb-3">{children}</h3>
}

function Err({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Tournament Form
// ─────────────────────────────────────────────────────────────────────────────
function CreateTournamentForm({ onClose }) {
  const create = useCreateDuoTournament()
  const [form, setForm] = useState({
    name: "",
    season_number: 1,
    team_size: 2,
    format: "round_robin",
    num_teams: 8,
    settings: { best_player_enabled: false, golden_boot_enabled: false, affects_main_stats: false },
  })
  const [err, setErr] = useState("")

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setSetting(k, v) { setForm(f => ({ ...f, settings: { ...f.settings, [k]: v } })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr("")
    try {
      await create.mutateAsync(form)
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 mb-4 border border-accent/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">New Duo Tournament</p>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
      </div>

      <Err msg={err} />

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Tournament Name *</label>
          <input required value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Season 1 Duo 2v2"
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Season #</label>
          <input type="number" min="1" value={form.season_number} onChange={e => set("season_number", +e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Team Size</label>
          <select value={form.team_size} onChange={e => set("team_size", +e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40">
            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}v{n}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Format</label>
          <select value={form.format} onChange={e => set("format", e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40">
            <option value="round_robin">Round Robin</option>
            <option value="knockout">Knockout</option>
            <option value="group_knockout">Group + Knockout</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Number of Teams</label>
          <select value={form.num_teams} onChange={e => set("num_teams", +e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40">
            {[4, 8, 16, 32, 64].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-medium">Tournament Settings</p>
        {[
          ["best_player_enabled",   "Best Player Award"],
          ["golden_boot_enabled",   "Golden Boot Award"],
          ["affects_main_stats",    "Affects Main Stats (league stats)"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.settings[key]}
              onChange={e => setSetting(key, e.target.checked)}
              className="w-4 h-4 rounded accent-accent" />
            <span className="text-xs text-slate-300">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm hover:bg-pitch-800">
          Cancel
        </button>
        <button type="submit" disabled={create.isPending}
          className="flex-1 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
          {create.isPending ? "Creating…" : "Create Tournament"}
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament List
// ─────────────────────────────────────────────────────────────────────────────
function TournamentList({ onSelect }) {
  const { data: tournaments = [], isLoading } = useDuoTournaments()
  const deleteTournament = useDeleteDuoTournament()
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-3">
      {!showCreate && (
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90">
          <Plus className="w-4 h-4" /> New Tournament
        </button>
      )}
      {showCreate && <CreateTournamentForm onClose={() => setShowCreate(false)} />}

      {tournaments.length === 0 && !showCreate && (
        <p className="text-sm text-slate-500">No tournaments yet. Create one above.</p>
      )}

      {tournaments.map(t => (
        <div key={t.id} className="card p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{t.name}</span>
              <Badge status={t.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Season {t.season_number} · {FORMAT_LABELS[t.format]} · {t.team_size}v{t.team_size} · {t.num_teams} teams
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onSelect(t.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pitch-800 text-slate-300 text-xs hover:bg-pitch-700 transition-colors">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTournament.mutate(t.id) }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Picker (shared)
// ─────────────────────────────────────────────────────────────────────────────
function PlayerPicker({ excludeIds = [], onPick, label = "Add Player" }) {
  const { data: players = [] } = usePlayers()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() =>
    players.filter(p =>
      !excludeIds.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    ), [players, excludeIds, search]
  )

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-accent/40 text-accent text-xs hover:bg-accent/5 transition-colors">
        <Plus className="w-3 h-3" /> {label}
      </button>
    )
  }

  return (
    <div className="border border-surface-border rounded-lg p-3 space-y-2 bg-pitch-900">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search players…" autoFocus
        className="w-full bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filtered.slice(0, 20).map(p => (
          <button key={p.id}
            onClick={() => { onPick(p); setOpen(false); setSearch("") }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-pitch-800 text-sm text-white text-left transition-colors">
            <span>{p.name}</span>
            <span className="text-xs text-slate-500">{p.overall_rating ?? "–"}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-slate-500 px-3 py-2">No players found</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Manager (inside a tournament)
// ─────────────────────────────────────────────────────────────────────────────
function TeamManager({ tournament }) {
  const createTeam  = useCreateDuoTeam()
  const deleteTeam  = useDeleteDuoTeam()
  const addPlayer   = useAddDuoPlayer()
  const removePlayer = useRemoveDuoPlayer()

  const [newTeamName, setNewTeamName] = useState("")
  const [err, setErr] = useState("")

  const allAssignedPlayerIds = useMemo(() =>
    (tournament.teams ?? []).flatMap(t => t.players.map(p => p.player_id)),
    [tournament.teams]
  )

  async function handleCreateTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setErr("")
    try {
      await createTeam.mutateAsync({ tournamentId: tournament.id, name: newTeamName.trim() })
      setNewTeamName("")
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Teams & Players ({tournament.team_size}v{tournament.team_size})</SectionTitle>
      <Err msg={err} />

      {/* Add team */}
      <form onSubmit={handleCreateTeam} className="flex gap-2">
        <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
          placeholder="New team name…"
          className="flex-1 bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
        <button type="submit" disabled={createTeam.isPending}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add Team
        </button>
      </form>

      {/* Team list */}
      <div className="space-y-3">
        {(tournament.teams ?? []).map(team => {
          const slotsLeft = tournament.team_size - team.players.length
          const pickerExcludes = allAssignedPlayerIds

          return (
            <div key={team.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent/60" />
                  <span className="text-sm font-semibold text-white">{team.name}</span>
                  <span className="text-xs text-slate-500">{team.players.length}/{tournament.team_size}</span>
                  {team.group_number && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                      Group {GROUP_LETTERS[team.group_number - 1] ?? team.group_number}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteTeam.mutate({ tournamentId: tournament.id, teamId: team.id }) }}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Players */}
              <div className="space-y-1.5">
                {team.players.map(p => (
                  <div key={p.player_id} className="flex items-center justify-between px-3 py-1.5 bg-pitch-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-4 text-center">#{p.slot}</span>
                      <span className="text-sm text-white">{p.player_name}</span>
                    </div>
                    <button
                      onClick={() => removePlayer.mutate({ tournamentId: tournament.id, teamId: team.id, playerId: p.player_id })}
                      className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {slotsLeft > 0 && (
                  <PlayerPicker
                    excludeIds={pickerExcludes}
                    label={`Add player (${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left)`}
                    onPick={(player) => addPlayer.mutate({
                      tournamentId: tournament.id,
                      teamId: team.id,
                      player_id: player.id,
                    })}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Draw Panel (group_knockout only)
// ─────────────────────────────────────────────────────────────────────────────
function GroupDrawPanel({ tournament }) {
  const teams = tournament.teams ?? []
  const drawGroups          = useDrawDuoGroups()
  const genGroupFixtures    = useGenerateDuoGroupFixtures()
  const genKnockout         = useGenerateDuoKnockout()
  const deleteKnockout      = useDeleteDuoKnockoutFixtures()
  const { data: groupFixtures = [] } = useDuoFixturesByStage(tournament.id, "group")
  const { data: knockoutFixtures = [] } = useDuoFixturesByStage(tournament.id, "knockout")

  const [mode, setMode] = useState("auto")   // "auto" | "manual"
  const [numGroups, setNumGroups] = useState(4)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  // manual assignments: { [teamId]: groupNumber }
  const [manualAssign, setManualAssign] = useState({})
  const [err, setErr] = useState("")
  const [info, setInfo] = useState("")

  const allGrouped    = teams.every(t => t.group_number != null)
  const hasGroupFixtures   = groupFixtures.length > 0
  const hasKnockoutFixtures = knockoutFixtures.length > 0
  const allGroupDone = hasGroupFixtures && groupFixtures.every(f => f.status === "completed")

  async function handleDraw() {
    setErr(""); setInfo("")
    try {
      let body = { mode, num_groups: numGroups }
      if (mode === "manual") {
        const assignments = teams.map(t => ({
          teamId: t.id,
          groupNumber: manualAssign[t.id] ?? 1,
        }))
        body.assignments = assignments
      }
      await drawGroups.mutateAsync({ tournamentId: tournament.id, ...body })
      setInfo("Groups drawn! Now generate group fixtures below.")
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  async function handleGenGroupFixtures() {
    setErr(""); setInfo("")
    try {
      await genGroupFixtures.mutateAsync(tournament.id)
      setInfo("Group fixtures generated!")
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  async function handleGenKnockout() {
    setErr(""); setInfo("")
    try {
      await genKnockout.mutateAsync({ tournamentId: tournament.id, advance_per_group: advancePerGroup })
      setInfo("Knockout bracket generated!")
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  async function handleDeleteKnockout() {
    setErr(""); setInfo("")
    try {
      await deleteKnockout.mutateAsync(tournament.id)
      setInfo("Knockout fixtures cleared.")
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  // Build group preview (for manual assignment UI or summary)
  const groupMap = useMemo(() => {
    const map = {}
    teams.forEach(t => {
      const g = t.group_number ?? manualAssign[t.id]
      if (!g) return
      if (!map[g]) map[g] = []
      map[g].push(t)
    })
    return map
  }, [teams, manualAssign])

  return (
    <div className="space-y-5">
      <SectionTitle>Group Draw</SectionTitle>
      <Err msg={err} />
      {info && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {info}
        </div>
      )}

      {/* ── Step 1: Draw / Assign groups ── */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-semibold text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center font-bold">1</span>
          Assign Teams to Groups
          {allGrouped && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {["auto", "manual"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                mode === m
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "border-surface-border text-slate-400 hover:bg-pitch-800"
              )}>
              {m === "auto" ? "🎲 Auto Draw" : "✏️ Manual"}
            </button>
          ))}
        </div>

        {/* Num groups */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 shrink-0">Number of groups</label>
          <select value={numGroups} onChange={e => setNumGroups(+e.target.value)}
            className="bg-pitch-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40">
            {[2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n} ({GROUP_LETTERS[0]}–{GROUP_LETTERS[n-1]})</option>)}
          </select>
        </div>

        {/* Manual assignment per team */}
        {mode === "manual" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Assign each team to a group:</p>
            {teams.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No teams added yet — go to the Teams tab first.</p>
            ) : (
              teams.map(t => {
                const currentGroup = manualAssign[t.id] ?? t.group_number ?? 1
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-pitch-900 rounded-lg">
                    <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="flex-1 text-sm text-white truncate">{t.name}</span>
                    <select
                      value={currentGroup}
                      onChange={e => setManualAssign(prev => ({ ...prev, [t.id]: +e.target.value }))}
                      className="bg-pitch-800 border border-accent/30 rounded-lg px-3 py-1.5 text-sm text-accent font-semibold focus:outline-none focus:border-accent/60">
                      {Array.from({ length: numGroups }, (_, i) => (
                        <option key={i+1} value={i+1}>Group {GROUP_LETTERS[i]}</option>
                      ))}
                    </select>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Current group assignment preview (auto mode or after draw) */}
        {allGrouped && mode === "auto" && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(groupMap).sort((a,b) => +a[0] - +b[0]).map(([g, gTeams]) => (
              <div key={g} className="bg-pitch-900 rounded-lg p-2 space-y-1">
                <p className="text-[10px] font-bold text-accent uppercase">Group {GROUP_LETTERS[+g-1]}</p>
                {gTeams.map(t => (
                  <p key={t.id} className="text-xs text-slate-300 truncate">{t.name}</p>
                ))}
              </div>
            ))}
          </div>
        )}

        <button onClick={handleDraw} disabled={drawGroups.isPending || teams.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
          <Shuffle className="w-4 h-4" />
          {drawGroups.isPending
            ? "Saving…"
            : mode === "manual"
              ? allGrouped ? "Reassign Groups" : "Save Group Assignments"
              : allGrouped ? "Redraw Groups" : "Auto Draw Groups"
          }
        </button>
      </div>

      {/* ── Step 2: Generate group fixtures ── */}
      <div className={cn("card p-4 space-y-3", !allGrouped && "opacity-40 pointer-events-none")}>
        <p className="text-xs font-semibold text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center font-bold">2</span>
          Generate Group Stage Fixtures
          {hasGroupFixtures && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </p>
        {hasGroupFixtures ? (
          <p className="text-xs text-slate-500">{groupFixtures.length} group fixtures generated. Play them out in the Fixtures tab.</p>
        ) : (
          <button onClick={handleGenGroupFixtures} disabled={genGroupFixtures.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
            <ListOrdered className="w-4 h-4" />
            {genGroupFixtures.isPending ? "Generating…" : "Generate Group Fixtures"}
          </button>
        )}
      </div>

      {/* ── Step 3: Generate knockout bracket ── */}
      <div className={cn("card p-4 space-y-3", !allGroupDone && "opacity-40 pointer-events-none")}>
        <p className="text-xs font-semibold text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center font-bold">3</span>
          Generate Knockout Bracket
          {hasKnockoutFixtures && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        </p>

        {!allGroupDone && !hasKnockoutFixtures && (
          <p className="text-xs text-slate-500">Complete all group stage matches first.</p>
        )}

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 shrink-0">Teams to advance per group</label>
          <select value={advancePerGroup} onChange={e => setAdvancePerGroup(+e.target.value)}
            className="bg-pitch-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40">
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!hasKnockoutFixtures ? (
            <button onClick={handleGenKnockout} disabled={genKnockout.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
              <Trophy className="w-4 h-4" />
              {genKnockout.isPending ? "Generating…" : "Generate Knockout Bracket"}
            </button>
          ) : (
            <>
              <p className="text-xs text-slate-400 self-center">{knockoutFixtures.length} knockout fixtures generated.</p>
              <button onClick={() => { if (confirm("Delete knockout fixtures?")) handleDeleteKnockout() }}
                disabled={deleteKnockout.isPending}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Reset Knockout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Entry Form (for a single fixture)
// ─────────────────────────────────────────────────────────────────────────────
function ResultForm({ fixture, tournament, onClose }) {
  const saveResult = useSaveDuoResult()

  // Build initial matchup state from team players
  const homeTeam = tournament.teams?.find(t => t.id === fixture.home_team_id)
  const awayTeam = tournament.teams?.find(t => t.id === fixture.away_team_id)

  const [matchups, setMatchups] = useState(() =>
    Array.from({ length: tournament.team_size }, (_, i) => ({
      slot: i + 1,
      home_player_id: homeTeam?.players?.[i]?.player_id ?? null,
      away_player_id: awayTeam?.players?.[i]?.player_id ?? null,
      home_score: 0,
      away_score: 0,
    }))
  )
  const [err, setErr] = useState("")

  function updateMatchup(idx, key, val) {
    setMatchups(prev => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr("")
    for (const m of matchups) {
      if (!m.home_player_id || !m.away_player_id)
        return setErr("All player slots must be assigned before entering results.")
    }
    try {
      await saveResult.mutateAsync({ fixtureId: fixture.id, matchups })
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error ?? e.message)
    }
  }

  const allHomePlayers = homeTeam?.players ?? []
  const allAwayPlayers = awayTeam?.players ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-pitch-900 rounded-xl border border-surface-border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          {fixture.home_team_name} <span className="text-slate-500">vs</span> {fixture.away_team_name}
        </p>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
      </div>
      <Err msg={err} />

      <div className="space-y-3">
        {matchups.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            {/* Home player */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Slot {m.slot} — Home</label>
              <select value={m.home_player_id ?? ""} onChange={e => updateMatchup(i, "home_player_id", +e.target.value || null)}
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/40">
                <option value="">— pick player —</option>
                {allHomePlayers.map(p => <option key={p.player_id} value={p.player_id}>{p.player_name}</option>)}
              </select>
              <input type="number" min="0" value={m.home_score} onChange={e => updateMatchup(i, "home_score", +e.target.value)}
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-accent/40" />
            </div>

            <span className="text-slate-500 text-xs font-bold text-center">vs</span>

            {/* Away player */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Slot {m.slot} — Away</label>
              <select value={m.away_player_id ?? ""} onChange={e => updateMatchup(i, "away_player_id", +e.target.value || null)}
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/40">
                <option value="">— pick player —</option>
                {allAwayPlayers.map(p => <option key={p.player_id} value={p.player_id}>{p.player_name}</option>)}
              </select>
              <input type="number" min="0" value={m.away_score} onChange={e => updateMatchup(i, "away_score", +e.target.value)}
                className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-accent/40" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm hover:bg-pitch-800">
          Cancel
        </button>
        <button type="submit" disabled={saveResult.isPending}
          className="flex-1 px-4 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
          {saveResult.isPending ? "Saving…" : "Save Result"}
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiebreaker Form
// ─────────────────────────────────────────────────────────────────────────────
function TiebreakerForm({ fixture, tournament, onClose }) {
  const setTiebreaker = useSetDuoTiebreaker()
  const homeTeam = tournament.teams?.find(t => t.id === fixture.home_team_id)
  const awayTeam = tournament.teams?.find(t => t.id === fixture.away_team_id)

  const [homePlayer, setHomePlayer] = useState(fixture.tiebreaker_home_player ?? "")
  const [awayPlayer, setAwayPlayer] = useState(fixture.tiebreaker_away_player ?? "")
  const [result, setResult] = useState("")
  const [err, setErr] = useState("")

  async function handleSetPlayers() {
    setErr("")
    try {
      await setTiebreaker.mutateAsync({
        fixtureId: fixture.id,
        tournamentId: fixture.tournament_id,
        tiebreaker_home_player: +homePlayer || null,
        tiebreaker_away_player: +awayPlayer || null,
      })
    } catch (e) { setErr(e.response?.data?.error ?? e.message) }
  }

  async function handleFinalise() {
    if (!result) return setErr("Select the winner")
    setErr("")
    try {
      await setTiebreaker.mutateAsync({
        fixtureId: fixture.id,
        tournamentId: fixture.tournament_id,
        tiebreaker_result: result,
      })
      onClose()
    } catch (e) { setErr(e.response?.data?.error ?? e.message) }
  }

  return (
    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-400">⚡ Tiebreaker — {fixture.home_team_name} vs {fixture.away_team_name}</p>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-slate-400">Pick one player from each team. Their 1v1 result decides the team winner.</p>
      <Err msg={err} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">Home player ({fixture.home_team_name})</label>
          <select value={homePlayer} onChange={e => setHomePlayer(e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
            <option value="">— pick —</option>
            {(homeTeam?.players ?? []).map(p => <option key={p.player_id} value={p.player_id}>{p.player_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">Away player ({fixture.away_team_name})</label>
          <select value={awayPlayer} onChange={e => setAwayPlayer(e.target.value)}
            className="w-full bg-pitch-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
            <option value="">— pick —</option>
            {(awayTeam?.players ?? []).map(p => <option key={p.player_id} value={p.player_id}>{p.player_name}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleSetPlayers} disabled={setTiebreaker.isPending}
        className="w-full px-3 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/10 disabled:opacity-50">
        Save Tiebreaker Players
      </button>

      {fixture.tiebreaker_home_player && fixture.tiebreaker_away_player && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">After they play — who won?</p>
          <div className="grid grid-cols-2 gap-2">
            {["home", "away"].map(side => (
              <button key={side}
                onClick={() => setResult(side)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-semibold border transition-colors",
                  result === side
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "border-surface-border text-slate-400 hover:bg-pitch-800"
                )}>
                {side === "home" ? fixture.home_team_name : fixture.away_team_name} wins
              </button>
            ))}
          </div>
          <button onClick={handleFinalise} disabled={!result || setTiebreaker.isPending}
            className="w-full px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50">
            Confirm Winner
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture list renderer (shared between group and knockout stages)
// ─────────────────────────────────────────────────────────────────────────────
function FixtureList({ fixtures, tournament, resetFixture }) {
  const [enteringResult, setEnteringResult] = useState(null)
  const [enteringTb, setEnteringTb] = useState(null)

  const byRound = fixtures.reduce((acc, f) => {
    const r = f.round ?? 0
    if (!acc[r]) acc[r] = []
    acc[r].push(f)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(byRound).map(([round, rFixtures]) => (
        <div key={round} className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Round {round}</p>
          {rFixtures.map(f => {
            const isEnteringResult = enteringResult === f.id
            const isEnteringTb     = enteringTb === f.id
            const completed = f.status === "completed"

            return (
              <div key={f.id} className="space-y-2">
                <div className={cn(
                  "card p-3 flex items-center gap-3",
                  f.is_tiebreaker_needed && "border border-amber-500/30"
                )}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0",
                    completed ? "bg-emerald-400" : f.is_tiebreaker_needed ? "bg-amber-400 animate-pulse" : "bg-slate-600"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {f.home_team_group && (
                        <span className="text-[10px] text-accent/70 font-bold">G{GROUP_LETTERS[f.home_team_group-1]}</span>
                      )}
                      <span className={cn("font-medium", f.winner_team_id === f.home_team_id ? "text-white" : "text-slate-400")}>
                        {f.home_team_name ?? "TBD"}
                      </span>
                      {completed ? (
                        <span className="text-slate-500 font-bold tabular-nums">{f.home_score}–{f.away_score}</span>
                      ) : (
                        <span className="text-slate-600 text-xs">vs</span>
                      )}
                      <span className={cn("font-medium", f.winner_team_id === f.away_team_id ? "text-white" : "text-slate-400")}>
                        {f.away_team_name ?? "TBD"}
                      </span>
                      {f.away_team_group && (
                        <span className="text-[10px] text-accent/70 font-bold">G{GROUP_LETTERS[f.away_team_group-1]}</span>
                      )}
                    </div>
                    {f.is_tiebreaker_needed && (
                      <p className="text-[10px] text-amber-400 mt-0.5">Tiebreaker required</p>
                    )}
                    {completed && f.tiebreaker_result && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Won via tiebreaker</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!completed && !f.is_tiebreaker_needed && f.home_team_id && f.away_team_id && (
                      <button onClick={() => { setEnteringResult(isEnteringResult ? null : f.id); setEnteringTb(null) }}
                        className="px-2 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs hover:bg-accent/20 transition-colors">
                        Enter Result
                      </button>
                    )}
                    {f.is_tiebreaker_needed && (
                      <button onClick={() => { setEnteringTb(isEnteringTb ? null : f.id); setEnteringResult(null) }}
                        className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors">
                        Tiebreaker
                      </button>
                    )}
                    {completed && (
                      <button
                        onClick={() => { if (confirm("Reset this result?")) resetFixture.mutate({ fixtureId: f.id, tournamentId: tournament.id }) }}
                        className="p-1 rounded hover:bg-pitch-800 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Reset result">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isEnteringResult && (
                  <ResultForm fixture={f} tournament={tournament} onClose={() => setEnteringResult(null)} />
                )}
                {isEnteringTb && (
                  <TiebreakerForm fixture={f} tournament={tournament} onClose={() => setEnteringTb(null)} />
                )}
              </div>
            )
          })}
        </div>
      ))}
      {fixtures.length === 0 && (
        <p className="text-sm text-slate-500">No fixtures here yet.</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures Panel (handles all formats)
// ─────────────────────────────────────────────────────────────────────────────
function FixturesPanel({ tournament }) {
  const { data: fixtures = [], isLoading }      = useDuoFixtures(tournament?.id)
  const { data: groupFixtures = [] }            = useDuoFixturesByStage(tournament?.id, "group")
  const { data: knockoutFixtures = [] }         = useDuoFixturesByStage(tournament?.id, "knockout")
  const generateFixtures = useGenerateDuoFixtures()
  const deleteFixtures   = useDeleteDuoFixtures()
  const resetFixture     = useResetDuoFixture()

  const [stageTab, setStageTab] = useState("group")
  const [err, setErr] = useState("")

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>

  const isGroupKnockout = tournament.format === "group_knockout"
  const hasFixtures = fixtures.length > 0

  if (isGroupKnockout) {
    return (
      <div className="space-y-4">
        <SectionTitle>Fixtures</SectionTitle>
        <Err msg={err} />

        {/* Stage tabs */}
        <div className="flex gap-1 p-1 bg-pitch-900 rounded-xl w-fit">
          {["group", "knockout"].map(s => (
            <button key={s} onClick={() => setStageTab(s)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize",
                stageTab === s ? "bg-pitch-800 text-white shadow" : "text-slate-500 hover:text-slate-300"
              )}>
              {s === "group" ? "Group Stage" : "Knockout"}
            </button>
          ))}
        </div>

        {stageTab === "group" && (
          <>
            {groupFixtures.length === 0 && (
              <p className="text-xs text-slate-500">Go to the Groups tab to generate group fixtures.</p>
            )}
            <FixtureList fixtures={groupFixtures} tournament={tournament} resetFixture={resetFixture} />
          </>
        )}

        {stageTab === "knockout" && (
          <>
            {knockoutFixtures.length === 0 && (
              <p className="text-xs text-slate-500">Go to the Groups tab → Step 3 to generate the knockout bracket after group stage is done.</p>
            )}
            <FixtureList fixtures={knockoutFixtures} tournament={tournament} resetFixture={resetFixture} />
          </>
        )}

        {hasFixtures && (
          <button
            onClick={() => { if (confirm("Delete ALL fixtures and reset group assignments?")) deleteFixtures.mutate(tournament.id) }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors mt-2">
            <Trash2 className="w-3.5 h-3.5" /> Reset Everything
          </button>
        )}
      </div>
    )
  }

  // Standard format (round_robin / knockout)
  return (
    <div className="space-y-4">
      <SectionTitle>Fixtures</SectionTitle>
      <Err msg={err} />

      <div className="flex gap-2 flex-wrap">
        {!hasFixtures && (
          <button
            onClick={() => generateFixtures.mutate(tournament.id, {
              onError: e => setErr(e.response?.data?.error ?? e.message),
            })}
            disabled={generateFixtures.isPending}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-accent text-pitch-950 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
            <ListOrdered className="w-4 h-4" />
            {generateFixtures.isPending ? "Generating…" : "Generate Fixtures"}
          </button>
        )}
        {hasFixtures && (
          <button
            onClick={() => { if (confirm("Delete all fixtures and reset to draft?")) deleteFixtures.mutate(tournament.id) }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Reset Fixtures
          </button>
        )}
      </div>

      <FixtureList fixtures={fixtures} tournament={tournament} resetFixture={resetFixture} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Standings Panel
// ─────────────────────────────────────────────────────────────────────────────
function StandingsPanel({ tournamentId }) {
  const { data: standings = [], isLoading } = useDuoStandings(tournamentId)
  const { data: scorers = [] } = useDuoTopScorers(tournamentId)

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Standings</SectionTitle>
        {standings.length === 0 ? (
          <p className="text-sm text-slate-500">No teams yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-surface-border">
                  <th className="pb-2 text-left font-medium w-6">#</th>
                  <th className="pb-2 text-left font-medium">Team</th>
                  <th className="pb-2 text-center font-medium">P</th>
                  <th className="pb-2 text-center font-medium">W</th>
                  <th className="pb-2 text-center font-medium">D</th>
                  <th className="pb-2 text-center font-medium">L</th>
                  <th className="pb-2 text-center font-medium">GF</th>
                  <th className="pb-2 text-center font-medium">GA</th>
                  <th className="pb-2 text-center font-medium">GD</th>
                  <th className="pb-2 text-center font-medium text-accent">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/40">
                {standings.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-pitch-800/30 transition-colors">
                    <td className="py-2.5 text-slate-500">{idx + 1}</td>
                    <td className="py-2.5">
                      <div>
                        <p className="text-white font-medium">{row.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {row.players?.map(p => p.player_name).join(" · ")}
                        </p>
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-slate-300">{row.played}</td>
                    <td className="py-2.5 text-center text-emerald-400">{row.won}</td>
                    <td className="py-2.5 text-center text-slate-300">{row.drawn}</td>
                    <td className="py-2.5 text-center text-red-400">{row.lost}</td>
                    <td className="py-2.5 text-center text-slate-300">{row.gf}</td>
                    <td className="py-2.5 text-center text-slate-300">{row.ga}</td>
                    <td className={cn("py-2.5 text-center", row.gd >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </td>
                    <td className="py-2.5 text-center text-accent font-bold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scorers.length > 0 && (
        <div>
          <SectionTitle>Individual Wins Leaderboard</SectionTitle>
          <div className="space-y-1.5">
            {scorers.slice(0, 10).map((s, i) => (
              <div key={s.player_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pitch-800 transition-colors">
                <span className="text-xs text-slate-500 w-5 text-right">{i + 1}</span>
                <span className="flex-1 text-sm text-white">{s.player_name}</span>
                <span className="text-xs text-emerald-400 font-semibold">{s.wins}W</span>
                <span className="text-xs text-slate-500">{s.played}P</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament Detail (inner tabs)
// ─────────────────────────────────────────────────────────────────────────────
function TournamentDetail({ tournamentId, onBack }) {
  const { data: tournament, isLoading, isError, error } = useDuoTournament(tournamentId)
  const completeTournament = useCompleteDuoTournament()
  const [tab, setTab] = useState("Teams")

  if (isLoading) return <p className="text-sm text-slate-500 p-4">Loading…</p>
  if (isError || !tournament) return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Back</button>
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
        <p className="font-semibold mb-1">Could not load tournament</p>
        <p className="text-xs opacity-80">{error?.response?.data?.error ?? error?.message ?? "Unknown error"}</p>
        <p className="text-xs mt-2 text-slate-400">
          Make sure you have run <strong className="text-white">both</strong> SQL migrations in Supabase:
          <br />1. <code className="text-accent">duo_migration.sql</code>
          <br />2. <code className="text-accent">duo_group_knockout_migration.sql</code>
        </p>
      </div>
    </div>
  )

  const isGroupKnockout = tournament.format === "group_knockout"
  const INNER_TABS = isGroupKnockout
    ? ["Teams", "Groups", "Fixtures", "Standings"]
    : ["Teams", "Fixtures", "Standings"]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-0.5 text-slate-500 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-white">{tournament.name}</h2>
            <Badge status={tournament.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Season {tournament.season_number} · {FORMAT_LABELS[tournament.format]} · {tournament.team_size}v{tournament.team_size}
          </p>
        </div>
        {tournament.status === "active" && (
          <button onClick={() => { if (confirm("Mark tournament as completed?")) completeTournament.mutate(tournament.id) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent/30 text-accent text-xs hover:bg-accent/10 transition-colors shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Complete
          </button>
        )}
      </div>

      {/* Inner tabs */}
      <div className="flex gap-1 p-1 bg-pitch-900 rounded-xl">
        {INNER_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "bg-pitch-800 text-white shadow" : "text-slate-500 hover:text-slate-300"
            )}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Teams"     && <TeamManager tournament={tournament} />}
      {tab === "Groups"    && isGroupKnockout && <GroupDrawPanel tournament={tournament} />}
      {tab === "Fixtures"  && <FixturesPanel tournament={tournament} />}
      {tab === "Standings" && <StandingsPanel tournamentId={tournament.id} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — DuoAdmin
// ─────────────────────────────────────────────────────────────────────────────
export default function DuoAdmin() {
  const [selectedId, setSelectedId] = useState(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-accent" />
        <h2 className="text-base font-semibold text-white">Duo Tournaments</h2>
      </div>

      {selectedId ? (
        <TournamentDetail tournamentId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <TournamentList onSelect={setSelectedId} />
      )}
    </div>
  )
}