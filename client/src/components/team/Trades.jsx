import { useState } from "react"
import { ArrowLeftRight, Clock, CheckCircle, XCircle } from "lucide-react"
import GradeBadge from "../common/GradeBadge"
import { cn } from "../../lib/utils"

const statusConfig = {
  pending:  { icon: Clock,         color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/25",  label: "Pending"  },
  approved: { icon: CheckCircle,   color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25",label: "Approved"},
  rejected: { icon: XCircle,       color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/25",    label: "Rejected" },
}

function TradeRow({ trade }) {
  const cfg = statusConfig[trade.status]
  const Icon = cfg.icon

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors">
      <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center flex-shrink-0">
        <ArrowLeftRight className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white">{trade.playerName}</span>
          <GradeBadge grade={trade.playerGrade} />
        </div>
        <p className="text-xs text-slate-500 truncate">
          {trade.direction === "sent"
            ? <>{trade.fromTeam} <span className="text-slate-600 mx-1">→</span> {trade.toTeam}</>
            : <>{trade.fromTeam} <span className="text-accent mx-1">wants your player</span></>
          }
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border",
          cfg.bg, cfg.color
        )}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
        <p className="text-xs text-slate-600 mt-1">{trade.requestedOn}</p>
      </div>
    </div>
  )
}

export default function Trades({ trades }) {
  const [tab, setTab] = useState("sent")

  const sent     = trades.filter(t => t.direction === "sent")
  const received = trades.filter(t => t.direction === "received")
  const shown    = tab === "sent" ? sent : received

  const pendingReceived = received.filter(t => t.status === "pending").length

  return (
    <div>
      {/* Tab toggle */}
      <div className="flex items-center gap-1 mb-5 bg-pitch-800 border border-surface-border rounded-xl p-1 w-fit">
        {[
          { id: "sent",     label: "Sent",     count: sent.length },
          { id: "received", label: "Received", count: received.length, alert: pendingReceived },
        ].map(({ id, label, count, alert }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-surface text-white border border-surface-border"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-md font-semibold",
              alert ? "bg-amber-400/20 text-amber-400" : "bg-surface-border text-slate-500"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Trade list */}
      <div className="card overflow-hidden">
        {shown.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500 text-sm">No {tab} trade requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/60">
            {shown.map(t => <TradeRow key={t.id} trade={t} />)}
          </div>
        )}
      </div>

      {/* Notice for pending received */}
      {tab === "received" && pendingReceived > 0 && (
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          {pendingReceived} incoming request{pendingReceived > 1 ? "s" : ""} pending admin review — you'll be notified if approved.
        </p>
      )}
    </div>
  )
}
