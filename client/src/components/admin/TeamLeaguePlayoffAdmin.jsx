import { useState } from "react"
import { Trophy, Trash2, Zap, AlertTriangle, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "../../lib/utils"
import {
  useTeamLeaguePlayoffs, useGeneratePlayoffs, useResetPlayoffs,
  usePlayoffResult, usePlayoffRecords, useLogPlayoffRecord,
} from "../../lib/queries"
import { usePlayers } from "../../lib/queries"
import { TeamLogoIcon } from "../common/TeamLogo"

const RESULT_COLOR = {
  win:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
  loss: "bg-rose-400/10   text-rose-400   border-rose-400/25",
}

// ── Player result entry row ────────────────────────────────────────────────
function PlayerEntryRow({ homePlayer, awayPlayer, onChange, onSubmit, submitting, entry }) {
  const canSubmit = entry.homePlayerId && entry.awayPlayerId && entry.result &&
    entry.homeScore !== "" && entry.awayScore !== ""

  return (
    <div className="space-y-2 border border-surface-border rounded-xl p-3 bg-pitch-800/40">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <select value={entry.homePlayerId} onChange={e => onChange("homePlayerId", e.target.value)}
          className="bg-pitch-900 border border-surface-border rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-accent/40 truncate">
          <option value="">— Home player —</option>
          {homePlayer.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-slate-600 text-xs font-bold text-center">vs</span>
        <select value={entry.awayPlayerId} onChange={e => onChange("awayPlayerId", e.target.value)}
          className="bg-pitch-900 border border-surface-border rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-accent/40 truncate">
          <option value="">— Away player —</option>
          {awayPlayer.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <select value={entry.result} onChange={e => onChange("result", e.target.value)}
          className="flex-1 bg-pitch-900 border border-surface-border rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-accent/40">
          <option value="">Result</option>
          <option value="win">Win (Home)</option>
          <option value="loss">Loss (Home)</option>
        </select>
        <span className="text-xs text-slate-600 flex-shrink-0">Score:</span>
        <input type="number" min="0" placeholder="0" value={entry.homeScore}
          onChange={e => onChange("homeScore", e.target.value)}
          className="w-14 text-center bg-pitch-900 border border-surface-border rounded-md py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
        <span className="text-slate-600 text-xs">—</span>
        <input type="number" min="0" placeholder="0" value={entry.awayScore}
          onChange={e => onChange("awayScore", e.target.value)}
          className="w-14 text-center bg-pitch-900 border border-surface-border rounded-md py-2 text-sm text-white focus:outline-none focus:border-accent/40" />
        <button onClick={onSubmit} disabled={!canSubmit || submitting}
          className={cn("px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0",
            canSubmit
              ? "bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25"
              : "bg-pitch-900 text-slate-600 border border-surface-border cursor-not-allowed")}>
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Log"}
        </button>
      </div>
    </div>
  )
}

// ── Full match card: team score + player records ───────────────────────────
function PlayoffMatchCard({ match, label, note, allPlayers }) {
  const [expanded, setExpanded] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [entries, setEntries] = useState([
    { id: 1, homePlayerId: "", awayPlayerId: "", result: "", homeScore: "", awayScore: "" }
  ])

  // Team score entry
  const enterResult = usePlayoffResult()
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [scoreError, setScoreError] = useState(null)

  // Player records
  const { data: existingRecords = [], refetch } = usePlayoffRecords(match?.id)
  const logRecord = useLogPlayoffRecord()

  const bothTeams   = match?.team1Name && match?.team2Name
  const isCompleted = match?.status === "completed"
  const t1Won = isCompleted && match.winnerTeamId === match.team1Id
  const t2Won = isCompleted && match.winnerTeamId === match.team2Id

  const homePlayers = allPlayers.filter(p => p.teamId === match?.team1Id)
  const awayPlayers = allPlayers.filter(p => p.teamId === match?.team2Id)

  const usedHomeIds = existingRecords.flatMap(r => [
    homePlayers.find(p => p.id === r.playerId)?.id,
    homePlayers.find(p => p.id === r.opponentId)?.id,
  ]).filter(Boolean)
  const usedAwayIds = existingRecords.flatMap(r => [
    awayPlayers.find(p => p.id === r.playerId)?.id,
    awayPlayers.find(p => p.id === r.opponentId)?.id,
  ]).filter(Boolean)

  const totalPlayers = Math.min(homePlayers.length, awayPlayers.length)
  const loggedCount  = existingRecords.length
  const allLogged    = loggedCount >= totalPlayers && totalPlayers > 0

  function availableHome(entryId) {
    const usedInEntries = entries.filter(e => e.id !== entryId && e.homePlayerId).map(e => Number(e.homePlayerId))
    return homePlayers.filter(p => !usedHomeIds.includes(p.id) && !usedInEntries.includes(p.id))
  }
  function availableAway(entryId) {
    const usedInEntries = entries.filter(e => e.id !== entryId && e.awayPlayerId).map(e => Number(e.awayPlayerId))
    return awayPlayers.filter(p => !usedAwayIds.includes(p.id) && !usedInEntries.includes(p.id))
  }

  function updateEntry(id, field, value) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  async function submitPlayerRecord(entry) {
    const homeId = Number(entry.homePlayerId)
    const awayId = Number(entry.awayPlayerId)
    if (!homeId || !awayId || !entry.result) return
    setSubmitting(true)
    try {
      // result is from home player's perspective
      await logRecord.mutateAsync({
        playerId:       homeId,
        opponentId:     awayId,
        result:         entry.result,            // "win" or "loss" for home player
        playerScore:    Number(entry.homeScore) || 0,
        opponentScore:  Number(entry.awayScore) || 0,
        playoffMatchId: match.id,
      })
      setEntries(prev => {
        const remaining = prev.filter(e => e.id !== entry.id)
        return remaining.length > 0
          ? remaining
          : [{ id: Date.now(), homePlayerId: "", awayPlayerId: "", result: "", homeScore: "", awayScore: "" }]
      })
      refetch()
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to log player result")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitTeamScore() {
    const s1 = parseInt(team1Score)
    const s2 = parseInt(team2Score)
    if (isNaN(s1) || isNaN(s2)) return setScoreError("Enter both scores.")
    if (s1 === s2) return setScoreError("Scores must be different — no draws in playoffs.")
    setScoreError(null)
    try {
      await enterResult.mutateAsync({ id: match.id, team1Score: s1, team2Score: s2 })
      setTeam1Score("")
      setTeam2Score("")
    } catch (err) {
      setScoreError(err?.response?.data?.error || "Failed to save team score.")
    }
  }

  if (!match) {
    return (
      <div className="card px-4 py-4 opacity-50">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        {note && <p className="text-[10px] text-slate-600">{note}</p>}
        <p className="text-sm text-slate-600 italic mt-3 text-center">Not generated yet</p>
      </div>
    )
  }

  return (
    <div className={cn("card overflow-hidden", isCompleted && allLogged && "border-emerald-500/20")}>
      {/* Header */}
      <button onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
            isCompleted && allLogged ? "bg-emerald-400"
            : isCompleted ? "bg-amber-400"
            : loggedCount > 0 ? "bg-amber-400"
            : "bg-slate-600")} />
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
            {note && <p className="text-[10px] text-slate-600 mt-0.5">{note}</p>}
            <p className="text-sm font-semibold text-white mt-1">
              {match.team1Name ?? "TBD"}
              {isCompleted && <span className="text-slate-500 font-mono font-normal mx-2">{match.team1Score}–{match.team2Score}</span>}
              <span className="text-slate-500 font-normal mx-1">vs</span>
              {match.team2Name ?? "TBD"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {bothTeams && (
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
              isCompleted && allLogged ? "bg-emerald-400/10 text-emerald-400"
              : isCompleted ? "bg-amber-400/10 text-amber-400"
              : loggedCount > 0 ? "bg-amber-400/10 text-amber-400"
              : "bg-slate-700 text-slate-500")}>
              {loggedCount}/{totalPlayers} logged
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-surface-border px-5 py-4 space-y-5">

          {!bothTeams ? (
            <p className="text-sm text-slate-600 italic text-center py-3">
              Waiting for previous matches to finish before teams are set
            </p>
          ) : (
            <>
              {/* ── Team score section ─────────────────────────────────── */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Team Score</p>
                {isCompleted ? (
                  <div className="flex items-center gap-3 bg-pitch-800 rounded-xl px-4 py-3">
                    <span className={cn("flex-1 text-sm font-semibold truncate inline-flex items-center gap-1.5",
                      t1Won ? "text-emerald-400" : "text-slate-400")}>
                      <TeamLogoIcon logoUrl={match.team1Logo} name={match.team1Name} />
                      {match.team1Name}
                    </span>
                    <span className="font-mono font-bold text-white bg-pitch-900 px-3 py-1 rounded-lg text-sm">
                      {match.team1Score} – {match.team2Score}
                    </span>
                    <span className={cn("flex-1 text-sm font-semibold truncate text-right inline-flex items-center justify-end gap-1.5",
                      t2Won ? "text-emerald-400" : "text-slate-400")}>
                      {match.team2Name}
                      <TeamLogoIcon logoUrl={match.team2Logo} name={match.team2Name} />
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium text-white truncate inline-flex items-center gap-1.5">
                        <TeamLogoIcon logoUrl={match.team1Logo} name={match.team1Name} />
                        {match.team1Name}
                        <span className="text-[10px] text-slate-600 font-normal">(Home)</span>
                      </span>
                      <input type="number" min="0" placeholder="0" value={team1Score}
                        onChange={e => { setTeam1Score(e.target.value); setScoreError(null) }}
                        className="w-16 text-center bg-pitch-800 border border-surface-border rounded-lg py-2 text-sm text-white font-mono focus:outline-none focus:border-accent/40" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium text-white truncate inline-flex items-center gap-1.5">
                        <TeamLogoIcon logoUrl={match.team2Logo} name={match.team2Name} />
                        {match.team2Name}
                        <span className="text-[10px] text-slate-600 font-normal">(Away)</span>
                      </span>
                      <input type="number" min="0" placeholder="0" value={team2Score}
                        onChange={e => { setTeam2Score(e.target.value); setScoreError(null) }}
                        className="w-16 text-center bg-pitch-800 border border-surface-border rounded-lg py-2 text-sm text-white font-mono focus:outline-none focus:border-accent/40" />
                    </div>
                    {scoreError && <p className="text-xs text-rose-400">{scoreError}</p>}
                    <button onClick={submitTeamScore}
                      disabled={enterResult.isPending || team1Score === "" || team2Score === ""}
                      className={cn("w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                        (team1Score !== "" && team2Score !== "")
                          ? "bg-accent text-white hover:bg-accent-dim"
                          : "bg-pitch-800 text-slate-600 border border-surface-border cursor-not-allowed")}>
                      {enterResult.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : "Log Team Score"
                      }
                    </button>
                  </div>
                )}
              </div>

              {/* ── Player records section ─────────────────────────────── */}
              <div>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  <span className="text-accent">{match.team1Name} (Home)</span>
                  <span className="text-right">{match.team2Name} (Away)</span>
                </div>

                {/* Already logged records */}
                {existingRecords.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Logged</p>
                    {existingRecords.map(r => {
                      const isHome   = homePlayers.some(p => p.id === r.playerId)
                      const homeName = isHome ? r.playerName : r.opponentName
                      const awayName = isHome ? r.opponentName : r.playerName
                      const result   = isHome ? r.result : (r.result === "win" ? "loss" : "win")
                      const homeScore = isHome ? r.playerScore : r.opponentScore
                      const awayScore = isHome ? r.opponentScore : r.playerScore
                      const chip = RESULT_COLOR[result]
                      return (
                        <div key={r.id} className="flex items-center gap-2 bg-pitch-800 rounded-lg px-3 py-2 text-sm">
                          <span className="text-slate-300 flex-1 truncate">{homeName}</span>
                          {homeScore != null && <span className="text-xs font-mono text-slate-400 flex-shrink-0">{homeScore}–{awayScore}</span>}
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded border flex-shrink-0", chip)}>
                            {result === "win" ? "HOME WIN" : "AWAY WIN"}
                          </span>
                          <span className="text-slate-300 flex-1 text-right truncate">{awayName}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add player results */}
                {!allLogged && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Add player results</p>
                    {entries.map(entry => (
                      <PlayerEntryRow
                        key={entry.id}
                        entry={entry}
                        homePlayer={availableHome(entry.id)}
                        awayPlayer={availableAway(entry.id)}
                        onChange={(field, val) => updateEntry(entry.id, field, val)}
                        onSubmit={() => submitPlayerRecord(entry)}
                        submitting={submitting}
                      />
                    ))}
                    <button
                      onClick={() => setEntries(prev => [...prev, { id: Date.now(), homePlayerId: "", awayPlayerId: "", result: "", homeScore: "", awayScore: "" }])}
                      className="text-sm text-accent hover:text-accent/80 transition-colors">
                      + Add another matchup
                    </button>
                  </div>
                )}

                {allLogged && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mt-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>All player matchups logged</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main admin component ───────────────────────────────────────────────────
export default function TeamLeaguePlayoffAdmin() {
  const { data: playoffsData, isLoading } = useTeamLeaguePlayoffs()
  const { data: players = [] }            = usePlayers()
  const generatePlayoffs = useGeneratePlayoffs()
  const resetPlayoffs    = useResetPlayoffs()

  const [showGenerate, setShowGenerate] = useState(false)
  const [showReset, setShowReset]       = useState(false)

  const matches  = playoffsData?.matches ?? []
  const hasData  = matches.length > 0

  const allPlayers = players.map(p => ({ id: p.id, name: p.name, teamId: p.teamId }))

  async function handleGenerate() {
    try {
      await generatePlayoffs.mutateAsync()
      setShowGenerate(false)
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to generate playoffs")
    }
  }

  async function handleReset() {
    try {
      await resetPlayoffs.mutateAsync()
      setShowReset(false)
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to reset playoffs")
    }
  }

  const find = (type) => matches.find(m => m.matchType === type)
  const q1    = find("qualifier1")
  const elim  = find("eliminator")
  const ko    = find("knockout")
  const q2    = find("qualifier2")
  const final = find("final")

  const allDone  = hasData && matches.every(m => m.status === "completed")
  const champion = allDone
    ? (final?.winnerTeamId === final?.team1Id ? final?.team1Name : final?.team2Name)
    : null

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <h2 className="text-sm font-semibold text-white">Team League Playoffs</h2>
          {hasData && (
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg",
              allDone
                ? "bg-gold/15 text-gold border border-gold/30"
                : "bg-emerald-400/15 text-emerald-400 border border-emerald-400/30")}>
              {allDone ? "Completed" : "Active"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasData && !showReset && (
            <button onClick={() => setShowReset(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Reset Bracket
            </button>
          )}
          {!hasData && !showGenerate && (
            <button onClick={() => setShowGenerate(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-accent text-white border border-accent/50 hover:bg-accent-dim transition-colors">
              <Zap className="w-3.5 h-3.5" /> Generate Knockout
            </button>
          )}
        </div>
      </div>

      {/* Generate confirmation */}
      {showGenerate && (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-white">Generate Team League Playoffs</p>
          <div className="text-xs text-slate-400 space-y-1.5">
            <p>Creates the IPL-format 5-team bracket from final standings:</p>
            <ul className="space-y-1 pl-3 border-l border-surface-border ml-1">
              <li><span className="text-white font-medium">Qualifier 1</span> — 1st vs 2nd (winner → Final directly)</li>
              <li><span className="text-white font-medium">Eliminator</span> — 4th vs 5th (loser out in 5th)</li>
              <li><span className="text-white font-medium">Knockout Round</span> — 3rd vs Eliminator winner (loser out in 4th)</li>
              <li><span className="text-white font-medium">Qualifier 2</span> — Q1 loser vs KO winner (winner → Final)</li>
              <li><span className="text-white font-medium">Final</span> — Q1 winner vs Q2 winner</li>
            </ul>
            <p className="text-amber-400 pt-1">All 9 group-stage fixtures must be completed first.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowGenerate(false)}
              className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={handleGenerate} disabled={generatePlayoffs.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent-dim transition-colors">
              {generatePlayoffs.isPending ? "Generating…" : "Generate Playoffs →"}
            </button>
          </div>
        </div>
      )}

      {/* Reset confirmation */}
      {showReset && (
        <div className="card p-5 space-y-4 border-rose-500/20 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-400">Reset the playoff bracket?</p>
              <p className="text-xs text-slate-400 mt-1">
                All playoff match scores will be cleared. Player records logged against playoff matches are kept in match history.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowReset(false)}
              className="flex-1 py-2 rounded-lg border border-surface-border text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={handleReset} disabled={resetPlayoffs.isPending}
              className="flex-1 py-2 rounded-lg bg-rose-500 text-white font-semibold text-sm disabled:opacity-40 hover:bg-rose-600 transition-colors">
              {resetPlayoffs.isPending ? "Resetting…" : "Yes, Reset Bracket"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isLoading ? (
        <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
      ) : !hasData && !showGenerate ? (
        <div className="card px-5 py-10 text-center">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No playoff bracket yet</p>
          <p className="text-slate-600 text-xs mt-1">Generate one once all 9 group-stage fixtures are done</p>
        </div>
      ) : null}

      {/* Champion banner */}
      {champion && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gold/10 border border-gold/30 text-gold">
          <Trophy className="w-5 h-5" />
          <span className="font-bold">{champion}</span>
          <span className="text-sm text-slate-400">are Auction Tour Champions!</span>
        </div>
      )}

      {/* Match cards */}
      {hasData && !showGenerate && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Match Results &amp; Player Records</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlayoffMatchCard match={q1}   label="Qualifier 1 · 1st vs 2nd"              note="Winner → Final · Loser → Q2"                allPlayers={allPlayers} />
            <PlayoffMatchCard match={elim} label="Eliminator · 4th vs 5th"               note="Winner → KO Round · Loser out (5th)"         allPlayers={allPlayers} />
          </div>
          <PlayoffMatchCard match={ko}    label="Knockout Round · 3rd vs Elim winner"   note="Winner → Q2 · Loser out (4th)"              allPlayers={allPlayers} />
          <PlayoffMatchCard match={q2}    label="Qualifier 2 · Q1 loser vs KO winner"   note="Winner → Final · Loser out (3rd)"            allPlayers={allPlayers} />
          <PlayoffMatchCard match={final} label="Final · Q1 winner vs Q2 winner"         note="Winner is Auction Tour Champion"             allPlayers={allPlayers} />
        </div>
      )}
    </div>
  )
}