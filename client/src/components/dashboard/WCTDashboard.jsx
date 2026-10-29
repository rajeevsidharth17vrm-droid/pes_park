/**
 * WCTDashboard.jsx — Public read-only view for a World Cup Tournament.
 * Shows: Group Standings (all 8 groups) + Knockout Bracket.
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Trophy, BarChart2, Swords, Shield } from "lucide-react"
import { wctApi } from "../../lib/api"
import { cn } from "../../lib/utils"

const GROUPS  = ["A","B","C","D","E","F","G","H"]
const ROUNDS  = ["R32","R16","QF","SF","FINAL"]
const ROUND_LABELS = { R32:"Round of 32", R16:"Round of 16", QF:"Quarter-Final", SF:"Semi-Final", FINAL:"Final" }

// ─── Data hooks ───────────────────────────────────────────────────────────────
function useWCStandings(id) {
  return useQuery({
    queryKey: ["wct","standings",id],
    queryFn:  () => wctApi.standings(id),
    enabled:  !!id,
  })
}
function useWCKnockout(id) {
  return useQuery({
    queryKey: ["wct","knockout",id],
    queryFn:  () => wctApi.knockout(id),
    enabled:  !!id,
  })
}
function useWCFixtures(id) {
  return useQuery({
    queryKey: ["wct","groupFixtures",id],
    queryFn:  () => wctApi.groupFixtures(id),
    enabled:  !!id,
  })
}

// ─── Group Standings ──────────────────────────────────────────────────────────
function AllGroupStandings({ tournamentId }) {
  const { data: standings = {}, isLoading } = useWCStandings(tournamentId)
  const [activeGroup, setActiveGroup] = useState("A")
  const { data: fixtures = [] } = useWCFixtures(tournamentId)

  const rows = standings[activeGroup] || []
  const groupFixtures = fixtures.filter(f => f.group_letter === activeGroup)
  const completedCount = groupFixtures.filter(f => f.status === "completed").length
  const [view, setView] = useState("table") // table | fixtures

  if (isLoading) return <p className="text-slate-500 text-sm text-center py-8">Loading standings…</p>

  const hasAnyStandings = GROUPS.some(g => (standings[g]||[]).length > 0)
  if (!hasAnyStandings) return (
    <p className="text-slate-500 text-sm text-center py-8">Group stage not started yet.</p>
  )

  return (
    <div className="space-y-4">
      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap">
        {GROUPS.map(g => {
          const gRows = standings[g] || []
          if (!gRows.length) return null
          const gFixtures = fixtures.filter(f=>f.group_letter===g)
          const gDone = gFixtures.filter(f=>f.status==='completed').length
          return (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                activeGroup===g ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
              )}>
              Group {g}
              {gFixtures.length > 0 && (
                <span className="ml-1 text-xs opacity-60">{gDone}/{gFixtures.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button onClick={()=>setView('table')}
          className={cn("text-xs px-3 py-1 rounded-full font-semibold transition-colors",
            view==='table' ? "bg-accent/20 text-accent border border-accent/30" : "text-slate-500 hover:text-white")}>
          Table
        </button>
        <button onClick={()=>setView('fixtures')}
          className={cn("text-xs px-3 py-1 rounded-full font-semibold transition-colors",
            view==='fixtures' ? "bg-accent/20 text-accent border border-accent/30" : "text-slate-500 hover:text-white")}>
          Fixtures
        </button>
      </div>

      {view === 'table' && (
        <div className="card overflow-hidden">
          <div className="bg-white/3 px-4 py-2.5 border-b border-surface-border">
            <h3 className="text-sm font-bold text-white">Group {activeGroup}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 w-6">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Team</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">P</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">W</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">D</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">L</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">GF</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">GA</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400">GD</th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-400 text-accent">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={cn(
                    "border-b border-surface-border/40",
                    i === 0 && "bg-emerald-500/5"
                  )}>
                    <td className="px-4 py-3 text-slate-500 text-xs">{i+1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-3 h-3 text-accent" />
                        </div>
                        <span className={cn("font-semibold text-sm", i===0?"text-emerald-400":"text-white")}>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center text-slate-300 text-sm">{r.played}</td>
                    <td className="px-2 py-3 text-center text-emerald-400 font-semibold text-sm">{r.won}</td>
                    <td className="px-2 py-3 text-center text-slate-400 text-sm">{r.drawn}</td>
                    <td className="px-2 py-3 text-center text-rose-400 text-sm">{r.lost}</td>
                    <td className="px-2 py-3 text-center text-slate-300 text-sm">{r.gf}</td>
                    <td className="px-2 py-3 text-center text-slate-300 text-sm">{r.ga}</td>
                    <td className="px-2 py-3 text-center text-slate-300 text-sm">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="px-2 py-3 text-center font-bold text-accent">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'fixtures' && (
        <div className="space-y-2">
          {groupFixtures.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No fixtures for Group {activeGroup}</p>
          )}
          {/* Group by round */}
          {[...new Set(groupFixtures.map(f=>f.round_number))].sort((a,b)=>a-b).map(rn => (
            <div key={rn}>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1.5 px-1">Round {rn}</p>
              <div className="card overflow-hidden divide-y divide-surface-border/50">
                {groupFixtures.filter(f=>f.round_number===rn).map(f => {
                  const completed = f.status === 'completed'
                  const homeWin = f.home_goals > f.away_goals
                  const awayWin = f.away_goals > f.home_goals
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn("flex-1 text-right text-sm font-semibold",
                        completed&&homeWin?"text-emerald-400":"text-white")}>
                        {f.home_team_name}
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-center flex-shrink-0">
                        {completed ? (
                          <span className="text-base font-bold text-white">{f.home_goals}–{f.away_goals}</span>
                        ) : (
                          <span className="text-slate-600 text-xs">vs</span>
                        )}
                      </div>
                      <div className={cn("flex-1 text-sm font-semibold",
                        completed&&awayWin?"text-emerald-400":"text-white")}>
                        {f.away_team_name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Knockout Bracket ─────────────────────────────────────────────────────────
function KnockoutBracket({ tournamentId }) {
  const { data: fixtures = [], isLoading } = useWCKnockout(tournamentId)
  const [activeRound, setActiveRound] = useState(null)

  const existingRounds = [...new Set(fixtures.map(f => f.round))]
    .sort((a,b) => ROUNDS.indexOf(a) - ROUNDS.indexOf(b))

  // Auto-select first available round
  const displayRound = activeRound && existingRounds.includes(activeRound)
    ? activeRound
    : existingRounds[0] || null

  if (isLoading) return <p className="text-slate-500 text-sm text-center py-8">Loading bracket…</p>

  if (existingRounds.length === 0) return (
    <p className="text-slate-500 text-sm text-center py-8">Knockout stage not started yet.</p>
  )

  const roundFixtures = fixtures.filter(f => f.round === displayRound)
  const finalFixture = fixtures.find(f => f.round === 'FINAL')
  const champion = finalFixture?.winner_name

  return (
    <div className="space-y-4">
      {champion && (
        <div className="card p-4 text-center border border-amber-500/30 bg-amber-500/5">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
          <p className="text-xs text-slate-400 uppercase tracking-wider">World Cup Champion</p>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{champion}</p>
        </div>
      )}

      {/* Round tabs */}
      <div className="flex gap-1 flex-wrap">
        {existingRounds.map(r => {
          const total = fixtures.filter(f=>f.round===r).length
          const done  = fixtures.filter(f=>f.round===r&&f.status==='completed').length
          return (
            <button key={r} onClick={() => setActiveRound(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                displayRound===r ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
              )}>
              {ROUND_LABELS[r]}
              <span className="ml-1 text-xs opacity-60">{done}/{total}</span>
            </button>
          )
        })}
      </div>

      {/* Fixtures for active round */}
      {roundFixtures.length > 0 && (
        <div className="card overflow-hidden divide-y divide-surface-border/50">
          <div className="bg-white/3 px-4 py-2.5 border-b border-surface-border">
            <h3 className="text-sm font-bold text-white">{ROUND_LABELS[displayRound]}</h3>
          </div>
          {roundFixtures.map(f => {
            const completed = f.status === 'completed'
            const isHomeWinner = f.winner_id && f.winner_id === f.home_team_id
            const isAwayWinner = f.winner_id && f.winner_id === f.away_team_id

            return (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-xs text-slate-600 w-6 text-center flex-shrink-0">
                  {f.match_number}
                </span>
                <div className={cn("flex-1 text-right font-semibold text-sm",
                  isHomeWinner ? "text-amber-400" : f.home_team_name ? "text-white" : "text-slate-600")}>
                  {f.home_team_name || "TBD"}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 w-16 justify-center">
                  {completed ? (
                    <span className="text-base font-bold text-white">{f.home_goals}–{f.away_goals}</span>
                  ) : (
                    <span className="text-slate-600 text-xs">vs</span>
                  )}
                </div>
                <div className={cn("flex-1 font-semibold text-sm",
                  isAwayWinner ? "text-amber-400" : f.away_team_name ? "text-white" : "text-slate-600")}>
                  {f.away_team_name || "TBD"}
                </div>
                {f.winner_name && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 flex-shrink-0">
                    🏆 {f.winner_name}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WCTDashboard({ tournamentId }) {
  const [view, setView] = useState("groups") // groups | knockout

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setView("groups")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            view==="groups" ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
          )}>
          <BarChart2 className="w-3.5 h-3.5" /> Group Stage
        </button>
        <button onClick={() => setView("knockout")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            view==="knockout" ? "bg-accent text-white" : "bg-white/5 text-slate-400 hover:text-white"
          )}>
          <Swords className="w-3.5 h-3.5" /> Knockout
        </button>
      </div>

      {view === "groups"   && <AllGroupStandings tournamentId={tournamentId} />}
      {view === "knockout" && <KnockoutBracket   tournamentId={tournamentId} />}
    </div>
  )
}