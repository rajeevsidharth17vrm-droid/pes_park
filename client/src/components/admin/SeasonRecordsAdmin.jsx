import { useState } from "react"
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronUp, Save, X } from "lucide-react"
import { useSeasonRecords, useCreateSeasonRecord, useUpdateSeasonRecord, useDeleteSeasonRecord } from "../../lib/queries"
import { cn } from "../../lib/utils"

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i)

const EMPTY = {
  seasonNumber: "", seasonName: "", year: String(CURRENT_YEAR),
  customAwards: [{ title: "", winner: "" }],
  teamLeagueWinner: "",
  teamLeaguePlayers: [""],
  notes: ""
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-pitch-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
      />
    </div>
  )
}

function parseCustomAwards(record) {
  // Support both new custom_awards format and legacy fixed-field records
  if (record.custom_awards && Array.isArray(record.custom_awards) && record.custom_awards.length > 0) {
    return record.custom_awards
  }
  // Convert legacy fields to custom awards format
  const awards = []
  if (record.champion_team) awards.push({ title: "Champion Team", winner: `${record.champion_team}${record.champion_pts ? ` (${record.champion_pts} pts)` : ""}` })
  if (record.ballondor_winner) awards.push({ title: "Ballon d'Or", winner: record.ballondor_winner })
  if (record.top_scorer) awards.push({ title: "Golden Boot", winner: `${record.top_scorer}${record.top_scorer_goals ? ` (${record.top_scorer_goals} goals)` : ""}` })
  if (record.ucl_winner) awards.push({ title: "UCL Winner", winner: record.ucl_winner })
  if (record.highest_mv_player) awards.push({ title: "Highest MV", winner: `${record.highest_mv_player}${record.highest_mv ? ` (MV ${record.highest_mv})` : ""}` })
  if (record.longest_streak_player) awards.push({ title: "Longest Win Streak", winner: `${record.longest_streak_player}${record.longest_streak ? ` (${record.longest_streak} wins)` : ""}` })
  const weeklyWinners = Array.isArray(record.weekly_winners) ? record.weekly_winners.filter(Boolean) : []
  weeklyWinners.forEach((w, i) => awards.push({ title: `Weekly ${i + 1} Winner`, winner: w }))
  return awards.length > 0 ? awards : [{ title: "", winner: "" }]
}

function SeasonForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const initAwards = initial.customAwards?.length
    ? initial.customAwards
    : parseCustomAwards(initial)

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    customAwards: initAwards.length > 0 ? initAwards : [{ title: "", winner: "" }],
    teamLeaguePlayers: initial.teamLeaguePlayers?.length ? initial.teamLeaguePlayers : [""]
  })
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  function updateAward(idx, field, val) {
    const updated = [...form.customAwards]
    updated[idx] = { ...updated[idx], [field]: val }
    setForm(f => ({ ...f, customAwards: updated }))
  }

  function addAward() {
    setForm(f => ({ ...f, customAwards: [...f.customAwards, { title: "", winner: "" }] }))
  }

  function removeAward(idx) {
    setForm(f => ({ ...f, customAwards: f.customAwards.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Year</label>
          <select
            value={form.year}
            onChange={e => set("year")(e.target.value)}
            className="w-full bg-pitch-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Field label="Season Number" value={form.seasonNumber} onChange={set("seasonNumber")} type="number" placeholder="6" />
        <Field label="Season Name" value={form.seasonName} onChange={set("seasonName")} placeholder="Season 6" />
      </div>

      {/* Dynamic Awards */}
      <div className="border-t border-surface-border pt-3">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Awards & Winners</p>
        <div className="space-y-2">
          {form.customAwards.map((award, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={award.title}
                onChange={e => updateAward(idx, "title", e.target.value)}
                placeholder="Title (e.g. UCL Winner)"
                className="flex-1 bg-pitch-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
              />
              <input
                type="text"
                value={award.winner}
                onChange={e => updateAward(idx, "winner", e.target.value)}
                placeholder="Winner name"
                className="flex-1 bg-pitch-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
              />
              {form.customAwards.length > 1 && (
                <button
                  onClick={() => removeAward(idx)}
                  className="text-slate-600 hover:text-rose-400 transition-colors px-1 flex-shrink-0"
                >✕</button>
              )}
            </div>
          ))}
          <button
            onClick={addAward}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors mt-1"
          >
            <Plus className="w-3 h-3" /> Add award
          </button>
        </div>
      </div>

      {/* Team League — team name + squad players */}
      <div className="border-t border-surface-border pt-3">
        <div className="bg-pitch-800 border border-surface-border rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-3">Team League Winner</p>
          <Field label="Winning Team Name" value={form.teamLeagueWinner} onChange={set("teamLeagueWinner")} placeholder="Japan" />
          <div className="mt-3">
            <p className="text-xs text-slate-500 font-medium mb-2">Squad Players</p>
            <div className="space-y-2">
              {(form.teamLeaguePlayers || [""]).map((player, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-5 flex-shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={player}
                    onChange={e => {
                      const updated = [...(form.teamLeaguePlayers || [""])]
                      updated[idx] = e.target.value
                      set("teamLeaguePlayers")(updated)
                    }}
                    placeholder={`Player ${idx + 1} name`}
                    className="flex-1 bg-pitch-900 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors"
                  />
                  {(form.teamLeaguePlayers || [""]).length > 1 && (
                    <button
                      onClick={() => {
                        const updated = [...(form.teamLeaguePlayers || [""])]
                        updated.splice(idx, 1)
                        set("teamLeaguePlayers")(updated)
                      }}
                      className="text-slate-600 hover:text-rose-400 transition-colors px-1 flex-shrink-0"
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                onClick={() => set("teamLeaguePlayers")([...(form.teamLeaguePlayers || [""]), ""])}
                className="text-xs text-accent hover:text-accent/80 transition-colors mt-1"
              >
                + Add player
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 font-medium block mb-1">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any notable moments, upsets or records from this season..."
          rows={2}
          className="w-full bg-pitch-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-border text-slate-400 hover:text-white text-sm transition-colors">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.seasonNumber || !form.seasonName}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Season Record"}
        </button>
      </div>
    </div>
  )
}

function SeasonCard({ record, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const awards = parseCustomAwards(record)
  const squadPlayers = Array.isArray(record.team_league_players)
    ? record.team_league_players.filter(Boolean) : []

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-gold flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-white text-sm">{record.season_name}</p>
            <p className="text-xs text-slate-500">{record.year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onEdit(record) }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-surface-border transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(record.id) }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-surface-border pt-3 space-y-3">
          {/* Custom Awards */}
          {awards.filter(a => a.title && a.winner).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Awards</p>
              <div className="space-y-1.5">
                {awards.filter(a => a.title && a.winner).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{a.title}</span>
                    <span className="font-semibold text-white">{a.winner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team League */}
          {record.team_league_winner && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Team League</p>
              <p className="text-sm font-semibold text-white">{record.team_league_winner}</p>
              {squadPlayers.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Squad: {squadPlayers.join(", ")}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Notes</p>
              <p className="text-sm text-slate-300">{record.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SeasonRecordsAdmin() {
  const { data: records = [], isLoading } = useSeasonRecords()
  const createRecord = useCreateSeasonRecord()
  const updateRecord = useUpdateSeasonRecord()
  const deleteRecord = useDeleteSeasonRecord()

  const [mode, setMode]       = useState(null) // "create" | "edit"
  const [editing, setEditing] = useState(null)

  function handleSave(form) {
    const payload = {
      seasonNumber: parseInt(form.seasonNumber),
      seasonName:   form.seasonName,
      year:         parseInt(form.year),
      customAwards: (form.customAwards || []).filter(a => a.title || a.winner),
      teamLeagueWinner: form.teamLeagueWinner || null,
      teamLeaguePlayers: (form.teamLeaguePlayers || []).filter(Boolean),
      notes: form.notes || null,
    }
    if (mode === "edit" && editing) {
      updateRecord.mutate({ id: editing.id, ...payload }, { onSuccess: () => { setMode(null); setEditing(null) } })
    } else {
      createRecord.mutate(payload, { onSuccess: () => { setMode(null) } })
    }
  }

  function handleEdit(record) {
    setEditing({
      ...record,
      seasonNumber: record.season_number,
      seasonName:   record.season_name,
      teamLeagueWinner: record.team_league_winner,
      teamLeaguePlayers: record.team_league_players,
      customAwards: parseCustomAwards(record),
    })
    setMode("edit")
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          <div>
            <h2 className="font-bold text-white">Season Records</h2>
            <p className="text-xs text-slate-500">— shown on Hall of Fame page</p>
          </div>
        </div>
        {!mode && (
          <button onClick={() => setMode("create")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Season
          </button>
        )}
      </div>

      {mode && (
        <div className="card p-5 mb-5">
          <p className="text-sm font-semibold text-white mb-4">
            {mode === "edit" ? "Edit Season Record" : "Add New Season Record"}
          </p>
          <SeasonForm
            initial={mode === "edit" ? editing : EMPTY}
            onSave={handleSave}
            onCancel={() => { setMode(null); setEditing(null) }}
            saving={createRecord.isPending || updateRecord.isPending}
          />
        </div>
      )}

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && records.length === 0 && !mode && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No season records yet</p>
            <p className="text-slate-600 text-xs mt-1">Add a season record to populate the Hall of Fame</p>
          </div>
        )}
        {records.map(r => (
          <SeasonCard key={r.id} record={r} onEdit={handleEdit} onDelete={id => deleteRecord.mutate(id)} />
        ))}
      </div>
    </div>
  )
}