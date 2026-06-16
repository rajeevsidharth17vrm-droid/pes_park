import { Calendar, Clock } from "lucide-react"
import { cn } from "../../lib/utils"

function FixtureRow({ fixture, myTeamName }) {
  const isHome     = fixture.home === myTeamName
  const isUpcoming = fixture.status === "upcoming"
  const myScore    = isHome ? fixture.homeScore : fixture.awayScore
  const oppScore   = isHome ? fixture.awayScore : fixture.homeScore
  const opponent   = isHome ? fixture.away : fixture.home

  let result = null
  let resultLabel = ""
  if (!isUpcoming) {
    if (myScore > oppScore)      { result = "win";  resultLabel = "W" }
    else if (myScore < oppScore) { result = "loss"; resultLabel = "L" }
    else                         { result = "draw"; resultLabel = "D" }
  }

  const resultColor = {
    win:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    loss: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    draw: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  }

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover",
      !isUpcoming && result === "win" && "border-l-2 border-emerald-500",
      !isUpcoming && result === "loss" && "border-l-2 border-rose-500",
      !isUpcoming && result === "draw" && "border-l-2 border-amber-400",
      isUpcoming && "border-l-2 border-slate-700",
    )}>
      {/* Date + round */}
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-white">{fixture.date}</p>
        <p className="text-xs text-slate-600 mt-0.5">Round {fixture.round}</p>
      </div>

      {/* Location badge */}
      <span className={cn(
        "text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
        isHome ? "bg-accent/15 text-accent" : "bg-slate-700/60 text-slate-400"
      )}>
        {isHome ? "H" : "A"}
      </span>

      {/* Opponent */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {isHome ? "vs " : "@ "}{opponent}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">{isHome ? "Home" : "Away"}</p>
      </div>

      {/* Score or countdown */}
      {isUpcoming ? (
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Upcoming</span>
        </div>
      ) : (
        <div className="text-center flex-shrink-0">
          <p className="text-base font-bold font-mono text-white">
            {myScore} – {oppScore}
          </p>
        </div>
      )}

      {/* Result badge */}
      {!isUpcoming && result && (
        <span className={cn(
          "w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0",
          resultColor[result]
        )}>
          {resultLabel}
        </span>
      )}
    </div>
  )
}

export default function TeamFixtures({ fixtures, myTeamName }) {
  const myFixtures  = fixtures.filter(f => f.home === myTeamName || f.away === myTeamName)
  const past        = myFixtures.filter(f => f.status === "completed").reverse()
  const upcoming    = myFixtures.filter(f => f.status === "upcoming")

  const wins   = past.filter(f => {
    const isHome = f.home === myTeamName
    return isHome ? f.homeScore > f.awayScore : f.awayScore > f.homeScore
  }).length
  const draws  = past.filter(f => f.homeScore === f.awayScore).length
  const losses = past.length - wins - draws

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Wins",   value: wins,   color: "text-emerald-400" },
          { label: "Draws",  value: draws,  color: "text-amber-400"   },
          { label: "Losses", value: losses, color: "text-rose-400"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={cn("text-2xl font-extrabold font-mono", color)}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
            <Calendar className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-white">Upcoming fixtures</h2>
          </div>
          <div className="divide-y divide-surface-border/60">
            {upcoming.map(f => <FixtureRow key={f.id} fixture={f} myTeamName={myTeamName} />)}
          </div>
        </div>
      )}

      {/* Past results */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Past results</h2>
        </div>
        <div className="divide-y divide-surface-border/60">
          {past.map(f => <FixtureRow key={f.id} fixture={f} myTeamName={myTeamName} />)}
        </div>
      </div>
    </div>
  )
}
