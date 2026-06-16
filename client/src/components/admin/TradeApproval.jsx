import { useState } from "react"
import { Check, X, ArrowLeftRight, CheckCircle, XCircle } from "lucide-react"
import GradeBadge from "../common/GradeBadge"
import { useReviewTrade } from "../../lib/queries"
import { getMVTier, cn } from "../../lib/utils"

function TradeCard({ trade }) {
  const [decided, setDecided]   = useState(false)
  const [decision, setDecision] = useState(null)
  const reviewTrade             = useReviewTrade()
  const tier                    = getMVTier(trade.playerMV)

  const handleDecide = (action) => {
    reviewTrade.mutate({ id: trade.id, action }, {
      onSuccess: () => { setDecision(action); setDecided(true) },
      onError: (err) => alert(err.response?.data?.error || "Action failed"),
    })
  }

  return (
    <div className={cn("card p-5 transition-all",
      !decided&&"hover:border-accent/20",
      decided&&decision==="approved"&&"border-emerald-400/25 bg-emerald-400/5",
      decided&&decision==="rejected"&&"border-rose-400/25 bg-rose-400/5",
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500">Trade request · {trade.requestedOn ? new Date(trade.requestedOn).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—"}</span>
        </div>
        {decided && (
          <span className={cn("flex items-center gap-1 text-xs font-bold", decision==="approved"?"text-emerald-400":"text-rose-400")}>
            {decision==="approved"?<><CheckCircle className="w-3.5 h-3.5"/>Approved</>:<><XCircle className="w-3.5 h-3.5"/>Rejected</>}
          </span>
        )}
      </div>
      <div className="bg-pitch-800 rounded-xl p-4 border border-surface-border mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-border flex items-center justify-center text-sm font-bold text-slate-400">
            {trade.playerName.split(" ").map(n=>n[0]).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-white text-sm">{trade.playerName}</span>
              <GradeBadge grade={trade.playerGrade} />
            </div>
            <span className={cn("text-xs",tier.color)}>{tier.label} · MV {trade.playerMV}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-slate-500 mb-0.5">From</p>
          <p className="text-sm font-medium text-white truncate">{trade.fromTeam}</p>
        </div>
        <ArrowLeftRight className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 bg-pitch-800 border border-surface-border rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-slate-500 mb-0.5">To</p>
          <p className="text-sm font-medium text-white truncate">{trade.toTeam}</p>
        </div>
      </div>
      {!decided ? (
        <div className="flex gap-3">
          <button onClick={() => handleDecide("rejected")} disabled={reviewTrade.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-400/30 text-rose-400 text-sm font-semibold hover:bg-rose-400/10 transition-colors disabled:opacity-50">
            <X className="w-4 h-4" /> Reject
          </button>
          <button onClick={() => handleDecide("approved")} disabled={reviewTrade.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
            <Check className="w-4 h-4" /> Approve
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          {decision==="approved"?"Player transfer completed.":"Request rejected."}
        </p>
      )}
    </div>
  )
}

export default function TradeApproval({ trades }) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-5">Approving a trade immediately transfers the player to the requesting team.</p>
      {trades.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 text-sm">No pending trade requests.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {trades.map(t => <TradeCard key={t.id} trade={t} />)}
        </div>
      )}
    </div>
  )
}