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

  // Use live-computed points from match_records (same logic as GET /api/teams),
  // NOT score_points which is only updated when a fixture is manually closed.
  const standings = await query(`
    WITH fixture_scores AS (
      SELECT
        f.id, f.home_team_id, f.away_team_id,
        CASE
          WHEN f.status = 'completed' THEN COALESCE(f.home_score, 0)
          ELSE SUM(CASE
            WHEN COALESCE(mr.team_id, p.team_id) = f.home_team_id THEN CASE mr.result WHEN 'win' THEN 3 WHEN 'draw' THEN 1 ELSE 0 END
            WHEN COALESCE(mr.team_id, p.team_id) = f.away_team_id THEN CASE mr.result WHEN 'loss' THEN 3 WHEN 'draw' THEN 1 ELSE 0 END
            ELSE 0 END)
        END AS home_pts,
        CASE
          WHEN f.status = 'completed' THEN COALESCE(f.away_score, 0)
          ELSE SUM(CASE
            WHEN COALESCE(mr.team_id, p.team_id) = f.away_team_id THEN CASE mr.result WHEN 'win' THEN 3 WHEN 'draw' THEN 1 ELSE 0 END
            WHEN COALESCE(mr.team_id, p.team_id) = f.home_team_id THEN CASE mr.result WHEN 'loss' THEN 3 WHEN 'draw' THEN 1 ELSE 0 END
            ELSE 0 END)
        END AS away_pts,
        CASE
          WHEN f.status = 'completed' THEN COALESCE(f.home_goals, 0)
          ELSE COALESCE(SUM(CASE WHEN COALESCE(mr.team_id, p.team_id) = f.home_team_id THEN mr.player_score WHEN COALESCE(mr.team_id, p.team_id) = f.away_team_id THEN mr.opponent_score ELSE 0 END), 0)
        END AS home_goals,
        CASE
          WHEN f.status = 'completed' THEN COALESCE(f.away_goals, 0)
          ELSE COALESCE(SUM(CASE WHEN COALESCE(mr.team_id, p.team_id) = f.away_team_id THEN mr.player_score WHEN COALESCE(mr.team_id, p.team_id) = f.home_team_id THEN mr.opponent_score ELSE 0 END), 0)
        END AS away_goals,
        CASE WHEN f.status = 'completed' THEN 1 ELSE COUNT(mr.id) END AS results_logged
      FROM fixtures f
      LEFT JOIN match_records mr ON mr.fixture_id = f.id AND mr.match_type = 'league' AND mr.season_number = $1
      LEFT JOIN players p ON p.id = mr.player_id
      GROUP BY f.id, f.home_team_id, f.away_team_id, f.status, f.home_score, f.away_score, f.home_goals, f.away_goals
    ),
    fixture_outcomes AS (
      SELECT *,
        CASE
          WHEN results_logged = 0 THEN NULL
          WHEN home_pts > away_pts THEN 'home'
          WHEN away_pts > home_pts THEN 'away'
          ELSE 'draw'
        END AS outcome
      FROM fixture_scores
    ),
    per_team AS (
      SELECT home_team_id AS team_id, home_goals AS gf, away_goals AS ga, home_pts AS pts
        FROM fixture_outcomes WHERE outcome IS NOT NULL
      UNION ALL
      SELECT away_team_id AS team_id, away_goals AS gf, home_goals AS ga, away_pts AS pts
        FROM fixture_outcomes WHERE outcome IS NOT NULL
    ),
    team_stats AS (
      SELECT team_id,
        COALESCE(SUM(gf), 0) AS gf,
        COALESCE(SUM(ga), 0) AS ga,
        COALESCE(SUM(pts), 0) AS points
      FROM per_team GROUP BY team_id
    )
    SELECT t.id
    FROM teams t
    LEFT JOIN team_stats ts ON ts.team_id = t.id
    ORDER BY COALESCE(ts.points, 0) DESC,
             COALESCE(ts.gf, 0) - COALESCE(ts.ga, 0) DESC,
             COALESCE(ts.gf, 0) DESC
    LIMIT 5
  `, [season])
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