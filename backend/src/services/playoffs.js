// services/playoffs.js
import { query } from "../db/pool.js"

// Generates the Team League playoff bracket from the current top-5
// standings:
//   Qualifier 1  — 1st v 2nd    (winner goes straight to the Final)
//   Eliminator   — 4th v 5th    (loser is eliminated, 5th place)
//   Knockout Rd  — 3rd v Eliminator winner (loser is eliminated, 4th place)
//   Qualifier 2  — Qualifier 1 loser v Knockout Round winner (winner reaches the Final)
//   Final        — Qualifier 1 winner v Qualifier 2 winner
// Qualifier 1, Eliminator, and the Knockout Round's team1 (3rd place) are
// known immediately from final standings; everything else fills in as
// results come in. Returns true if it actually generated something, false
// if playoffs already exist for this season or there aren't 5 teams yet.
// Shared between the manual admin endpoint and the automatic trigger that
// fires the instant the group stage finishes, so both stay identical.
export async function generatePlayoffs(season) {
  const existing = await query("SELECT id FROM team_league_playoffs WHERE season_number = $1 LIMIT 1", [season])
  if (existing.rows.length > 0) return false

  const standings = await query("SELECT id FROM teams ORDER BY score_points DESC LIMIT 5")
  if (standings.rows.length < 5) return false

  const [first, second, third, fourth, fifth] = standings.rows.map(r => r.id)

  await query(
    "INSERT INTO team_league_playoffs (season_number, match_type, team1_id, team2_id) VALUES ($1,'qualifier1',$2,$3)",
    [season, first, second]
  )
  await query(
    "INSERT INTO team_league_playoffs (season_number, match_type, team1_id, team2_id) VALUES ($1,'eliminator',$2,$3)",
    [season, fourth, fifth]
  )
  await query(
    "INSERT INTO team_league_playoffs (season_number, match_type, team1_id) VALUES ($1,'knockout',$2)",
    [season, third]
  )
  await query("INSERT INTO team_league_playoffs (season_number, match_type) VALUES ($1,'qualifier2')", [season])
  await query("INSERT INTO team_league_playoffs (season_number, match_type) VALUES ($1,'final')", [season])
  return true
}