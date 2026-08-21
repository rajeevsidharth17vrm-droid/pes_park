// services/bdrAwards.js
// BDR is now purely a tournament/placement achievement award.
// NO BDR comes from individual match results.
//
// League Playoff (based on knockout final standings):
//   1st  → 12 pts (all players on the winning team)
//   2nd  → 9 pts
//   3rd  → 7 pts
//   4th  → 5 pts
//   5th  → 4 pts
//
// Weekly Tournament:
//   Winner       → 10 pts
//   Runner-up    → 8 pts
//   Semi-final   → 5 pts
//   Quarter-final → 3 pts
//   Golden Boot  → 4 pts (top scorer, separate — can stack)
//
// UCL Knockout:
//   Winner       → 15 pts
//   Runner-up    → 12 pts
//   Semi-final   → 8 pts
//   Quarter-final → 4 pts
//   Golden Boot  → 6 pts
import { query } from "../db/pool.js"

// ── Point tables ─────────────────────────────────────────────────────────────
export const LEAGUE_PLAYOFF_BDR = { 1: 12, 2: 9, 3: 7, 4: 5, 5: 4 }

export const WEEKLY_BDR = {
  winner: 10, runner: 8, semi: 5, quarter: 3, golden_boot: 4,
}

export const UCL_KNOCKOUT_BDR = {
  winner: 15, runner: 12, semi: 8, quarter: 4, golden_boot: 6,
}

// ── claimAward ───────────────────────────────────────────────────────────────
// One-time idempotent award slot. Returns true the FIRST time called for
// (awardType, referenceId), false on every subsequent call. Safe for
// concurrent callers via ON CONFLICT DO NOTHING.
export async function claimAward(awardType, referenceId) {
  const result = await query(
    `INSERT INTO bdr_awards_log (award_type, reference_id) VALUES ($1, $2)
     ON CONFLICT (award_type, reference_id) DO NOTHING
     RETURNING id`,
    [awardType, String(referenceId)]
  )
  return result.rows.length > 0
}

// ── addBdr ───────────────────────────────────────────────────────────────────
// Adds BDR points to a single player, floored at 0.
export async function addBdr(playerId, delta) {
  if (!playerId || !delta) return
  await query(
    `UPDATE players SET bdr_points = GREATEST(0, bdr_points + $1) WHERE id = $2`,
    [delta, playerId]
  )
}

// ── awardBdrToTeam ───────────────────────────────────────────────────────────
// Awards BDR to every player currently on a team.
// Uses claimAward(awardType, referenceId) to prevent double-awarding.
// referenceId should be unique per season + placement (e.g. "2_1st").
async function awardBdrToTeam(teamId, points, awardType, referenceId) {
  const claimed = await claimAward(awardType, referenceId)
  if (!claimed) return  // already paid out
  const players = await query("SELECT id FROM players WHERE team_id = $1", [teamId])
  for (const p of players.rows) {
    await addBdr(p.id, points)
  }
}

// ── awardLeaguePlayoffBdr ────────────────────────────────────────────────────
// Called from PATCH /api/teams/playoffs/:id/result whenever a playoff match
// completes. Awards BDR to all players on the relevant team(s) based on
// which placement is determined by THIS match.
//
//   eliminator loser  → 5th place
//   knockout   loser  → 4th place
//   qualifier2 loser  → 3rd place
//   final      loser  → 2nd place, winner → 1st place
export async function awardLeaguePlayoffBdr(matchType, winnerId, loserId, season) {
  const ref = season  // unique per season; each placement only happens once
  if (matchType === "eliminator") {
    await awardBdrToTeam(loserId,  LEAGUE_PLAYOFF_BDR[5], "league_playoff_5th", ref)
  } else if (matchType === "knockout") {
    await awardBdrToTeam(loserId,  LEAGUE_PLAYOFF_BDR[4], "league_playoff_4th", ref)
  } else if (matchType === "qualifier2") {
    await awardBdrToTeam(loserId,  LEAGUE_PLAYOFF_BDR[3], "league_playoff_3rd", ref)
  } else if (matchType === "final") {
    await awardBdrToTeam(winnerId, LEAGUE_PLAYOFF_BDR[1], "league_playoff_1st", ref)
    await awardBdrToTeam(loserId,  LEAGUE_PLAYOFF_BDR[2], "league_playoff_2nd", ref)
  }
}

