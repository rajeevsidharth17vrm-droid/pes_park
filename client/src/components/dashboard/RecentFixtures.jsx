import { cn } from "../../lib/utils"

const Result = ({ home, away }) => {
  if (home > away) return <span className="text-xs font-semibold text-emerald-400">H</span>
  if (home < away) return <span className="text-xs font-semibold text-rose-400">A</span>
  return <span className="text-xs font-semibold text-amber-400">D</span>
}

export default function RecentFixtures({ fixtures }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <p className="section-label mb-0.5">Recent results</p>
        <h2 className="text-base font-semibold text-white">Latest fixtures</h2>
      </div>

      <div className="divide-y divide-surface-border/60">
        {fixtures.map((f) => (
          <div key={f.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors">
            <span className="text-xs text-slate-600 w-12 flex-shrink-0">{f.date}</span>
            <div className="flex-1 flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium text-right flex-1 truncate",
                f.homeScore > f.awayScore ? "text-white" : "text-slate-400"
              )}>
                {f.home}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn(
                  "text-sm font-bold font-mono w-5 text-center",
                  f.homeScore > f.awayScore ? "text-white" : "text-slate-400"
                )}>
                  {f.homeScore}
                </span>
                <span className="text-slate-600 text-xs">–</span>
                <span className={cn(
                  "text-sm font-bold font-mono w-5 text-center",
                  f.awayScore > f.homeScore ? "text-white" : "text-slate-400"
                )}>
                  {f.awayScore}
                </span>
              </div>
              <span className={cn(
                "text-sm font-medium flex-1 truncate",
                f.awayScore > f.homeScore ? "text-white" : "text-slate-400"
              )}>
                {f.away}
              </span>
            </div>
            <Result home={f.homeScore} away={f.awayScore} />
          </div>
        ))}
      </div>
    </div>
  )
}
