/**
 * WCTAdmin.jsx — World Cup Tournament admin panel
 * Fully manual — admin controls everything, system decides nothing.
 */
import { useState, useMemo } from "react"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import {
  Trophy, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp,
  Users, Shuffle, RefreshCw, Star, Shield, ArrowRight, Award, Target,
  Settings, List, BarChart2, Swords
} from "lucide-react"
import { wctApi } from "../../lib/api"
import { cn } from "../../lib/utils"

const GROUPS = ["A","B","C","D","E","F","G","H"]
const ROUNDS = ["R32","R16","QF","SF","FINAL"]
const ROUND_LABELS = { R32:"Round of 32", R16:"Round of 16", QF:"Quarter-Final", SF:"Semi-Final", FINAL:"Final" }

// ─── Query keys ──────────────────────────────────────────────────────────────
const QK = {
  tournaments: ["wct","tournaments"],
  teams: (id) => ["wct","teams",id],
  fixtures: (id) => ["wct","groupFixtures",id],
  standings: (id) => ["wct","standings",id],
  qualified: (id) => ["wct","qualified",id],
  knockout: (id) => ["wct","knockout",id],
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useWCTournaments() {
  return useQuery({ queryKey: QK.tournaments, queryFn: wctApi.list })
}
function useWCTeams(id) {
  return useQuery({ queryKey: QK.teams(id), queryFn: () => wctApi.teams(id), enabled: !!id })
}
function useWCFixtures(id) {
  return useQuery({ queryKey: QK.fixtures(id), queryFn: () => wctApi.groupFixtures(id), enabled: !!id })
}
function useWCStandings(id) {
  return useQuery({ queryKey: QK.standings(id), queryFn: () => wctApi.standings(id), enabled: !!id })
}
function useWCQualified(id) {
  return useQuery({ queryKey: QK.qualified(id), queryFn: () => wctApi.qualified(id), enabled: !!id })
}
function useWCKnockout(id) {
  return useQuery({ queryKey: QK.knockout(id), queryFn: () => wctApi.knockout(id), enabled: !!id })
}

// ─── Small shared components ─────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant="primary", size="md", className="" }) {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  const sizes = { sm:"px-2 py-1 text-xs", md:"px-3 py-1.5 text-sm", lg:"px-4 py-2 text-sm" }
  const variants = {
    primary:  "bg-accent text-white hover:bg-accent/80",
    danger:   "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20",
    ghost:    "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10",
    sky:      "bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20",
    emerald:  "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
    amber:    "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-slate-400 mb-1">{label}</span>}
      <input {...props}
        className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent/50" />
    </label>
  )
}

