import { X, ArrowLeftRight, AlertCircle } from "lucide-react"
import GradeBadge from "../common/GradeBadge"
import { cn } from "../../lib/utils"

export default function TradeModal({ player, onConfirm, onClose }) {
  if (!player) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.85)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card-raised w-full max-w-md border border-surface-border rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <span className="font-semibold text-white text-sm">Trade request</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player info */}
        <div className="p-5">
          <div className="bg-pitch-800 rounded-xl p-4 flex items-center gap-4 mb-5 border border-surface-border">
            <div className="w-11 h-11 rounded-xl bg-surface-border flex items-center justify-center text-sm font-bold text-slate-400 flex-shrink-0">
              {player.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-white text-sm">{player.name}</span>
                <GradeBadge grade={player.grade} />
              </div>
              <p className="text-xs text-slate-500">{player.team}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500 mb-0.5">Market value</p>
              <p className="font-bold font-mono text-accent text-sm">{player.marketValue}</p>
            </div>
          </div>

          {/* Notice */}
          <div className="flex gap-2.5 bg-amber-400/8 border border-amber-400/20 rounded-xl p-3.5 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Pending admin approval</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your request will be sent to the admin for review. The opposing team will be notified if approved.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(player)}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Send request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
