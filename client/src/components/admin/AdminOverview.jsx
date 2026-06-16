import { ArrowLeftRight, Users, Activity, Calendar, Clock } from "lucide-react"
import { cn } from "../../lib/utils"

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "card p-5 text-left w-full transition-all",
        onClick && "hover:border-accent/30 cursor-pointer",
        !onClick && "cursor-default"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accent)}>
          <Icon className="w-4 h-4" />
        </div>
        {onClick && (
          <span className="text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View →
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold font-mono text-white mb-0.5">{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </button>
  )
}

export default function AdminOverview({ stats, activity, onNavigate }) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={ArrowLeftRight}
          label="Pending trade requests"
          value={stats.pendingTrades}
          sub="Need your decision"
          accent="bg-amber-400/15 text-amber-400"
          onClick={() => onNavigate("trades")}
        />
        <StatCard
          icon={Users}
          label="Total players"
          value={stats.totalPlayers}
          sub="Across all teams"
          accent="bg-accent/15 text-accent"
        />
        <StatCard
          icon={Activity}
          label="Match records logged"
          value={stats.matchesLogged}
          sub="This season"
          accent="bg-violet-400/15 text-violet-400"
          onClick={() => onNavigate("records")}
        />
        <StatCard
          icon={Calendar}
          label="Upcoming fixtures"
          value={stats.upcomingFixtures}
          sub="Awaiting results"
          accent="bg-blue-400/15 text-blue-400"
          onClick={() => onNavigate("fixtures")}
        />
      </div>

      {/* Pending trades alert */}
      {stats.pendingTrades > 0 && (
        <div className="flex items-center justify-between bg-amber-400/8 border border-amber-400/20 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-medium text-amber-300">
              {stats.pendingTrades} trade request{stats.pendingTrades > 1 ? "s" : ""} waiting for approval
            </p>
          </div>
          <button
            onClick={() => onNavigate("trades")}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Review now →
          </button>
        </div>
      )}

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Recent activity</h2>
        </div>
        <div className="divide-y divide-surface-border/50">
          {activity.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/50 flex-shrink-0" />
                <span className="text-sm text-slate-300">{item.text}</span>
              </div>
              <span className="text-xs text-slate-600 flex-shrink-0 ml-4">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
