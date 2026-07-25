import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Crown, ChevronDown, Trophy } from "lucide-react"
import Layout from "../components/layout/Layout"
import Loading from "../components/common/Loading"
import { useSeasonRecords, useLeagueInfo } from "../lib/queries"
import { cn } from "../lib/utils"
import teamLeagueImg from "../../images/Team League.png"

function parseCustomAwards(record) {
  if (record.custom_awards && Array.isArray(record.custom_awards) && record.custom_awards.length > 0) {
    return record.custom_awards
  }
  const awards = []
  if (record.champion_team) awards.push({ title: "Champion Team", winner: `${record.champion_team}${record.champion_pts ? ` (${record.champion_pts} pts)` : ""}` })
  if (record.ballondor_winner) awards.push({ title: "Ballon d'Or", winner: record.ballondor_winner })
  if (record.top_scorer) awards.push({ title: "Golden Boot", winner: `${record.top_scorer}${record.top_scorer_goals ? ` (${record.top_scorer_goals} goals)` : ""}` })
  if (record.ucl_winner) awards.push({ title: "UCL Winner", winner: record.ucl_winner })
  if (record.highest_mv_player) awards.push({ title: "Highest MV", winner: `${record.highest_mv_player}${record.highest_mv ? ` (MV ${record.highest_mv})` : ""}` })
  if (record.longest_streak_player) awards.push({ title: "Longest Win Streak", winner: `${record.longest_streak_player}${record.longest_streak ? ` (${record.longest_streak} wins)` : ""}` })
  const weeklyWinners = Array.isArray(record.weekly_winners) ? record.weekly_winners.filter(Boolean) : []
  weeklyWinners.forEach((w, i) => awards.push({ title: `Weekly ${i + 1} Winner`, winner: w }))
  return awards
}

function SeasonDetail({ record }) {
  const awards = parseCustomAwards(record)
  const squadPlayers = Array.isArray(record.team_league_players)
    ? record.team_league_players.filter(Boolean) : []

  return (
    <div className="space-y-5 mt-5">
      {/* Awards */}
      {awards.filter(a => a.title && a.winner).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <p className="text-sm font-semibold text-white">Awards & Winners</p>
          </div>
          <div className="px-5 py-2 divide-y divide-surface-border/50">
            {awards.filter(a => a.title && a.winner).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-gold flex-shrink-0" />
                  <p className="text-xs text-slate-500">{a.title}</p>
                </div>
                <p className="text-sm font-semibold text-white">{a.winner}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team League */}
      {record.team_league_winner && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
            <img src={teamLeagueImg} alt="Team League" className="w-7 h-7 object-contain" />
            <div>
              <p className="text-xs text-slate-500">Team League Champions</p>
              <p className="text-sm font-bold text-white">{record.team_league_winner}</p>
            </div>
          </div>
          {squadPlayers.length > 0 && (
            <div className="px-5 py-3">
              <p className="text-xs text-slate-500 mb-2">Squad</p>
              <div className="flex flex-wrap gap-1.5">
                {squadPlayers.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-surface-border/50 rounded-lg text-xs text-slate-300">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {record.notes && (
        <div className="card px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-300">{record.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function HallOfFame() {
  const navigate = useNavigate()
  const { data: records = [], isLoading } = useSeasonRecords()
  const [openId, setOpenId] = useState(null)

  if (isLoading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-7 h-7 text-gold" />
          <div>
            <h1 className="text-xl font-extrabold text-white">Hall of Fame</h1>
            <p className="text-sm text-slate-500">Season records and award winners</p>
          </div>
        </div>

        {records.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No season records yet</p>
          </div>
        )}

        <div className="space-y-2">
          {records.map(record => {
            const isOpen = openId === record.id
            return (
              <div key={record.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : record.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-gold flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-bold text-white">{record.season_name}</p>
                      <p className="text-xs text-slate-500">{record.year}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-surface-border">
                    <SeasonDetail record={record} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}