function Select({ label, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-slate-400 mb-1">{label}</span>}
      <select {...props}
        className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
        {children}
      </select>
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT LIST / CREATE
// ═══════════════════════════════════════════════════════════════════════════════
function TournamentPicker({ onSelect }) {
  const qc = useQueryClient()
  const { data: tours = [], isLoading } = useWCTournaments()
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)

  const createMut = useMutation({
    mutationFn: (n) => wctApi.create(n),
    onSuccess: () => { qc.invalidateQueries(QK.tournaments); setName(""); setCreating(false) }
  })
  const deleteMut = useMutation({
    mutationFn: (id) => wctApi.remove(id),
    onSuccess: () => qc.invalidateQueries(QK.tournaments)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> World Cup Tournaments
        </h2>
        <Btn onClick={() => setCreating(v => !v)} variant="primary">
          <Plus className="w-3.5 h-3.5" /> New Tournament
        </Btn>
      </div>

      {creating && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Create Tournament</h3>
          <Input label="Tournament Name" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. WC 2026 Edition" />
          <div className="flex gap-2">
            <Btn onClick={() => createMut.mutate(name)} disabled={!name.trim() || createMut.isPending} variant="primary">
              {createMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Create
            </Btn>
            <Btn onClick={() => setCreating(false)} variant="ghost"><X className="w-3 h-3" /> Cancel</Btn>
          </div>
        </div>
      )}

      {isLoading && <p className="text-slate-500 text-sm">Loading…</p>}
      <div className="space-y-2">
        {tours.map(t => (
          <div key={t.id} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">{t.name}</p>
              <p className="text-xs text-slate-500 capitalize">Status: {t.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => onSelect(t)} variant="sky" size="sm">
                <Settings className="w-3 h-3" /> Manage
              </Btn>
              <Btn onClick={() => { if(confirm(`Delete "${t.name}"?`)) deleteMut.mutate(t.id) }}
                variant="danger" size="sm">
                <Trash2 className="w-3 h-3" />
              </Btn>
            </div>
          </div>
        ))}
        {!isLoading && tours.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No tournaments yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM SETUP TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TeamSetup({ tournament }) {
  const qc = useQueryClient()
  const { data: teams = [] } = useWCTeams(tournament.id)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [expandedTeam, setExpandedTeam] = useState(null)

  // Add team form
  const [teamName, setTeamName] = useState("")
  const [teamGroup, setTeamGroup] = useState("")
  const [players, setPlayers] = useState(
    Array.from({length:7},(_,i)=>({name:"",is_starting:i<5}))
  )

  const addTeamMut = useMutation({
    mutationFn: (body) => wctApi.addTeam(tournament.id, body),
    onSuccess: () => {
      qc.invalidateQueries(QK.teams(tournament.id))
      setShowAddTeam(false); setTeamName(""); setTeamGroup("")
      setPlayers(Array.from({length:7},(_,i)=>({name:"",is_starting:i<5})))
    }
  })
  const editTeamMut = useMutation({
    mutationFn: ({tid, body}) => wctApi.editTeam(tournament.id, tid, body),
    onSuccess: () => { qc.invalidateQueries(QK.teams(tournament.id)); setEditingTeam(null) }
  })
  const deleteTeamMut = useMutation({
    mutationFn: (tid) => wctApi.deleteTeam(tournament.id, tid),
    onSuccess: () => qc.invalidateQueries(QK.teams(tournament.id))
  })
  const addPlayerMut = useMutation({
    mutationFn: ({tid, body}) => wctApi.addPlayer(tournament.id, tid, body),
    onSuccess: () => qc.invalidateQueries(QK.teams(tournament.id))
  })
  const deletePlayerMut = useMutation({
    mutationFn: (pid) => wctApi.deletePlayer(pid),
    onSuccess: () => qc.invalidateQueries(QK.teams(tournament.id))
  })
  const editPlayerMut = useMutation({
    mutationFn: ({pid, body}) => wctApi.editPlayer(pid, body),
    onSuccess: () => qc.invalidateQueries(QK.teams(tournament.id))
  })

  function handleAddTeam() {
    const validPlayers = players.filter(p => p.name.trim())
    addTeamMut.mutate({
      name: teamName.trim(),
      group_letter: teamGroup || null,
      players: validPlayers
    })
  }

  // Group summary
  const groupCount = GROUPS.map(g => ({
    g, count: teams.filter(t => t.group_letter === g).length
  }))

  return (
    <div className="space-y-5">
      {/* Group summary */}
      <div className="grid grid-cols-4 gap-2">
        {groupCount.map(({g, count}) => (
          <div key={g} className={cn(
            "card p-3 text-center border",
            count === 8 ? "border-emerald-500/40 bg-emerald-500/5" :
            count > 0   ? "border-amber-500/30 bg-amber-500/5" : "border-surface-border"
          )}>
            <p className="text-xs text-slate-400">Group {g}</p>
            <p className={cn("text-lg font-bold", count === 8 ? "text-emerald-400" : count > 0 ? "text-amber-400" : "text-slate-500")}>
              {count}<span className="text-xs font-normal text-slate-500">/8</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{teams.length} teams total</p>
        <Btn onClick={() => setShowAddTeam(v=>!v)} variant="primary">
          <Plus className="w-3.5 h-3.5" /> Add Team
        </Btn>
      </div>

      {/* Add Team Form */}
      {showAddTeam && (
        <div className="card p-5 space-y-4 border-accent/20">
          <h3 className="text-sm font-semibold text-white">New Team</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Team Name *" value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="FC Barcelona" />
            <Select label="Group" value={teamGroup} onChange={e=>setTeamGroup(e.target.value)}>
              <option value="">— Unassigned —</option>
              {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
            </Select>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Players (7 total · first 5 = starting)</p>
            <div className="space-y-1.5">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0",
                    i < 5 ? "bg-accent/20 text-accent" : "bg-white/5 text-slate-500"
                  )}>{i+1}</span>
                  <input value={p.name} onChange={e => {
                    const next = [...players]; next[i] = {...p, name: e.target.value}; setPlayers(next)
                  }}
                  placeholder={i < 5 ? `Starting player ${i+1}` : `Sub ${i-4}`}
                  className="flex-1 bg-surface-raised border border-surface-border rounded px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50" />
                  <span className="text-xs text-slate-600 w-14 text-right">{i<5?"Starting":"Sub"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Btn onClick={handleAddTeam} disabled={!teamName.trim() || addTeamMut.isPending} variant="primary">
              {addTeamMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Team
            </Btn>
            <Btn onClick={() => setShowAddTeam(false)} variant="ghost"><X className="w-3 h-3" /> Cancel</Btn>
          </div>
        </div>
      )}

      {/* Teams list grouped */}
      {GROUPS.map(g => {
        const groupTeams = teams.filter(t => t.group_letter === g)
        if (!groupTeams.length) return null
        return (
          <div key={g}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Group {g}</h3>
            <div className="space-y-2">
              {groupTeams.map(team => (
                <TeamCard key={team.id} team={team} tournament={tournament}
                  expanded={expandedTeam===team.id}
                  onExpand={() => setExpandedTeam(expandedTeam===team.id ? null : team.id)}
                  editing={editingTeam===team.id}
                  onEdit={() => setEditingTeam(editingTeam===team.id ? null : team.id)}
                  onSaveEdit={(body) => editTeamMut.mutate({tid:team.id,body})}
                  onDelete={() => { if(confirm(`Delete "${team.name}"?`)) deleteTeamMut.mutate(team.id) }}
                  onAddPlayer={(body) => addPlayerMut.mutate({tid:team.id,body})}
                  onDeletePlayer={(pid) => deletePlayerMut.mutate(pid)}
                  onEditPlayer={(pid,body) => editPlayerMut.mutate({pid,body})}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Unassigned */}
      {teams.filter(t=>!t.group_letter).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Unassigned</h3>
          <div className="space-y-2">
            {teams.filter(t=>!t.group_letter).map(team => (
              <TeamCard key={team.id} team={team} tournament={tournament}
                expanded={expandedTeam===team.id}
                onExpand={() => setExpandedTeam(expandedTeam===team.id ? null : team.id)}
                editing={editingTeam===team.id}
                onEdit={() => setEditingTeam(editingTeam===team.id ? null : team.id)}
                onSaveEdit={(body) => editTeamMut.mutate({tid:team.id,body})}
                onDelete={() => { if(confirm(`Delete "${team.name}"?`)) deleteTeamMut.mutate(team.id) }}
                onAddPlayer={(body) => addPlayerMut.mutate({tid:team.id,body})}
                onDeletePlayer={(pid) => deletePlayerMut.mutate(pid)}
                onEditPlayer={(pid,body) => editPlayerMut.mutate({pid,body})}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, tournament, expanded, onExpand, editing, onEdit, onSaveEdit, onDelete, onAddPlayer, onDeletePlayer, onEditPlayer }) {
  const [editName, setEditName] = useState(team.name)
  const [editGroup, setEditGroup] = useState(team.group_letter || "")
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerStarting, setNewPlayerStarting] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [epName, setEpName] = useState("")

  return (
    <div className="card border border-surface-border overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <input value={editName} onChange={e=>setEditName(e.target.value)}
                className="flex-1 bg-surface-raised border border-surface-border rounded px-2 py-1 text-sm text-white focus:outline-none" />
              <select value={editGroup} onChange={e=>setEditGroup(e.target.value)}
                className="bg-surface-raised border border-surface-border rounded px-2 py-1 text-sm text-white focus:outline-none">
                <option value="">No Group</option>
                {GROUPS.map(g=><option key={g} value={g}>Group {g}</option>)}
              </select>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-white truncate">{team.name}</p>
              <p className="text-xs text-slate-500">{team.players?.length ?? 0} players</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {editing ? (
            <>
              <Btn size="sm" variant="emerald" onClick={() => onSaveEdit({name:editName,group_letter:editGroup||null})}>
                <Check className="w-3 h-3" />
              </Btn>
              <Btn size="sm" variant="ghost" onClick={onEdit}><X className="w-3 h-3" /></Btn>
            </>
          ) : (
            <>
              <Btn size="sm" variant="ghost" onClick={onEdit}><Pencil className="w-3 h-3" /></Btn>
              <Btn size="sm" variant="ghost" onClick={onExpand}>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Btn>
              <Btn size="sm" variant="danger" onClick={onDelete}><Trash2 className="w-3 h-3" /></Btn>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-border p-3 space-y-2 bg-white/2">
          {(team.players||[]).map(p => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0",
                p.is_starting ? "bg-accent" : "bg-slate-600")} />
              {editingPlayer===p.id ? (
                <>
                  <input value={epName} onChange={e=>setEpName(e.target.value)}
                    className="flex-1 bg-surface-raised border border-surface-border rounded px-2 py-0.5 text-xs text-white focus:outline-none" />
                  <Btn size="sm" variant="emerald" onClick={()=>{onEditPlayer(p.id,{name:epName});setEditingPlayer(null)}}>
                    <Check className="w-3 h-3"/>
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>setEditingPlayer(null)}><X className="w-3 h-3"/></Btn>
                </>
              ) : (
                <>
                  <span className="flex-1 text-slate-300">{p.name}</span>
                  <span className="text-xs text-slate-600">{p.is_starting?"Starting":"Sub"}</span>
                  <Btn size="sm" variant="ghost" onClick={()=>{setEditingPlayer(p.id);setEpName(p.name)}}>
                    <Pencil className="w-3 h-3"/>
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={()=>onDeletePlayer(p.id)}>
                    <Trash2 className="w-3 h-3"/>
                  </Btn>
                </>
              )}
            </div>
          ))}

          {(team.players?.length||0) < 7 && (
            <div className="flex gap-2 mt-2">
              <input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)}
                placeholder="Player name" onKeyDown={e=>e.key==='Enter'&&newPlayerName.trim()&&(onAddPlayer({name:newPlayerName,is_starting:newPlayerStarting}),setNewPlayerName(""))}
                className="flex-1 bg-surface-raised border border-surface-border rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none" />
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input type="checkbox" checked={newPlayerStarting} onChange={e=>setNewPlayerStarting(e.target.checked)} className="accent-sky-500" />
                Starting
              </label>
              <Btn size="sm" variant="sky" disabled={!newPlayerName.trim()}
                onClick={()=>{onAddPlayer({name:newPlayerName,is_starting:newPlayerStarting});setNewPlayerName("")}}>
                <Plus className="w-3 h-3"/>
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP STAGE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function GroupStage({ tournament }) {
  const qc = useQueryClient()
  const { data: fixtures = [] } = useWCFixtures(tournament.id)
  const { data: teams = [] } = useWCTeams(tournament.id)
  const { data: standings = {} } = useWCStandings(tournament.id)
  const [activeGroup, setActiveGroup] = useState("A")
  const [view, setView] = useState("fixtures") // fixtures | table
  const [enteringId, setEnteringId] = useState(null)

  const generateMut = useMutation({
    mutationFn: () => wctApi.generateFixtures(tournament.id),
    onSuccess: () => {
      qc.invalidateQueries(QK.fixtures(tournament.id))
      qc.invalidateQueries(QK.standings(tournament.id))
    }
  })
  const saveResultMut = useMutation({
    mutationFn: ({fid, body}) => wctApi.saveGroupResult(tournament.id, fid, body),
    onSuccess: () => {
      qc.invalidateQueries(QK.fixtures(tournament.id))
      qc.invalidateQueries(QK.standings(tournament.id))
      setEnteringId(null)
    }
  })
  const clearResultMut = useMutation({
    mutationFn: (fid) => wctApi.clearGroupResult(tournament.id, fid),
    onSuccess: () => {
      qc.invalidateQueries(QK.fixtures(tournament.id))
      qc.invalidateQueries(QK.standings(tournament.id))
    }
  })

  const groupFixtures = fixtures.filter(f => f.group_letter === activeGroup)
  const groupTeams = teams.filter(t => t.group_letter === activeGroup)
  const groupStandings = standings[activeGroup] || []

  return (
    <div className="space-y-4">
      {fixtures.length === 0 && (
        <div className="card p-6 text-center space-y-3">
          <Shuffle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-white font-semibold">No fixtures generated yet</p>
          <p className="text-sm text-slate-400">Make sure all teams are assigned to groups first.</p>
          <Btn onClick={() => generateMut.mutate()} disabled={generateMut.isPending} variant="primary">
            {generateMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
            Generate Group Fixtures
          </Btn>
        </div>
      )}

      {fixtures.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {GROUPS.map(g => {
                const total = fixtures.filter(f=>f.group_letter===g).length
                const done = fixtures.filter(f=>f.group_letter===g && f.status==='completed').length
                return (
                  <button key={g} onClick={() => setActiveGroup(g)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                      activeGroup===g ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
                    )}>
                    {g}
                    {total > 0 && <span className="ml-1 text-xs opacity-70">{done}/{total}</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1">
              <Btn size="sm" variant={view==='fixtures'?"sky":"ghost"} onClick={()=>setView('fixtures')}>
                <List className="w-3 h-3"/> Fixtures
              </Btn>
              <Btn size="sm" variant={view==='table'?"sky":"ghost"} onClick={()=>setView('table')}>
                <BarChart2 className="w-3 h-3"/> Table
              </Btn>
              <Btn size="sm" variant="amber" onClick={() => {
                if(confirm("Regenerate all fixtures? Existing results will be lost.")) generateMut.mutate()
              }} disabled={generateMut.isPending}>
                <RefreshCw className={cn("w-3 h-3", generateMut.isPending && "animate-spin")} />
              </Btn>
            </div>
          </div>

          {view === 'table' && (
            <StandingsTable rows={groupStandings} group={activeGroup} />
          )}

          {view === 'fixtures' && (
            <div className="space-y-2">
              {groupFixtures.map(f => (
                <FixtureCard key={f.id} fixture={f}
                  teams={groupTeams}
                  entering={enteringId===f.id}
                  onEnter={() => setEnteringId(f.id)}
                  onCancel={() => setEnteringId(null)}
                  onSave={(body) => saveResultMut.mutate({fid:f.id,body})}
                  onClear={() => clearResultMut.mutate(f.id)}
                  saving={saveResultMut.isPending && saveResultMut.variables?.fid===f.id}
                />
              ))}
              {groupFixtures.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No fixtures for Group {activeGroup}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StandingsTable({ rows, group }) {
  if (!rows.length) return <p className="text-slate-500 text-sm text-center py-4">No data for Group {group}</p>
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left p-3 text-xs font-semibold text-slate-400">#</th>
              <th className="text-left p-3 text-xs font-semibold text-slate-400">Team</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">P</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">W</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">D</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">L</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">GF</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">GA</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400">GD</th>
              <th className="text-center p-3 text-xs font-semibold text-slate-400 text-accent">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r.id} className={cn("border-b border-surface-border/50", i===0&&"bg-emerald-500/5")}>
                <td className="p-3 text-slate-500">{i+1}</td>
                <td className="p-3 font-semibold text-white">{r.name}</td>
                <td className="p-3 text-center text-slate-300">{r.played}</td>
                <td className="p-3 text-center text-emerald-400">{r.won}</td>
                <td className="p-3 text-center text-slate-400">{r.drawn}</td>
                <td className="p-3 text-center text-rose-400">{r.lost}</td>
                <td className="p-3 text-center text-slate-300">{r.gf}</td>
                <td className="p-3 text-center text-slate-300">{r.ga}</td>
                <td className="p-3 text-center text-slate-300">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="p-3 text-center font-bold text-accent">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FixtureCard({ fixture: f, teams, entering, onEnter, onCancel, onSave, onClear, saving }) {
  const [homeGoals, setHomeGoals] = useState(f.home_goals ?? 0)
  const [awayGoals, setAwayGoals] = useState(f.away_goals ?? 0)
  const [playerStats, setPlayerStats] = useState([])

  const homeTeam = teams.find(t => t.id === f.home_team_id)
  const awayTeam = teams.find(t => t.id === f.away_team_id)

  // Pre-fill on open
  function handleEnter() {
    setHomeGoals(f.home_goals ?? 0)
    setAwayGoals(f.away_goals ?? 0)
    setPlayerStats([])
    onEnter()
  }

  const allPlayers = [...(homeTeam?.players||[]).map(p=>({...p,teamId:homeTeam.id})),
                      ...(awayTeam?.players||[]).map(p=>({...p,teamId:awayTeam.id}))]

  function setPlayerGoals(pid, tid, goals) {
    setPlayerStats(prev => {
      const next = prev.filter(s => s.player_id !== pid)
      if (goals > 0) next.push({player_id:pid, team_id:tid, goals})
      return next
    })
  }
  function getPlayerGoals(pid) {
    return playerStats.find(s=>s.player_id===pid)?.goals ?? 0
  }

  const completed = f.status === 'completed'
  const homeWin = f.home_goals > f.away_goals
  const awayWin = f.away_goals > f.home_goals

  return (
    <div className="card border border-surface-border">
      <div className="flex items-center gap-3 p-3">
        <span className="text-xs text-slate-500 w-14 text-center flex-shrink-0">Rd {f.round_number}</span>
        <div className={cn("flex-1 text-right font-semibold text-sm", homeWin&&completed?"text-emerald-400":"text-white")}>
          {f.home_team_name}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {completed ? (
            <span className="text-lg font-bold text-white px-2">
              {f.home_goals} – {f.away_goals}
            </span>
          ) : (
            <span className="text-slate-500 text-sm px-2">vs</span>
          )}
        </div>
        <div className={cn("flex-1 font-semibold text-sm", awayWin&&completed?"text-emerald-400":"text-white")}>
          {f.away_team_name}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {completed ? (
            <>
              <Btn size="sm" variant="sky" onClick={handleEnter}><Pencil className="w-3 h-3"/>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => {if(confirm("Clear result?"))onClear()}}>
                <X className="w-3 h-3"/>
              </Btn>
            </>
          ) : (
            <Btn size="sm" variant="emerald" onClick={handleEnter}>
              <Plus className="w-3 h-3"/>Result
            </Btn>
          )}
        </div>
      </div>

      {entering && (
        <div className="border-t border-surface-border p-4 space-y-4 bg-white/2">
          {/* Score input */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-xs text-slate-400 mb-1">{f.home_team_name}</p>
              <input type="number" min="0" value={homeGoals} onChange={e=>setHomeGoals(+e.target.value)}
                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-center text-xl font-bold text-white focus:outline-none focus:border-accent/50" />
            </div>
            <span className="text-slate-500 font-bold text-xl">–</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">{f.away_team_name}</p>
              <input type="number" min="0" value={awayGoals} onChange={e=>setAwayGoals(+e.target.value)}
                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-center text-xl font-bold text-white focus:outline-none focus:border-accent/50" />
            </div>
          </div>

          {/* Player goals */}
          {allPlayers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Player Goals</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[homeTeam,awayTeam].map(team => team && (
                  <div key={team.id}>
                    <p className="text-xs text-slate-500 mb-1">{team.name}</p>
                    {(team.players||[]).map(p => (
                      <div key={p.id} className="flex items-center gap-2 mb-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",p.is_starting?"bg-accent":"bg-slate-600")} />
                        <span className="text-xs text-slate-300 flex-1 truncate">{p.name}</span>
                        <input type="number" min="0" max="20" value={getPlayerGoals(p.id)}
                          onChange={e=>setPlayerGoals(p.id,team.id,+e.target.value)}
                          className="w-10 bg-surface-raised border border-surface-border rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Btn variant="emerald" disabled={saving}
              onClick={() => onSave({home_goals:homeGoals,away_goals:awayGoals,player_stats:playerStats})}>
              {saving ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
              Save Result
            </Btn>
            <Btn variant="ghost" onClick={onCancel}><X className="w-3 h-3"/>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALIFICATION TAB
// ═══════════════════════════════════════════════════════════════════════════════
function Qualification({ tournament }) {
  const qc = useQueryClient()
  const { data: teams = [] } = useWCTeams(tournament.id)
  const { data: standings = {} } = useWCStandings(tournament.id)
  const { data: qualified = [] } = useWCQualified(tournament.id)
  const [activeGroup, setActiveGroup] = useState("A")

  const qualifyMut = useMutation({
    mutationFn: (body) => wctApi.qualify(tournament.id, body),
    onSuccess: () => qc.invalidateQueries(QK.qualified(tournament.id))
  })
  const unqualifyMut = useMutation({
    mutationFn: (tid) => wctApi.unqualify(tournament.id, tid),
    onSuccess: () => qc.invalidateQueries(QK.qualified(tournament.id))
  })

  const qualifiedIds = new Set(qualified.map(q => q.team_id))
  const groupStandings = standings[activeGroup] || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Manual Qualification Selection</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-bold px-3 py-1 rounded-full",
            qualified.length === 32 ? "bg-emerald-500/20 text-emerald-400" :
            qualified.length > 32  ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
          )}>
            {qualified.length}/32 qualified
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        ⚠️ System will NOT auto-select. Click teams manually to qualify them for knockout stage.
        You need 32 teams total for R32.
      </p>

      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap">
        {GROUPS.map(g => {
          const qCount = qualified.filter(q=>q.group_letter===g).length
          return (
            <button key={g} onClick={()=>setActiveGroup(g)}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors relative",
                activeGroup===g ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
              )}>
              Group {g}
              {qCount > 0 && <span className="ml-1 text-xs text-emerald-400">✓{qCount}</span>}
            </button>
          )
        })}
      </div>

      {/* Standings for active group with qualify toggles */}
      <div className="card overflow-hidden">
        <div className="p-3 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-white">Group {activeGroup} — Click to qualify/unqualify</h4>
        </div>
        {groupStandings.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No standings data. Generate fixtures and enter results first.</p>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {groupStandings.map((r, i) => {
              const isQ = qualifiedIds.has(r.id)
              return (
                <div key={r.id} className={cn(
                  "flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-white/5",
                  isQ && "bg-emerald-500/5 border-l-2 border-emerald-500"
                )} onClick={() => isQ ? unqualifyMut.mutate(r.id) : qualifyMut.mutate({team_id:r.id})}>
                  <span className="text-slate-500 text-sm w-5 text-center">{i+1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.played}P · {r.won}W {r.drawn}D {r.lost}L · GD {r.gd>0?`+${r.gd}`:r.gd}
                    </p>
                  </div>
                  <span className="font-bold text-accent text-sm">{r.points}pts</span>
                  {isQ ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3"/>Qualified
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
        )}
      </div>

      {/* All qualified teams list */}
      {qualified.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            All Qualified ({qualified.length})
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {qualified.map(q => (
              <div key={q.team_id} className="flex items-center justify-between gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-white">{q.team_name}</p>
                  <p className="text-xs text-slate-500">Group {q.team_group}</p>
                </div>
                <Btn size="sm" variant="danger" onClick={()=>unqualifyMut.mutate(q.team_id)}>
                  <X className="w-3 h-3"/>
                </Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOCKOUT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function KnockoutStage({ tournament }) {
  const qc = useQueryClient()
  const { data: koFixtures = [] } = useWCKnockout(tournament.id)
  const { data: qualified = [] } = useWCQualified(tournament.id)
  const { data: teams = [] } = useWCTeams(tournament.id)
  const [activeRound, setActiveRound] = useState("R32")
  const [enteringId, setEnteringId] = useState(null)

  const existingRounds = [...new Set(koFixtures.map(f=>f.round))]

  const generateRoundMut = useMutation({
    mutationFn: (body) => wctApi.generateKnockout(tournament.id, body),
    onSuccess: () => qc.invalidateQueries(QK.knockout(tournament.id))
  })
  const updateFixtureMut = useMutation({
    mutationFn: ({fid, body}) => wctApi.updateKOFixture(tournament.id, fid, body),
    onSuccess: () => { qc.invalidateQueries(QK.knockout(tournament.id)); setEnteringId(null) }
  })
  const clearResultMut = useMutation({
    mutationFn: (fid) => wctApi.clearKOResult(tournament.id, fid),
    onSuccess: () => qc.invalidateQueries(QK.knockout(tournament.id))
  })
  const deleteRoundMut = useMutation({
    mutationFn: (round) => wctApi.deleteKORound(tournament.id, round),
    onSuccess: () => qc.invalidateQueries(QK.knockout(tournament.id))
  })

  const roundFixtures = koFixtures.filter(f => f.round === activeRound)
  const allTeamsForKO = teams // admin can pick any team for knockout slots

  const ROUND_SIZES = { R32:16, R16:8, QF:4, SF:2, FINAL:1 }

  return (
    <div className="space-y-4">
      {/* Round selector + create */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {ROUNDS.map(r => {
            const count = koFixtures.filter(f=>f.round===r).length
            const done = koFixtures.filter(f=>f.round===r&&f.status==='completed').length
            return (
              <button key={r} onClick={()=>setActiveRound(r)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                  activeRound===r ? "bg-accent text-white" :
                  count>0 ? "bg-white/5 text-slate-300 hover:text-white" :
                  "bg-white/5 text-slate-600 hover:text-slate-400"
                )}>
                {ROUND_LABELS[r]}
                {count>0&&<span className="ml-1 text-xs opacity-60">{done}/{count}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          {!existingRounds.includes(activeRound) && (
            <Btn variant="primary" size="sm"
              onClick={() => generateRoundMut.mutate({round:activeRound, match_count:ROUND_SIZES[activeRound]})}
              disabled={generateRoundMut.isPending}>
              {generateRoundMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>}
              Create {activeRound} Fixtures
            </Btn>
          )}
          {existingRounds.includes(activeRound) && (
            <Btn variant="danger" size="sm"
              onClick={()=>{if(confirm(`Delete all ${activeRound} fixtures?`))deleteRoundMut.mutate(activeRound)}}>
              <Trash2 className="w-3 h-3"/> Delete Round
            </Btn>
          )}
        </div>
      </div>

      {roundFixtures.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          <Swords className="w-8 h-8 mx-auto mb-2 opacity-30"/>
          <p>No {ROUND_LABELS[activeRound]} fixtures yet.</p>
          <p className="text-xs mt-1">Click "Create {activeRound} Fixtures" to add them.</p>
        </div>
      )}

      <div className="space-y-2">
        {roundFixtures.map(f => (
          <KOFixtureCard key={f.id} fixture={f} teams={allTeamsForKO}
            entering={enteringId===f.id}
            onEnter={() => setEnteringId(f.id)}
            onCancel={() => setEnteringId(null)}
            onSave={(body) => updateFixtureMut.mutate({fid:f.id,body})}
            onClear={() => {if(confirm("Clear result?"))clearResultMut.mutate(f.id)}}
            saving={updateFixtureMut.isPending && updateFixtureMut.variables?.fid===f.id}
          />
        ))}
      </div>
    </div>
  )
}

function KOFixtureCard({ fixture: f, teams, entering, onEnter, onCancel, onSave, onClear, saving }) {
  const [homeTeamId, setHomeTeamId] = useState(f.home_team_id ?? "")
  const [awayTeamId, setAwayTeamId] = useState(f.away_team_id ?? "")
  const [homeGoals, setHomeGoals] = useState(f.home_goals ?? 0)
  const [awayGoals, setAwayGoals] = useState(f.away_goals ?? 0)
  const [winnerId, setWinnerId] = useState(f.winner_id ?? "")

  function handleOpen() {
    setHomeTeamId(f.home_team_id ?? "")
    setAwayTeamId(f.away_team_id ?? "")
    setHomeGoals(f.home_goals ?? 0)
    setAwayGoals(f.away_goals ?? 0)
    setWinnerId(f.winner_id ?? "")
    onEnter()
  }

  const homeTeam = teams.find(t=>t.id===f.home_team_id)
  const awayTeam = teams.find(t=>t.id===f.away_team_id)
  const completed = f.status==='completed'

  return (
    <div className="card border border-surface-border">
      <div className="flex items-center gap-3 p-3">
        <span className="text-xs text-slate-500 w-10 text-center flex-shrink-0">M{f.match_number}</span>
        <div className={cn("flex-1 text-right text-sm font-semibold",
          f.winner_id===f.home_team_id&&completed?"text-amber-400":"text-white")}>
          {f.home_team_name || <span className="text-slate-600 italic">TBD</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {completed ? (
            <span className="text-base font-bold text-white px-2">{f.home_goals} – {f.away_goals}</span>
          ) : (
            <span className="text-slate-600 text-sm px-2">vs</span>
          )}
        </div>
        <div className={cn("flex-1 text-sm font-semibold",
          f.winner_id===f.away_team_id&&completed?"text-amber-400":"text-white")}>
          {f.away_team_name || <span className="text-slate-600 italic">TBD</span>}
        </div>
        {f.winner_name && (
          <span className="text-xs text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 flex-shrink-0">
            🏆 {f.winner_name}
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Btn size="sm" variant="sky" onClick={handleOpen}>
            <Pencil className="w-3 h-3"/>{completed?"Edit":"Setup"}
          </Btn>
          {completed && (
            <Btn size="sm" variant="danger" onClick={onClear}><X className="w-3 h-3"/></Btn>
          )}
        </div>
      </div>

      {entering && (
        <div className="border-t border-surface-border p-4 space-y-4 bg-white/2">
          {/* Team selection */}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Home Team"
              value={homeTeamId}
              onChange={e=>setHomeTeamId(e.target.value?+e.target.value:"")}>
              <option value="">— Select Team —</option>
              {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select label="Away Team"
              value={awayTeamId}
              onChange={e=>setAwayTeamId(e.target.value?+e.target.value:"")}>
              <option value="">— Select Team —</option>
              {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-xs text-slate-400 mb-1">Home Goals</p>
              <input type="number" min="0" value={homeGoals} onChange={e=>setHomeGoals(+e.target.value)}
                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-center text-xl font-bold text-white focus:outline-none" />
            </div>
            <span className="text-slate-500 text-xl font-bold">–</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Away Goals</p>
              <input type="number" min="0" value={awayGoals} onChange={e=>setAwayGoals(+e.target.value)}
                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-center text-xl font-bold text-white focus:outline-none" />
            </div>
          </div>

          {/* Manual winner override */}
          <Select label="Winner (override — use for penalties/extra time)" value={winnerId}
            onChange={e=>setWinnerId(e.target.value?+e.target.value:"")}>
            <option value="">— Auto (by goals) —</option>
            {homeTeamId && <option value={homeTeamId}>{teams.find(t=>t.id===+homeTeamId)?.name}</option>}
            {awayTeamId && <option value={awayTeamId}>{teams.find(t=>t.id===+awayTeamId)?.name}</option>}
          </Select>

          <div className="flex gap-2">
            <Btn variant="emerald" disabled={saving} onClick={() => {
              const autoWinner = homeGoals > awayGoals ? +homeTeamId :
                                 awayGoals > homeGoals ? +awayTeamId : null
              onSave({
                home_team_id: homeTeamId || null,
                away_team_id: awayTeamId || null,
                home_goals: homeGoals,
                away_goals: awayGoals,
                winner_id: winnerId || autoWinner || null,
                status: "completed"
              })
            }}>
              {saving ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
              Save
            </Btn>
            <Btn variant="ghost" onClick={onCancel}><X className="w-3 h-3"/>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WCT ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"setup",         label:"Team Setup",    icon:Users },
  { id:"group_stage",   label:"Group Stage",   icon:List },
  { id:"qualification", label:"Qualification", icon:Star },
  { id:"knockout",      label:"Knockout",      icon:Swords },
]

export default function WCTAdmin() {
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [activeTab, setActiveTab] = useState("setup")

  if (!selectedTournament) {
    return <TournamentPicker onSelect={(t) => { setSelectedTournament(t); setActiveTab("setup") }} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedTournament(null)}
          className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            {selectedTournament.name}
          </h2>
          <p className="text-xs text-slate-500 capitalize">Status: {selectedTournament.status}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border pb-0 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 -mb-px",
                activeTab===tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-400 hover:text-white"
              )}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "setup"         && <TeamSetup tournament={selectedTournament} />}
        {activeTab === "group_stage"   && <GroupStage tournament={selectedTournament} />}
        {activeTab === "qualification" && <Qualification tournament={selectedTournament} />}
        {activeTab === "knockout"      && <KnockoutStage tournament={selectedTournament} />}
      </div>
    </div>
  )
}