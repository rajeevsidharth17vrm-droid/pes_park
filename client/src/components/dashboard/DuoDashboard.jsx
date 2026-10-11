/**
 * DuoDashboard.jsx — Public-facing view for a single Duo tournament.
 *
 * Views:
 *   "group"    — Standings table + round-by-round fixtures (round_robin)
 *   "groups"   — Per-group tabs with standings + fixtures (group_knockout)
 *   "knockout" — Bracket view
 *   "boot"     — Individual wins / Golden Boot leaderboard
 *
 * The parent (CommonDashboard) passes `tournamentId`.
 */
import { useState, useMemo } from "react"
import { Trophy, Target, ListOrdered, Shield } from "lucide-react"
import {
  useDuoTournament, useDuoFixtures, useDuoStandings, useDuoTopScorers,
  useDuoGroupStandings, useDuoFixturesByStage,
} from "../../lib/queries"
import { cn } from "../../lib/utils"
import goldenBootLogo from "../../../images/Golden Boot.png"

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// ─────────────────────────────────────────────────────────────────────────────
// Round label helper
// ─────────────────────────────────────────────────────────────────────────────
function getRoundLabel(round, totalRounds) {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semi-Final"
  if (fromEnd === 2) return "Quarter-Final"
  if (fromEnd === 3) return "Round of 16"
  return `Round ${round}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Single fixture row — score + expandable 1v1 records
// ─────────────────────────────────────────────────────────────────────────────
function FixtureRow({ fixture: f, teamSize }) {
  const [expanded, setExpanded] = useState(false)
  const completed = f.status === "completed"

  return (
    <div>
      <button
        className="w-full flex items-center px-5 py-3.5 hover:bg-pitch-800/40 transition-colors text-left"
        onClick={() => completed && setExpanded(e => !e)}
      >
        <div className={cn("w-2 h-2 rounded-full shrink-0 mr-3",
          completed ? "bg-emerald-400" : f.is_tiebreaker_needed ? "bg-amber-400 animate-pulse" : "bg-slate-600"
        )} />
        <span className={cn("flex-1 text-sm font-medium truncate",
          f.winner_team_id === f.home_team_id ? "text-white" : completed ? "text-slate-400" : "text-slate-300"
        )}>
          {f.home_team_name ?? "TBD"}
        </span>
        <span className="px-4 shrink-0">
          {completed ? (
            <span className="text-sm font-mono font-bold text-white bg-pitch-800 px-3 py-1 rounded-lg">
              {f.home_score}–{f.away_score}
            </span>
          ) : (
            <span className="text-xs text-slate-600">vs</span>
          )}
        </span>
        <span className={cn("flex-1 text-sm font-medium text-right truncate",
          f.winner_team_id === f.away_team_id ? "text-white" : completed ? "text-slate-400" : "text-slate-300"
        )}>
          {f.away_team_name ?? "TBD"}
        </span>
        {completed && (
          <span className="ml-3 text-[10px] text-slate-600 shrink-0">{expanded ? "▲" : "▼"}</span>
        )}
      </button>

      {expanded && f.match_records?.length > 0 && (
        <div className="px-5 pb-3 space-y-1 bg-pitch-900/40">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider pb-1">Individual matchups</p>
          {f.match_records.map(mr => (
            <div key={mr.id} className="flex items-center gap-2 text-xs">
              <span className="text-[10px] text-slate-600 w-4 text-right">#{mr.slot}</span>
              <span className={cn("flex-1 truncate", mr.result === "home" ? "text-white font-medium" : "text-slate-400")}>
                {mr.home_player_name}
              </span>
              <span className="font-mono font-bold text-slate-300 px-2 bg-pitch-800 rounded py-0.5">
                {mr.home_score}–{mr.away_score}
              </span>
              <span className={cn("flex-1 text-right truncate", mr.result === "away" ? "text-white font-medium" : "text-slate-400")}>
                {mr.away_player_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini standings table (reused per group and for full standings)
// ─────────────────────────────────────────────────────────────────────────────
function StandingsTable({ standings, highlightTop = 0 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500 border-b border-surface-border/40">
            <th className="pb-2 text-left font-medium w-5">#</th>
            <th className="pb-2 text-left font-medium">Team</th>
            <th className="pb-2 text-center font-medium">P</th>
            <th className="pb-2 text-center font-medium">W</th>
            <th className="pb-2 text-center font-medium">D</th>
            <th className="pb-2 text-center font-medium">L</th>
            <th className="pb-2 text-center font-medium">GD</th>
            <th className="pb-2 text-center font-medium text-accent">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/30">
          {standings.map((row, idx) => (
            <tr key={row.id} className={cn(
              "transition-colors",
              idx === 0 && "bg-accent/5",
              highlightTop > 0 && idx < highlightTop && "border-l-2 border-l-emerald-500/40"
            )}>
              <td className="py-2 text-slate-500">{idx + 1}</td>
              <td className="py-2">
                <div>
                  <p className={cn("font-semibold", idx === 0 ? "text-white" : "text-slate-300")}>{row.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {row.players?.map(p => p.player_name).join(" · ")}
                  </p>
                </div>
              </td>
              <td className="py-2 text-center text-slate-400">{row.played}</td>
              <td className="py-2 text-center text-emerald-400">{row.won}</td>
              <td className="py-2 text-center text-slate-400">{row.drawn}</td>
              <td className="py-2 text-center text-red-400">{row.lost}</td>
              <td className={cn("py-2 text-center", row.gd >= 0 ? "text-emerald-400" : "text-red-400")}>
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </td>
              <td className="py-2 text-center text-accent font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Stage View (round_robin format)
// ─────────────────────────────────────────────────────────────────────────────
function GroupStageView({ tournament, fixtures }) {
  const { data: standings = [] } = useDuoStandings(tournament?.id)
  const rounds = [...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b)
  const [activeRound, setActiveRound] = useState(rounds[0] ?? 1)
  const roundFixtures = fixtures.filter(f => f.round === activeRound)

  return (
    <div className="space-y-0">
      <div className="px-5 py-4 border-b border-surface-border/60">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Standings</p>
        {standings.length === 0
          ? <p className="text-sm text-slate-500">No teams yet.</p>
          : <StandingsTable standings={standings} />
        }
      </div>

      {rounds.length > 0 && (
        <>
          <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-surface-border/40">
            {rounds.map(r => (
              <button key={r} onClick={() => setActiveRound(r)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  r === activeRound ? "bg-accent text-white" : "bg-pitch-800 text-slate-500 hover:text-white"
                )}>
                Round {r}
              </button>
            ))}
          </div>
          <div className="divide-y divide-surface-border/40">
            {roundFixtures.length === 0
              ? <p className="text-sm text-slate-500 px-5 py-6">No fixtures in this round.</p>
              : roundFixtures.map(f => <FixtureRow key={f.id} fixture={f} teamSize={tournament.team_size} />)
            }
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Group + Knockout — Groups view (per-group standings + fixtures)
// ─────────────────────────────────────────────────────────────────────────────
function GroupsView({ tournament }) {
  const { data: groupStandings = {}, isLoading: gsLoading } = useDuoGroupStandings(tournament.id)
  const { data: groupFixtures = [], isLoading: gfLoading }  = useDuoFixturesByStage(tournament.id, "group")

  const groupNumbers = Object.keys(groupStandings).map(Number).sort((a, b) => a - b)
  const [activeGroup, setActiveGroup] = useState(null)

  // Set first group once loaded
  const currentGroup = activeGroup ?? groupNumbers[0] ?? null

  const groupRounds = useMemo(() => {
    const inGroup = groupFixtures.filter(f =>
      f.home_team_group === currentGroup || f.away_team_group === currentGroup
    )
    return [...new Set(inGroup.map(f => f.round))].sort((a, b) => a - b)
  }, [groupFixtures, currentGroup])

  const [activeRound, setActiveRound] = useState(null)
  const currentRound = activeRound ?? groupRounds[0] ?? null

  const roundFixtures = groupFixtures.filter(f =>
    f.round === currentRound &&
    (f.home_team_group === currentGroup || f.away_team_group === currentGroup)
  )

  if (gsLoading || gfLoading) return <p className="text-sm text-slate-500 px-5 py-6">Loading…</p>

  if (groupNumbers.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-slate-500 text-sm">Groups not drawn yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Group tabs */}
      <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-surface-border/40">
        {groupNumbers.map(g => (
          <button key={g}
            onClick={() => { setActiveGroup(g); setActiveRound(null) }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
              g === currentGroup ? "bg-accent text-white" : "bg-pitch-800 text-slate-500 hover:text-white"
            )}>
            Group {GROUP_LETTERS[g - 1]}
          </button>
        ))}
      </div>

      {currentGroup !== null && (
        <>
          {/* Per-group standings */}
          <div className="px-5 py-4 border-b border-surface-border/60">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Group {GROUP_LETTERS[currentGroup - 1]} Standings
            </p>
            {(groupStandings[currentGroup] ?? []).length === 0
              ? <p className="text-sm text-slate-500">No teams in this group.</p>
              : <StandingsTable standings={groupStandings[currentGroup]} highlightTop={2} />
            }
          </div>

          {/* Rounds within this group */}
          {groupRounds.length > 0 && (
            <>
              <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-surface-border/40">
                {groupRounds.map(r => (
                  <button key={r}
                    onClick={() => setActiveRound(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                      r === currentRound ? "bg-accent text-white" : "bg-pitch-800 text-slate-500 hover:text-white"
                    )}>
                    Round {r}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-surface-border/40">
                {roundFixtures.length === 0
                  ? <p className="text-sm text-slate-500 px-5 py-6">No fixtures in this round.</p>
                  : roundFixtures.map(f => <FixtureRow key={f.id} fixture={f} teamSize={tournament.team_size} />)
                }
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Knockout Bracket
// ─────────────────────────────────────────────────────────────────────────────
function KnockoutView({ tournament, fixtures }) {
  const rounds = [...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b)
  const totalRounds = rounds.length
  const [activeRound, setActiveRound] = useState(rounds[0] ?? 1)
  const roundFixtures = fixtures
    .filter(f => f.round === activeRound)
    .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))

  if (fixtures.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-slate-500 text-sm">Knockout bracket not generated yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {rounds.length > 1 && (
        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-surface-border/40">
          {rounds.map(r => (
            <button key={r} onClick={() => setActiveRound(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                r === activeRound ? "bg-accent text-white" : "bg-pitch-800 text-slate-500 hover:text-white"
              )}>
              {getRoundLabel(r, totalRounds)}
            </button>
          ))}
        </div>
      )}
      <div className="divide-y divide-surface-border/40">
        {roundFixtures.length === 0
          ? <p className="text-sm text-slate-500 px-5 py-6">No fixtures yet.</p>
          : roundFixtures.map(f => <FixtureRow key={f.id} fixture={f} teamSize={tournament.team_size} />)
        }
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Golden Boot / Individual Wins Leaderboard
// ─────────────────────────────────────────────────────────────────────────────
function GoldenBootView({ tournamentId }) {
  const { data: scorers = [], isLoading } = useDuoTopScorers(tournamentId)

  if (isLoading) return <p className="text-sm text-slate-500 px-5 py-6">Loading…</p>

  if (scorers.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <Target className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No results logged yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border">
            <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500 w-10">#</th>
            <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500">Player</th>
            <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Played</th>
            <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Draws</th>
            <th className="py-2.5 px-3 text-center text-xs font-semibold text-emerald-400">Wins</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, idx) => {
            const isFirst = idx === 0
            return (
              <tr key={s.player_id}
                className={cn("border-b border-surface-border/50 transition-colors", isFirst && "bg-emerald-400/5")}>
                <td className="py-3 px-3 text-center">
                  {isFirst
                    ? <span className="rank-gold text-sm">1</span>
                    : <span className="text-slate-500 text-sm">{idx + 1}</span>
                  }
                </td>
                <td className="py-3 px-4">
                  <span className={cn("font-medium", isFirst ? "text-white" : "text-slate-300")}>
                    {s.player_name}
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-slate-400">{s.played}</td>
                <td className="py-3 px-3 text-center text-slate-400">{s.draws}</td>
                <td className="py-3 px-3 text-center">
                  <span className={cn("font-bold font-mono", isFirst ? "text-emerald-400" : "text-white")}>
                    {s.wins}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — DuoDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function DuoDashboard({ tournamentId }) {
  const { data: tournament, isLoading: tLoading } = useDuoTournament(tournamentId)
  const { data: allFixtures = [], isLoading: fLoading } = useDuoFixtures(tournamentId)
  // For group_knockout: separate fixture sets
  const { data: knockoutFixtures = [] } = useDuoFixturesByStage(tournamentId, "knockout")

  const isRoundRobin    = tournament?.format === "round_robin"
  const isKnockout      = tournament?.format === "knockout"
  const isGroupKnockout = tournament?.format === "group_knockout"

  // Build available views based on format
  const viewOptions = useMemo(() => {
    if (isRoundRobin)    return [{ value: "group",    label: "Group Stage"  }, { value: "boot", label: "Golden Boot" }]
    if (isKnockout)      return [{ value: "knockout", label: "Bracket"      }, { value: "boot", label: "Golden Boot" }]
    if (isGroupKnockout) return [{ value: "groups",   label: "Group Stage"  }, { value: "knockout", label: "Knockout" }, { value: "boot", label: "Golden Boot" }]
    return [{ value: "boot", label: "Golden Boot" }]
  }, [isRoundRobin, isKnockout, isGroupKnockout])

  const defaultView = isKnockout ? "knockout" : isGroupKnockout ? "groups" : "group"
  const [view, setView] = useState(defaultView)

  if (tLoading || fLoading) return <p className="text-sm text-slate-500 text-center py-8">Loading…</p>

  if (!tournament) {
    return (
      <div className="card px-6 py-14 text-center">
        <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">Tournament not found</p>
      </div>
    )
  }

  // Determine champion
  let champion = null
  if (isKnockout) {
    const lastRound = Math.max(...allFixtures.map(f => f.round), 0)
    champion = allFixtures.find(f => f.round === lastRound && f.winner_team_id)?.winner_team_name ?? null
  } else if (isGroupKnockout) {
    const lastKoRound = Math.max(...knockoutFixtures.map(f => f.round), 0)
    champion = knockoutFixtures.find(f => f.round === lastKoRound && f.winner_team_id)?.winner_team_name ?? null
  }

  // For KnockoutView in group_knockout, pass only knockout-stage fixtures
  const knockoutViewFixtures = isGroupKnockout ? knockoutFixtures : allFixtures

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {view === "boot" ? (
            <img src={goldenBootLogo} alt="Golden Boot" className="w-9 h-9 object-contain shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-accent" />
            </div>
          )}
          <div className="min-w-0">
            <p className="section-label mb-0.5 truncate">Duo · {tournament.team_size}v{tournament.team_size}</p>
            <h2 className="text-base font-semibold text-white truncate">{tournament.name}</h2>
            {champion && (
              <p className="text-xs text-gold mt-0.5">
                🏆 <span className="font-semibold">{champion}</span> — Champions
              </p>
            )}
          </div>
        </div>

        {/* View picker */}
        <select
          value={view}
          onChange={e => setView(e.target.value)}
          className="shrink-0 bg-pitch-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
        >
          {viewOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {view === "group"    && <GroupStageView tournament={tournament} fixtures={allFixtures} />}
      {view === "groups"   && <GroupsView     tournament={tournament} />}
      {view === "knockout" && <KnockoutView   tournament={tournament} fixtures={knockoutViewFixtures} />}
      {view === "boot"     && <GoldenBootView tournamentId={tournament.id} />}
    </div>
  )
}