// ── awardWeeklyTournamentBdr ─────────────────────────────────────────────────
// Called when a weekly tournament completes. Awards BDR to each player
// based on the furthest round they reached, then awards golden boot.
//
// Round placement relative to total_rounds:
//   total_rounds - round = 0 → Final  (winner + runner)
//   total_rounds - round = 1 → Semi-final loser
//   total_rounds - round = 2 → Quarter-final loser
//   anything further back     → no BDR
export async function awardWeeklyTournamentBdr(tournamentId) {
  const tRes = await query(
    "SELECT total_rounds FROM weekly_tournaments WHERE id = $1",
    [tournamentId]
  )
  const totalRounds = tRes.rows[0]?.total_rounds
  if (!totalRounds) return

  const matches = await query(`
    SELECT round, player1_id, player2_id, winner_id, match_record_id
    FROM weekly_tournament_matches
    WHERE tournament_id = $1 AND status = 'completed' AND winner_id IS NOT NULL
    ORDER BY round ASC
  `, [tournamentId])

  for (const m of matches.rows) {
    const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id
    if (!loserId) continue

    const depth = totalRounds - m.round  // 0=Final, 1=SF, 2=QF

    if (depth === 0) {
      // Final — award winner and runner
      const wClaimed = await claimAward("weekly_bdr", `${tournamentId}_${m.winner_id}`)
      if (wClaimed) await addBdr(m.winner_id, WEEKLY_BDR.winner)
      const rClaimed = await claimAward("weekly_bdr", `${tournamentId}_${loserId}`)
      if (rClaimed) await addBdr(loserId, WEEKLY_BDR.runner)
    } else if (depth === 1) {
      const claimed = await claimAward("weekly_bdr", `${tournamentId}_${loserId}`)
      if (claimed) await addBdr(loserId, WEEKLY_BDR.semi)
    } else if (depth === 2) {
      const claimed = await claimAward("weekly_bdr", `${tournamentId}_${loserId}`)
      if (claimed) await addBdr(loserId, WEEKLY_BDR.quarter)
    }
    // depth >= 3: R16 or earlier — no BDR
  }

  // Golden boot — player with the most goals across all matches in this tournament
  const gb = await query(`
    SELECT mr.player_id, SUM(mr.player_score) AS goals
    FROM match_records mr
    JOIN weekly_tournament_matches wtm ON wtm.match_record_id = mr.id
    WHERE wtm.tournament_id = $1
      AND mr.player_score IS NOT NULL AND mr.player_score > 0
    GROUP BY mr.player_id
    ORDER BY goals DESC
    LIMIT 1
  `, [tournamentId])

  if (gb.rows[0]) {
    const gbClaimed = await claimAward("weekly_golden_boot", `${tournamentId}_${gb.rows[0].player_id}`)
    if (gbClaimed) await addBdr(gb.rows[0].player_id, WEEKLY_BDR.golden_boot)
  }
}

// ── awardUclKnockoutBdr ──────────────────────────────────────────────────────
// Same logic as weekly but with UCL_KNOCKOUT_BDR points.
// UCL KO has a fixed TOTAL_ROUNDS (currently 5 rounds in the bracket).
export async function awardUclKnockoutBdr(tournamentId, totalRounds) {
  const matches = await query(`
    SELECT round, player1_id, player2_id, winner_id, match_record_id
    FROM ucl_knockout_matches
    WHERE tournament_id = $1 AND status = 'completed' AND winner_id IS NOT NULL
    ORDER BY round ASC
  `, [tournamentId])

  for (const m of matches.rows) {
    const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id
    if (!loserId) continue

    const depth = totalRounds - m.round

    if (depth === 0) {
      const wClaimed = await claimAward("ucl_knockout_bdr", `${tournamentId}_${m.winner_id}`)
      if (wClaimed) await addBdr(m.winner_id, UCL_KNOCKOUT_BDR.winner)
      const rClaimed = await claimAward("ucl_knockout_bdr", `${tournamentId}_${loserId}`)
      if (rClaimed) await addBdr(loserId, UCL_KNOCKOUT_BDR.runner)
    } else if (depth === 1) {
      const claimed = await claimAward("ucl_knockout_bdr", `${tournamentId}_${loserId}`)
      if (claimed) await addBdr(loserId, UCL_KNOCKOUT_BDR.semi)
    } else if (depth === 2) {
      const claimed = await claimAward("ucl_knockout_bdr", `${tournamentId}_${loserId}`)
      if (claimed) await addBdr(loserId, UCL_KNOCKOUT_BDR.quarter)
    }
  }

  // Golden boot
  const gb = await query(`
    SELECT mr.player_id, SUM(mr.player_score) AS goals
    FROM match_records mr
    JOIN ucl_knockout_matches ukm ON ukm.match_record_id = mr.id
    WHERE ukm.tournament_id = $1
      AND mr.player_score IS NOT NULL AND mr.player_score > 0
    GROUP BY mr.player_id
    ORDER BY goals DESC
    LIMIT 1
  `, [tournamentId])

  if (gb.rows[0]) {
    const gbClaimed = await claimAward("ucl_knockout_golden_boot", `${tournamentId}_${gb.rows[0].player_id}`)
    if (gbClaimed) await addBdr(gb.rows[0].player_id, UCL_KNOCKOUT_BDR.golden_boot)
  }
}