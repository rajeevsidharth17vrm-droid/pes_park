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
import { useState, useMemo, useRef } from "react"
import { Trophy, Target, Shield, Download } from "lucide-react"
import { toPng } from "html-to-image"
import {
  useDuoTournament, useDuoFixtures, useDuoStandings, useDuoTopScorers,
  useDuoGroupStandings, useDuoFixturesByStage,
} from "../../lib/queries"
import { cn } from "../../lib/utils"
import goldenBootLogo from "../../../images/Golden Boot.png"

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function getRoundLabel(round, totalRounds) {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semi-Final"
  if (fromEnd === 2) return "Quarter-Final"
  if (fromEnd === 3) return "Round of 16"
  return `Round ${round}`
}

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

// ── Group Stage View (round_robin) ────────────────────────────────────────────
function GroupStageView({ tournament, fixtures }) {
  const { data: standings = [] } = useDuoStandings(tournament?.id)
  const rounds = [...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b)
  const [activeRound, setActiveRound] = useState(rounds[0] ?? 1)
  const roundFixtures = fixtures.filter(f => f.round === activeRound)

  const exportRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!exportRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `${tournament.name} - Standings.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-0">
      <div className="px-5 py-4 border-b border-surface-border/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Standings</p>
          {standings.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pitch-800 hover:bg-pitch-700 border border-surface-border/60 text-slate-400 hover:text-white transition-colors text-xs disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {exporting ? "Saving…" : "PNG"}
            </button>
          )}
        </div>
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

      {/* Hidden export card */}
      <div ref={exportRef} style={{
        position: "fixed", top: -9999, left: -9999,
        width: 480, backgroundColor: "#0f1923", padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Pes Park · Duo Tour
          </p>
          <p style={{ color: "#ffffff", fontSize: 16, fontWeight: 700 }}>{tournament.name} — Standings</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
              {["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map((h, i) => (
                <th key={h} style={{
                  padding: "6px 8px", color: "#64748b", fontWeight: 600,
                  textAlign: i <= 1 ? "left" : "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, idx) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #1e2d3d", backgroundColor: idx === 0 ? "rgba(99,102,241,0.05)" : "transparent" }}>
                <td style={{ padding: "8px", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "8px" }}>
                  <p style={{ color: idx === 0 ? "#ffffff" : "#cbd5e1", fontWeight: 600, margin: 0 }}>{row.name}</p>
                  <p style={{ color: "#64748b", fontSize: 10, margin: 0 }}>{row.players?.map(p => p.player_name).join(" · ")}</p>
                </td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{row.played}</td>
                <td style={{ padding: "8px", color: "#34d399", textAlign: "center" }}>{row.won}</td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{row.drawn}</td>
                <td style={{ padding: "8px", color: "#f87171", textAlign: "center" }}>{row.lost}</td>
                <td style={{ padding: "8px", color: row.gd >= 0 ? "#34d399" : "#f87171", textAlign: "center" }}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td style={{ padding: "8px", color: "#6366f1", fontWeight: 700, textAlign: "center" }}>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "#1e2d3d", fontSize: 9, marginTop: 12, textAlign: "right" }}>pespark.com</p>
      </div>
    </div>
  )
}

// ── Groups View (group_knockout) ──────────────────────────────────────────────
function GroupsView({ tournament }) {
  const { data: groupStandings = {}, isLoading: gsLoading } = useDuoGroupStandings(tournament.id)
  const { data: groupFixtures = [], isLoading: gfLoading }  = useDuoFixturesByStage(tournament.id, "group")

  const groupNumbers = Object.keys(groupStandings).map(Number).sort((a, b) => a - b)
  const [activeGroup, setActiveGroup] = useState(null)
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

  const exportRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  const currentGroupRows = groupStandings[currentGroup] ?? []
  const groupLetter = currentGroup !== null ? GROUP_LETTERS[currentGroup - 1] : ""

  async function handleExport() {
    if (!exportRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `${tournament.name} - Group ${groupLetter} Standings.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

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
      {/* Group tabs + export button */}
      <div className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto border-b border-surface-border/40">
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
        <div className="flex-1" />
        {currentGroupRows.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pitch-800 hover:bg-pitch-700 border border-surface-border/60 text-slate-400 hover:text-white transition-colors text-xs disabled:opacity-50 shrink-0"
          >
            <Download className="w-3 h-3" />
            {exporting ? "Saving…" : "PNG"}
          </button>
        )}
      </div>

      {currentGroup !== null && (
        <>
          <div className="px-5 py-4 border-b border-surface-border/60">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">
              Group {groupLetter} Standings
            </p>
            {currentGroupRows.length === 0
              ? <p className="text-sm text-slate-500">No teams in this group.</p>
              : <StandingsTable standings={currentGroupRows} highlightTop={2} />
            }
          </div>

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

      {/* Hidden export card */}
      <div ref={exportRef} style={{
        position: "fixed", top: -9999, left: -9999,
        width: 480, backgroundColor: "#0f1923", padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Pes Park · Duo Tour
          </p>
          <p style={{ color: "#ffffff", fontSize: 16, fontWeight: 700 }}>
            {tournament.name} — Group {groupLetter} Standings
          </p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
              {["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map((h, i) => (
                <th key={h} style={{
                  padding: "6px 8px", color: "#64748b", fontWeight: 600,
                  textAlign: i <= 1 ? "left" : "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentGroupRows.map((row, idx) => (
              <tr key={row.id} style={{
                borderBottom: "1px solid #1e2d3d",
                backgroundColor: idx < 2 ? "rgba(52,211,153,0.05)" : "transparent",
              }}>
                <td style={{ padding: "8px", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "8px" }}>
                  <p style={{ color: idx === 0 ? "#ffffff" : "#cbd5e1", fontWeight: 600, margin: 0 }}>{row.name}</p>
                  <p style={{ color: "#64748b", fontSize: 10, margin: 0 }}>{row.players?.map(p => p.player_name).join(" · ")}</p>
                </td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{row.played}</td>
                <td style={{ padding: "8px", color: "#34d399", textAlign: "center" }}>{row.won}</td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{row.drawn}</td>
                <td style={{ padding: "8px", color: "#f87171", textAlign: "center" }}>{row.lost}</td>
                <td style={{ padding: "8px", color: row.gd >= 0 ? "#34d399" : "#f87171", textAlign: "center" }}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td style={{ padding: "8px", color: "#6366f1", fontWeight: 700, textAlign: "center" }}>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "#1e2d3d", fontSize: 9, marginTop: 12, textAlign: "right" }}>pespark.com</p>
      </div>
    </div>
  )
}

// ── Knockout Bracket ──────────────────────────────────────────────────────────
function KnockoutView({ tournament, fixtures, activeRound }) {
  const rounds = [...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b)
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
    <div className="divide-y divide-surface-border/40">
      {roundFixtures.length === 0
        ? <p className="text-sm text-slate-500 px-5 py-6">No fixtures in this round yet.</p>
        : roundFixtures.map(f => <FixtureRow key={f.id} fixture={f} teamSize={tournament.team_size} />)
      }
    </div>
  )
}

// ── Golden Boot ───────────────────────────────────────────────────────────────
function GoldenBootView({ tournamentId, tournamentName }) {
  const { data: rawScorers = [], isLoading } = useDuoTopScorers(tournamentId)

  const scorers = [...rawScorers].sort((a, b) =>
    (Number(b.total_goals) - Number(a.total_goals)) || (Number(b.wins) - Number(a.wins))
  )

  const exportRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!exportRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `${tournamentName} - Golden Boot.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

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
    <div>
      {/* Download button */}
      <div className="flex justify-end px-4 pt-3 pb-1">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pitch-800 hover:bg-pitch-700 border border-surface-border/60 text-slate-400 hover:text-white transition-colors text-xs disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          {exporting ? "Saving…" : "Download PNG"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500 w-10">#</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500">Player</th>
              <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Played</th>
              <th className="py-2.5 px-3 text-center text-xs font-semibold text-slate-500">Wins</th>
              <th className="py-2.5 px-3 text-center text-xs font-semibold text-amber-400">Goals</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s, idx) => {
              const isFirst = idx === 0
              return (
                <tr key={s.player_id}
                  className={cn("border-b border-surface-border/50 transition-colors", isFirst && "bg-amber-400/5")}>
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
                  <td className="py-3 px-3 text-center text-slate-400">{s.wins}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={cn("font-bold font-mono", isFirst ? "text-amber-400" : "text-white")}>
                      {s.total_goals ?? 0}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Hidden export card */}
      <div ref={exportRef} style={{
        position: "fixed", top: -9999, left: -9999,
        width: 480, backgroundColor: "#0f1923", padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(251,191,36,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>🥾</div>
          <div>
            <p style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, marginBottom: 2 }}>
              Pes Park · Duo Tour
            </p>
            <p style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, margin: 0 }}>{tournamentName} — Golden Boot</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
              <th style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "center", width: 32 }}>#</th>
              <th style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "left" }}>Player</th>
              <th style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "center" }}>Played</th>
              <th style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "center" }}>Wins</th>
              <th style={{ padding: "6px 8px", color: "#fbbf24", fontWeight: 600, textAlign: "center" }}>Goals</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s, idx) => (
              <tr key={s.player_id} style={{
                borderBottom: "1px solid #1e2d3d",
                backgroundColor: idx === 0 ? "rgba(251,191,36,0.06)" : "transparent",
              }}>
                <td style={{ padding: "8px", color: idx === 0 ? "#fbbf24" : "#64748b", textAlign: "center", fontWeight: idx === 0 ? 700 : 400 }}>
                  {idx + 1}
                </td>
                <td style={{ padding: "8px", color: idx === 0 ? "#ffffff" : "#cbd5e1", fontWeight: idx === 0 ? 600 : 400 }}>
                  {s.player_name}
                </td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{s.played}</td>
                <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{s.wins}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, fontFamily: "monospace",
                  color: idx === 0 ? "#fbbf24" : "#ffffff" }}>
                  {s.total_goals ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "#1e2d3d", fontSize: 9, marginTop: 12, textAlign: "right" }}>pespark.com</p>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function DuoDashboard({ tournamentId }) {
  const { data: tournament, isLoading: tLoading } = useDuoTournament(tournamentId)
  const { data: allFixtures = [], isLoading: fLoading } = useDuoFixtures(tournamentId)
  const { data: knockoutFixtures = [] } = useDuoFixturesByStage(tournamentId, "knockout")

  const isRoundRobin    = tournament?.format === "round_robin"
  const isKnockout      = tournament?.format === "knockout"
  const isGroupKnockout = tournament?.format === "group_knockout"

  const viewOptions = useMemo(() => {
    if (isRoundRobin)    return [{ value: "group",    label: "Group Stage"  }, { value: "boot", label: "Golden Boot" }]
    if (isKnockout)      return [{ value: "knockout", label: "Bracket"      }, { value: "boot", label: "Golden Boot" }]
    if (isGroupKnockout) return [{ value: "groups",   label: "Group Stage"  }, { value: "knockout", label: "Knockout" }, { value: "boot", label: "Golden Boot" }]
    return [{ value: "boot", label: "Golden Boot" }]
  }, [isRoundRobin, isKnockout, isGroupKnockout])

  const defaultView = isKnockout ? "knockout" : isGroupKnockout ? "groups" : "group"
  const [view, setView] = useState(defaultView)

  // Knockout round selector (lifted to header)
  const knockoutViewFixtures = isGroupKnockout ? knockoutFixtures : allFixtures
  const koRounds = useMemo(() =>
    [...new Set(knockoutViewFixtures.map(f => f.round))].sort((a, b) => a - b),
    [knockoutViewFixtures]
  )
  const koTotalRounds = koRounds.length
  const [activeKoRound, setActiveKoRound] = useState(null)
  const currentKoRound = activeKoRound ?? koRounds[0] ?? null

  // Reset round when fixtures change
  useMemo(() => { setActiveKoRound(null) }, [tournamentId])

  if (tLoading || fLoading) return <p className="text-sm text-slate-500 text-center py-8">Loading…</p>

  if (!tournament) {
    return (
      <div className="card px-6 py-14 text-center">
        <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">Tournament not found</p>
      </div>
    )
  }

  let champion = null
  if (isKnockout) {
    const lastRound = Math.max(...allFixtures.map(f => f.round), 0)
    champion = allFixtures.find(f => f.round === lastRound && f.winner_team_id)?.winner_team_name ?? null
  } else if (isGroupKnockout) {
    const lastKoRound = Math.max(...knockoutFixtures.map(f => f.round), 0)
    champion = knockoutFixtures.find(f => f.round === lastKoRound && f.winner_team_id)?.winner_team_name ?? null
  }

  const showKoRoundPicker = view === "knockout" && koRounds.length > 0

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

        <div className="flex items-center gap-2 shrink-0">
          {/* Round picker — shown in header when Bracket view is active and rounds exist */}
          {showKoRoundPicker && (
            <select
              value={currentKoRound ?? ""}
              onChange={e => setActiveKoRound(Number(e.target.value))}
              className="bg-pitch-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
            >
              {koRounds.map(r => (
                <option key={r} value={r}>{getRoundLabel(r, koTotalRounds)}</option>
              ))}
            </select>
          )}

          {/* View picker */}
          <select
            value={view}
            onChange={e => setView(e.target.value)}
            className="bg-pitch-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
          >
            {viewOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {view === "group"    && <GroupStageView tournament={tournament} fixtures={allFixtures} />}
      {view === "groups"   && <GroupsView     tournament={tournament} />}
      {view === "knockout" && <KnockoutView   tournament={tournament} fixtures={knockoutViewFixtures} activeRound={currentKoRound} />}
      {view === "boot"     && <GoldenBootView tournamentId={tournament.id} tournamentName={tournament.name} />}
    </div>
  )
}