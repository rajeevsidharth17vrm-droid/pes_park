import { query } from "../db/pool.js"

// Rebuilds a player's "Recent Form" (last 5 results) directly from
// match_records — across ALL match types (league, ucl, weekly), not just
// one. When the player was the opponent_id, the result is flipped
// (win -> loss, loss -> win) since match_records is stored from the
// player_id side.
//
// Each game is counted once: records where the player is player_id are
// always included; opponent_id records are only included if no reverse
// record exists, which prevents the same game from appearing twice when
// both teams log their side of the same matchup.
export async function recalcForm(playerId) {
  const res = await query(`
    SELECT
      CASE
        WHEN player_id = $1 THEN result
        WHEN result = 'win'  THEN 'loss'
        WHEN result = 'loss' THEN 'win'
        ELSE 'draw'
      END AS result
    FROM match_records mr
    WHERE (
      player_id = $1
      OR (
        opponent_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM match_records r2
          WHERE r2.player_id   = $1
            AND r2.opponent_id = mr.player_id
            AND r2.match_type  = mr.match_type
        )
      )
    )
    ORDER BY recorded_at DESC, id DESC
    LIMIT 5
  `, [playerId])
  const form = res.rows.map(r => r.result === "win" ? "W" : r.result === "draw" ? "D" : "L")
  await query("UPDATE players SET form = $1 WHERE id = $2", [form, playerId])
}