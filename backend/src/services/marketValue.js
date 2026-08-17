/**
 * marketValue.js — NEW simple flat-rate market value calculation.
 *
 * Per match, from the player's perspective:
 *   Win:  MV +15, BDR +5, Best Player +3
 *   Draw: MV  0,  BDR +1, Best Player +1
 *   Loss: MV -10, BDR -3, Best Player  0
 *   Per goal scored: MV +3, BDR +1, Best Player 0
 *
 * Market value is recalculated from scratch (sum of all match deltas for
 * the current season), floored at 0. BDR and best_player_points are
 * applied incrementally per match (see records route).
 *
 * Deduplication rule (applies to all recalc functions):
 *   Each actual game is counted ONCE from the player's perspective.
 *   - Records where they are player_id are always counted.
 *   - Records where they are opponent_id are only counted if no reverse
 *     record exists (handles admin-logged single records; skips the mirror
 *     record created when the opposing team also logs their side).
 */
import { query } from "../db/pool.js"

// ── Flat delta tables ────────────────────────────────────────────────────────
export const MV_DELTA  = { win: 15, draw: 0, loss: -10 }
export const BDR_DELTA = { win: 5,  draw: 1, loss: -3  }
export const BP_DELTA  = { win: 3,  draw: 1, loss: 0 }

export const MV_PER_GOAL  = 3
export const BDR_PER_GOAL = 1
export const BP_PER_GOAL  = 0  // goals don't count for best player (counted in golden boot)

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getCurrentSeason() {
  const r = await query("SELECT value FROM app_settings WHERE key = 'current_season'")
  return parseInt(r.rows[0]?.value || "1")
}

/**
 * Compute the MV delta for a single match from one player's perspective.
 */
export function matchMvDelta(result, goalsScored) {
  return (MV_DELTA[result] ?? 0) + (goalsScored ?? 0) * MV_PER_GOAL
}

/**
 * Compute the BDR delta for a single match from one player's perspective.
 */
export function matchBdrDelta(result, goalsScored) {
  return (BDR_DELTA[result] ?? 0) + (goalsScored ?? 0) * BDR_PER_GOAL
}

/**
 * Compute the Best Player delta for a single match from one player's perspective.
 */
export function matchBpDelta(result) {
  return BP_DELTA[result] ?? 0
}

// Shared dedup WHERE clause: count each actual game exactly once.
// player_id records always count; opponent_id records only count when no
// reverse record exists (prevents double-counting when both teams log).
const DEDUP_WHERE = (seasonFilter = true) => `
  AND (
    player_id = $1
    OR (
      opponent_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM match_records r2
        WHERE r2.player_id    = $1
          AND r2.opponent_id  = mr.player_id
          AND r2.match_type   = mr.match_type
          ${seasonFilter ? "AND r2.season_number = mr.season_number" : ""}
      )
    )
  )
`

/**
 * Recalculates and persists a player's market_value from ALL their match
 * records in the current season. Pure sum of flat deltas, floored at 0.
 */
export async function recalcMarketValue(playerId) {
  const currentSeason = await getCurrentSeason()

  const matchesRes = await query(
    `SELECT
       CASE
         WHEN player_id = $1 THEN result
         WHEN result = 'win'  THEN 'loss'
         WHEN result = 'loss' THEN 'win'
         ELSE 'draw'
       END AS result,
       CASE
         WHEN player_id = $1 THEN player_score
         ELSE opponent_score
       END AS goals
     FROM match_records mr
     WHERE season_number = $2
     ${DEDUP_WHERE(true)}`,
    [playerId, currentSeason]
  )

  let totalMv = 0
  for (const m of matchesRes.rows) {
    totalMv += matchMvDelta(m.result, m.goals ?? 0)
  }

  const finalMv = Math.max(0, totalMv)
  await query("UPDATE players SET market_value = $1 WHERE id = $2", [finalMv, playerId])
}

/**
 * Recalculates a player's best_player_points and best_player_matches
 * from their LEAGUE (Auction Tour) match records only in the current season.
 */
export async function recalcBestPlayer(playerId) {
  const currentSeason = await getCurrentSeason()

  const matchesRes = await query(
    `SELECT
       CASE
         WHEN player_id = $1 THEN result
         WHEN result = 'win'  THEN 'loss'
         WHEN result = 'loss' THEN 'win'
         ELSE 'draw'
       END AS result
     FROM match_records mr
     WHERE season_number = $2
       AND match_type = 'league'
     ${DEDUP_WHERE(true)}`,
    [playerId, currentSeason]
  )

  let totalBp = 0
  const totalMatches = matchesRes.rows.length
  for (const m of matchesRes.rows) {
    totalBp += matchBpDelta(m.result)
  }

  await query(
    "UPDATE players SET best_player_points = COALESCE($1, 0), best_player_matches = COALESCE($2, 0) WHERE id = $3",
    [totalBp, totalMatches, playerId]
  )
}

/**
 * Recalculates a player's bdr_points from ALL their match records in
 * the current season. Floored at 0. NOTE: this only covers match-based
 * BDR — tournament BDR (quick tournament awards etc.) is added separately
 * via addBdr() and is NOT included here. Call this only for full recalcs
 * (admin bulk recalc, season reset), not after individual matches —
 * individual matches use incremental addBdr() to preserve tournament BDR.
 */
export async function recalcBdrFromMatches(playerId) {
  const currentSeason = await getCurrentSeason()

  const matchesRes = await query(
    `SELECT
       CASE
         WHEN player_id = $1 THEN result
         WHEN result = 'win'  THEN 'loss'
         WHEN result = 'loss' THEN 'win'
         ELSE 'draw'
       END AS result,
       CASE
         WHEN player_id = $1 THEN player_score
         ELSE opponent_score
       END AS goals
     FROM match_records mr
     WHERE season_number = $2
     ${DEDUP_WHERE(true)}`,
    [playerId, currentSeason]
  )

  let totalBdr = 0
  for (const m of matchesRes.rows) {
    totalBdr += matchBdrDelta(m.result, m.goals ?? 0)
  }

  await query(
    "UPDATE players SET bdr_points = GREATEST(0, $1) WHERE id = $2",
    [totalBdr, playerId]
  )
}