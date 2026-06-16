import { cn } from "../../lib/utils"

export default function StandingsTable({ teams }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <p className="section-label mb-0.5">League table</p>
        <h2 className="text-base font-semibold text-white">Season standings</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {["#", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "py-2.5 text-xs font-semibold text-slate-500 tracking-wide",
                    h === "Team" ? "text-left px-4" : "text-center px-2",
                    h === "Pts"  && "text-accent"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => {
              const pos = idx + 1
              const isFirst = pos === 1
              return (
                <tr
                  key={team.id}
                  className={cn(
                    "table-row-hover",
                    isFirst && "gold-border bg-gold/5"
                  )}
                >
                  <td className="py-3 px-3 text-center">
                    {isFirst
                      ? <span className="rank-gold text-sm">1</span>
                      : <span className={cn("text-sm font-medium", pos <= 3 ? "text-slate-300" : "text-slate-500")}>{pos}</span>
                    }
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                        isFirst ? "bg-gold/20 text-gold" : "bg-surface-border text-slate-400"
                      )}>
                        {team.name.charAt(0)}
                      </div>
                      <span className={cn("font-medium", isFirst ? "text-white" : "text-slate-300")}>
                        {team.name}
                      </span>
                    </div>
                  </td>
                  {[team.played, team.won, team.drawn, team.lost, team.gf, team.ga].map((val, i) => (
                    <td key={i} className="py-3 px-2 text-center text-slate-400">{val}</td>
                  ))}
                  <td className={cn("py-3 px-2 text-center font-medium text-sm",
                    team.gd > 0 ? "text-emerald-400" : team.gd < 0 ? "text-rose-400" : "text-slate-400"
                  )}>
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </td>
                  <td className={cn(
                    "py-3 px-2 text-center font-bold text-sm",
                    isFirst ? "text-gold" : "text-white"
                  )}>
                    {team.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}