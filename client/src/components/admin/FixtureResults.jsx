import { useState } from "react"
import { Check, Lock } from "lucide-react"
import { useSaveFixtureResult } from "../../lib/queries"
import { cn } from "../../lib/utils"

function ScoreInput({ value, onChange, disabled }) {
  return (
    <input type="number" min={0} max={20} value={value ?? ""} onChange={e => onChange(Math.max(0, parseInt(e.target.value)||0))} disabled={disabled}
      className="w-12 text-center bg-pitch-800 border border-surface-border rounded-lg py-2 text-lg font-bold font-mono text-white focus:outline-none focus:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed" />
  )
}

function FixtureCard({ fixture }) {
  const saveResult             = useSaveFixtureResult()
  const isCompleted            = fixture.status === "completed"
  const [hs, setHs]            = useState(fixture.homeScore ?? "")
  const [as_, setAs]           = useState(fixture.awayScore ?? "")
  const [saved, setSaved]      = useState(isCompleted)
  const winner = saved ? (hs>as_?"home":hs<as_?"away":"draw") : null
  const canSave = hs !== "" && as_ !== "" && !saved

  const handleSave = () => {
    saveResult.mutate({ id: fixture.id, homeScore: parseInt(hs), awayScore: parseInt(as_) }, {
      onSuccess: () => setSaved(true),
      onError: (err) => alert(err.response?.data?.error || "Failed to save result"),
    })
  }

  return (
    <div className={cn("card p-5 transition-all", saved&&"border-accent/20")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Round {fixture.round}</span>
          <span className="text-slate-700">·</span>
          <span className="text-xs text-slate-500">{fixture.date ? new Date(fixture.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—"}</span>
        </div>
        {saved
          ? <span className="flex items-center gap-1 text-xs font-semibold text-accent"><Check className="w-3 h-3" /> Saved</span>
          : <span className="text-xs text-amber-400 font-medium">Pending result</span>
        }
      </div>
      <div className="flex items-center gap-3">
        <div className={cn("flex-1 text-right", winner==="home"&&"text-white", winner==="away"&&"text-slate-500")}>
          <p className="text-sm font-semibold">{fixture.home}</p>
          <p className="text-xs text-accent mt-0.5">Home</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreInput value={hs} onChange={setHs} disabled={saved} />
          <span className="text-slate-600 font-bold text-lg">–</span>
          <ScoreInput value={as_} onChange={setAs} disabled={saved} />
        </div>
        <div className={cn("flex-1", winner==="away"&&"text-white", winner==="home"&&"text-slate-500")}>
          <p className="text-sm font-semibold">{fixture.away}</p>
          <p className="text-xs text-slate-500 mt-0.5">Away</p>
        </div>
      </div>
      {!saved ? (
        <button onClick={handleSave} disabled={!canSave || saveResult.isPending}
          className={cn("mt-4 w-full py-2 rounded-lg text-sm font-semibold transition-all", canSave?"bg-accent hover:bg-accent-dim text-white":"bg-surface-border text-slate-600 cursor-not-allowed")}>
          {saveResult.isPending ? "Saving…" : "Save result"}
        </button>
      ) : isCompleted && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <Lock className="w-3 h-3" /> Result locked
        </div>
      )}
    </div>
  )
}

export default function FixtureResults({ fixtures }) {
  const upcoming  = fixtures.filter(f => f.status === "upcoming")
  const completed = fixtures.filter(f => f.status === "completed")

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <p className="section-label mb-4">Enter results</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map(f => <FixtureCard key={f.id} fixture={f} />)}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <p className="section-label mb-4">Completed fixtures</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completed.map(f => <FixtureCard key={f.id} fixture={f} />)}
          </div>
        </div>
      )}
      {fixtures.length === 0 && (
        <div className="card py-16 text-center text-slate-500 text-sm">No fixtures created yet.</div>
      )}
    </div>
  )
}