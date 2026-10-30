/**
 * WCTDashboard.jsx — Public read-only view for a World Cup Tournament.
 * Shows: Group Standings + Knockout Bracket + Awards (Golden Boot, Best Player, Golden Glove)
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Trophy, BarChart2, Swords, Shield, Medal, Footprints, Sparkles, ChevronDown, Download } from "lucide-react"
import { wctApi } from "../../lib/api"
import { cn } from "../../lib/utils"

const ALL_GROUPS = ["A","B","C","D","E","F","G","H"]
const GROUPS  = ALL_GROUPS  // kept for compat; dynamic filtering done per tournament
const ROUNDS  = ["R32","R16","QF","SF","FINAL"]
const ROUND_LABELS = { R32:"Round of 32", R16:"Round of 16", QF:"Quarter-Final", SF:"Semi-Final", FINAL:"Final" }

// ─── Data hooks ───────────────────────────────────────────────────────────────
function useWCTournament(id) {
  return useQuery({
    queryKey: ["wct","tournaments"],
    queryFn:  () => wctApi.list(),
    select:   (list) => list.find(t => t.id === id),
    enabled:  !!id,
  })
}
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
function useTopScorers(id) {
  return useQuery({
    queryKey: ["wct","topScorers",id],
    queryFn:  () => wctApi.topScorers(id),
    enabled:  !!id,
  })
}
function useGoldenGlove(id) {
  return useQuery({
    queryKey: ["wct","goldenGlove",id],
    queryFn:  () => wctApi.goldenGlove(id),
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

// ─── CSV export helper ────────────────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const lines = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","))]
  const blob = new Blob([lines.join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── AwardDropdown — shared accordion for each award category ────────────────
function AwardDropdown({ title, icon: Icon, color, children }) {
  const [open, setOpen] = useState(false)
  const cols = {
    amber:   "border-amber-500/30 bg-amber-500/5 text-amber-400",
    sky:     "border-sky-500/30 bg-sky-500/5 text-sky-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  }
  return (
    <div className={cn("rounded-xl border overflow-hidden", cols[color])}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform text-slate-400", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-white/10 bg-black/20">{children}</div>}
    </div>
  )
}

// ─── Awards Panel ─────────────────────────────────────────────────────────────
function WCTAwardsPanel({ tournamentId }) {
  const { data: tournament } = useWCTournament(tournamentId)
  const { data: scorers = [], isLoading: loadingScorers } = useTopScorers(tournamentId)
  const { data: gloveList = [], isLoading: loadingGlove } = useGoldenGlove(tournamentId)

  const awards = tournament?.awards ?? {}
  const top10Scorers = scorers.slice(0, 10)
  const top10Glove   = gloveList.slice(0, 10)

  // For "Best Player" top list we re-use top scorers as a proxy (no dedicated stat)
  // Admin-set award winner is highlighted in each list

  function exportScorers() {
    exportCSV(
      "golden_boot_top10.csv",
      ["Rank", "Player", "Team", "Group", "Goals"],
      top10Scorers.map((r, i) => [i+1, r.player_name, r.team_name, r.group_letter ?? "-", r.goals])
    )
  }
  function exportBestPlayer() {
    const row = awards.best_player
    if (!row?.player) return
    exportCSV("best_player.csv", ["Player", "Team"], [[row.player, row.team]])
  }
  function exportGlove() {
    exportCSV(
      "golden_glove_top10.csv",
      ["Rank", "Team", "Group", "Games Played", "Goals Conceded"],
      top10Glove.map((r, i) => [i+1, r.team_name, r.group_letter ?? "-", r.played, r.goals_conceded])
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Golden Boot ── */}
      <AwardDropdown title="🥾 Golden Boot — Top Scorers" icon={Footprints} color="amber">
        {/* Admin winner banner */}
        {awards.golden_boot?.player && (
          <div className="px-4 py-3 flex items-center gap-3 bg-amber-500/10 border-b border-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Winner</p>
              <p className="text-white font-bold">{awards.golden_boot.player}</p>
              <p className="text-xs text-slate-400">{awards.golden_boot.team}
                {awards.golden_boot.goals != null ? ` · ${awards.golden_boot.goals} goals` : ""}
              </p>
            </div>
          </div>
        )}
        {/* Top 10 list */}
        <div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Top 10 Scorers</p>
            <button onClick={exportScorers}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
          {loadingScorers ? (
            <p className="text-slate-500 text-xs text-center py-4">Loading…</p>
          ) : top10Scorers.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-4">No scorer data yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {top10Scorers.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn(
                    "w-6 text-center text-xs font-bold flex-shrink-0",
                    i===0 ? "text-amber-400" : i===1 ? "text-slate-300" : i===2 ? "text-amber-600" : "text-slate-600"
                  )}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.player_name}</p>
                    <p className="text-xs text-slate-500">{r.team_name}{r.group_letter ? ` · Grp ${r.group_letter}` : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{r.goals}</span>
                  <span className="text-xs text-slate-600">goals</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AwardDropdown>

      {/* ── Best Player ── */}
      <AwardDropdown title="✨ Best Player" icon={Sparkles} color="sky">
        {awards.best_player?.player ? (
          <div className="px-4 py-3 flex items-center gap-3 bg-sky-500/10 border-b border-sky-500/20">
            <Trophy className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sky-300 font-semibold uppercase tracking-wider">Winner</p>
              <p className="text-white font-bold">{awards.best_player.player}</p>
              <p className="text-xs text-slate-400">{awards.best_player.team}</p>
            </div>
            <button onClick={exportBestPlayer}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-400 transition-colors">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-slate-600 text-xs italic">Best Player not announced yet</p>
          </div>
        )}
        {/* Top scorers as candidate reference */}
        {top10Scorers.length > 0 && (
          <div>
            <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider border-b border-white/5">
              Top performers (by goals)
            </p>
            <div className="divide-y divide-white/5">
              {top10Scorers.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="text-xs text-slate-600 w-5 text-center">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{r.player_name}</p>
                    <p className="text-xs text-slate-500">{r.team_name}</p>
                  </div>
                  <span className="text-xs text-sky-400 font-semibold">{r.goals} goals</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AwardDropdown>

      {/* ── Golden Glove ── */}
      <AwardDropdown title="🧤 Golden Glove — Least Goals Conceded" icon={Shield} color="emerald">
        {awards.golden_glove?.player && (
          <div className="px-4 py-3 flex items-center gap-3 bg-emerald-500/10 border-b border-emerald-500/20">
            <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Winner</p>
              <p className="text-white font-bold">{awards.golden_glove.player}</p>
              <p className="text-xs text-slate-400">{awards.golden_glove.team}</p>
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Top 10 — Fewest Goals Conceded</p>
            <button onClick={exportGlove}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
          {loadingGlove ? (
            <p className="text-slate-500 text-xs text-center py-4">Loading…</p>
          ) : top10Glove.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-4">No match data yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {top10Glove.map((r, i) => (
                <div key={r.team_id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn(
                    "w-6 text-center text-xs font-bold flex-shrink-0",
                    i===0 ? "text-emerald-400" : i===1 ? "text-slate-300" : i===2 ? "text-emerald-600" : "text-slate-600"
                  )}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.team_name}</p>
                    <p className="text-xs text-slate-500">
                      Grp {r.group_letter ?? "–"} · {r.played} games
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{r.goals_conceded}</span>
                  <span className="text-xs text-slate-600">conceded</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AwardDropdown>

    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WCTDashboard({ tournamentId }) {
  const [view, setView] = useState("groups") // groups | knockout | awards

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <button onClick={() => setView("awards")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            view==="awards" ? "bg-amber-500/20 border border-amber-500/30 text-amber-400" : "bg-white/5 text-slate-400 hover:text-white"
          )}>
          <Medal className="w-3.5 h-3.5" /> Awards
        </button>
      </div>

      {view === "groups"   && <AllGroupStandings tournamentId={tournamentId} />}
      {view === "knockout" && <KnockoutBracket   tournamentId={tournamentId} />}
      {view === "awards"   && <WCTAwardsPanel     tournamentId={tournamentId} />}
    </div>
  )
}