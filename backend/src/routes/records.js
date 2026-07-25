import { Router } from "express"
import { z } from "zod"
import { query } from "../db/pool.js"
import { authenticate, adminOnly } from "../middleware/auth.js"
import { recalcMarketValue, recalcBestPlayer, matchBdrDelta, matchBpDelta } from "../services/marketValue.js"
import { addBdr } from "../services/bdrAwards.js"
import { recalcForm } from "../services/form.js"

// Helper: apply BDR + best_player deltas for BOTH sides of a match result
async function applyMatchDeltas(playerId, opponentId, result, playerScore, opponentScore) {
  const playerBdr = matchBdrDelta(result, playerScore ?? 0)
  const oppResult = result === "win" ? "loss" : result === "loss" ? "win" : "draw"
  const oppBdr    = matchBdrDelta(oppResult, opponentScore ?? 0)

  if (playerBdr) await addBdr(playerId, playerBdr)
  if (oppBdr)    await addBdr(opponentId, oppBdr)

  await recalcBestPlayer(playerId)
  await recalcBestPlayer(opponentId)
}

// Helper: reverse BDR deltas when a match is deleted
async function reverseMatchDeltas(playerId, opponentId, result, playerScore, opponentScore) {
  const playerBdr = matchBdrDelta(result, playerScore ?? 0)
  const oppResult = result === "win" ? "loss" : result === "loss" ? "win" : "draw"
  const oppBdr    = matchBdrDelta(oppResult, opponentScore ?? 0)

  if (playerBdr) await addBdr(playerId, -playerBdr)
  if (oppBdr)    await addBdr(opponentId, -oppBdr)

  await recalcBestPlayer(playerId)
  await recalcBestPlayer(opponentId)
}

const router = Router()

// Get current season number from app_settings
async function getCurrentSeason() {
  try {
    const res = await query("SELECT value FROM app_settings WHERE key = 'current_season'")
    return parseInt(res.rows[0]?.value || "6")
  } catch { return 6 }
}


// GET /api/records/season/:season — all records for a specific season (public)
router.get("/season/:season", async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        mr.id, mr.result,
        mr.match_type     AS "matchType",
        mr.player_score   AS "playerScore",
        mr.opponent_score AS "opponentScore",
        mr.recorded_at    AS date,
        mr.season_number  AS "seasonNumber",
        p.id   AS "playerId",   p.name AS "playerName",
        pt.name AS "playerTeam",
        opp.id AS "opponentId", opp.name AS "opponentName",
        ot.name AS "opponentTeam"
      FROM match_records mr
      JOIN players p   ON mr.player_id   = p.id
      JOIN players opp ON mr.opponent_id = opp.id
      LEFT JOIN teams pt ON p.team_id   = pt.id
      LEFT JOIN teams ot ON opp.team_id = ot.id
      WHERE mr.season_number = $1
      ORDER BY mr.recorded_at DESC, mr.id DESC
    `, [req.params.season])
    res.json(result.rows)
  } catch (err) { next(err) }
})

// GET /api/records — admin only
router.get("/", authenticate, adminOnly, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        mr.id,
        mr.result,
        mr.match_type     AS "matchType",
        mr.opponent_grade AS "opponentGrade",
        mr.player_score   AS "playerScore",
        mr.opponent_score AS "opponentScore",
        mr.recorded_at    AS date,
        p.id              AS "playerId",
        p.name            AS "playerName",
        opp.id            AS "opponentId",
        opp.name          AS "opponentName"
      FROM match_records mr
      JOIN players p   ON mr.player_id   = p.id
      JOIN players opp ON mr.opponent_id = opp.id
      ORDER BY mr.recorded_at DESC, mr.id DESC
    `)
    res.json(result.rows)
  } catch (err) { next(err) }
})

// GET /api/records/fixture/:fixtureId — team owner fetches already-logged results for a fixture
router.get("/fixture/:fixtureId", authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        mr.id,
        mr.result,
        mr.player_score   AS "playerScore",
        mr.opponent_score AS "opponentScore",
        mr.recorded_at    AS date,
        p.id              AS "playerId",
        p.name            AS "playerName",
        p.team_id         AS "playerTeamId",
        opp.id            AS "opponentId",
        opp.name          AS "opponentName",
        opp.team_id       AS "opponentTeamId"
      FROM match_records mr
      JOIN players p   ON mr.player_id   = p.id
      JOIN players opp ON mr.opponent_id = opp.id
      JOIN fixtures f  ON f.id = $1
      WHERE mr.match_type = 'league'
        AND (
          -- New records: reliably linked by fixture_id
          mr.fixture_id = $1
          OR (
            -- Old records from before this link existed: fall back to the
            -- previous heuristic (team membership + date) so they don't
            -- disappear from an in-progress fixture during the transition.
            mr.fixture_id IS NULL
            AND p.team_id   IN (f.home_team_id, f.away_team_id)
            AND opp.team_id IN (f.home_team_id, f.away_team_id)
            AND mr.recorded_at::date >= f.scheduled_date::date
          )
        )
      ORDER BY mr.recorded_at DESC, mr.id DESC
    `, [req.params.fixtureId])
    res.json(result.rows)
  } catch (err) { next(err) }
})

const createSchema = z.object({
  playerId:      z.number().int().positive(),
  opponentId:    z.number().int().positive(),
  result:        z.enum(["win", "draw", "loss"]),
  matchType:     z.enum(["league", "ucl", "weekly", "quick"]).default("league"),
  playerScore:   z.number().int().min(0).optional(),
  opponentScore: z.number().int().min(0).optional(),
  date:          z.string().optional(),
})

// Team-owner self-service result logging. Re-added after being removed
// alongside the old auto-team-standings-update behavior — this version
// ONLY ever touches match_records (and the market value/form/BDR that
// flow from it). It never touches teams.score_points/gf/ga/played/won/
// drawn/lost. Team standings are updated exclusively by an admin,
// manually, via PATCH /api/fixtures/:id/result (see routes/fixtures.js).

// POST /api/records/team — team owner logs a Team League result for one
// of their own players
router.post("/team", authenticate, async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(403).json({ error: "No team associated with your account" })
    }

    const { playerId, opponentId, result, playerScore, opponentScore, fixtureId } = z.object({
      playerId:      z.number().int().positive(),
      opponentId:    z.number().int().positive(),
      result:        z.enum(["win", "draw", "loss"]),
      playerScore:   z.number().int().min(0).optional(),
      opponentScore: z.number().int().min(0).optional(),
      fixtureId:     z.number().int().positive(),
    }).parse(req.body)

    if (playerId === opponentId) {
      return res.status(400).json({ error: "Player cannot play against themselves" })
    }

    // Verify player belongs to logged-in user's team
    const playerCheck = await query("SELECT team_id FROM players WHERE id = $1", [playerId])
    if (!playerCheck.rows[0]) return res.status(404).json({ error: "Player not found" })
    if (playerCheck.rows[0].team_id !== req.user.teamId) {
      return res.status(403).json({ error: "You can only log results for your own team's players" })
    }

    // Verify fixture involves this team and is still upcoming
    const fixRes = await query("SELECT home_team_id, away_team_id, status FROM fixtures WHERE id = $1", [fixtureId])
    if (!fixRes.rows[0]) return res.status(404).json({ error: "Fixture not found" })
    const fix = fixRes.rows[0]
    if (fix.status !== "upcoming") {
      return res.status(400).json({ error: "Results can only be logged for upcoming fixtures" })
    }
    const isInvolved = fix.home_team_id === req.user.teamId || fix.away_team_id === req.user.teamId
    if (!isInvolved) {
      return res.status(403).json({ error: "Your team is not part of this fixture" })
    }

    // Verify opponent belongs to the other team in this fixture
    const oppTeamId = fix.home_team_id === req.user.teamId ? fix.away_team_id : fix.home_team_id
    const oppCheck = await query("SELECT team_id, grade FROM players WHERE id = $1", [opponentId])
    if (!oppCheck.rows[0]) return res.status(404).json({ error: "Opponent not found" })
    if (oppCheck.rows[0].team_id !== oppTeamId) {
      return res.status(403).json({ error: "Opponent must be from the opposing team in this fixture" })
    }

    const seasonNumber = await getCurrentSeason()
    const ins = await query(`
      INSERT INTO match_records
        (player_id, opponent_id, result, opponent_grade, match_type, player_score, opponent_score, recorded_at, recorded_by, season_number, fixture_id, team_id)
      VALUES ($1,$2,$3,$4,'league',$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      playerId, opponentId, result, 'C',
      playerScore ?? null, opponentScore ?? null,
      new Date().toISOString().slice(0, 10),
      req.user.id, seasonNumber, fixtureId,
      playerCheck.rows[0].team_id ?? null,
    ])

    let recalcError = null
    try {
      await applyMatchDeltas(playerId, opponentId, result, playerScore, opponentScore)
      await recalcMarketValue(playerId)
      await recalcMarketValue(opponentId)
      await recalcForm(playerId)
      await recalcForm(opponentId)
    } catch (recalcErr) {
      console.error("Post-result recalc failed (match record still saved):", recalcErr)
      recalcError = recalcErr.message
    }

    const fresh = await query(
      `SELECT id, name, grade, market_value AS "marketValue", bdr_points AS "bdrPoints", best_player_points AS "bestPlayerPoints", form FROM players WHERE id = $1`,
      [playerId]
    )
    res.status(201).json({ record: ins.rows[0], player: fresh.rows[0], recalcError })
  } catch (err) { next(err) }
})

// PATCH /api/records/team/:id — team owner edits a Team League result they
// logged themselves. Scoped strictly to their own team's player — a team
// can never edit a result belonging to another team's player.
router.patch("/team/:id", authenticate, async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(403).json({ error: "No team associated with your account" })
    }

    const { result, playerScore, opponentScore } = z.object({
      result:        z.enum(["win", "draw", "loss"]),
      playerScore:   z.number().int().min(0).optional(),
      opponentScore: z.number().int().min(0).optional(),
    }).parse(req.body)

    const existing = await query(`
      SELECT mr.id, mr.player_id, mr.opponent_id, mr.result AS old_result,
             mr.player_score AS old_player_score, mr.opponent_score AS old_opponent_score,
             p.team_id AS player_team_id
      FROM match_records mr
      JOIN players p ON mr.player_id = p.id
      WHERE mr.id = $1 AND mr.match_type = 'league'
    `, [req.params.id])
    const record = existing.rows[0]
    if (!record) return res.status(404).json({ error: "Record not found" })
    if (record.player_team_id !== req.user.teamId) {
      return res.status(403).json({ error: "You can only edit your own team's logged results" })
    }

    // Reverse old BDR deltas, then apply new ones
    await reverseMatchDeltas(record.player_id, record.opponent_id, record.old_result, record.old_player_score, record.old_opponent_score)

    await query(
      `UPDATE match_records SET result = $1, player_score = $2, opponent_score = $3 WHERE id = $4`,
      [result, playerScore ?? null, opponentScore ?? null, req.params.id]
    )

    await applyMatchDeltas(record.player_id, record.opponent_id, result, playerScore, opponentScore)
    await recalcMarketValue(record.player_id)
    await recalcMarketValue(record.opponent_id)
    await recalcForm(record.player_id)
    await recalcForm(record.opponent_id)

    res.json({ updated: true })
  } catch (err) { next(err) }
})

// DELETE /api/records/team/:id — team owner deletes a result they logged
// themselves. Same ownership check as the edit endpoint above.
router.delete("/team/:id", authenticate, async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(403).json({ error: "No team associated with your account" })
    }

    const existing = await query(`
      SELECT mr.player_id, mr.opponent_id, mr.result, mr.player_score, mr.opponent_score,
             p.team_id AS player_team_id
      FROM match_records mr
      JOIN players p ON mr.player_id = p.id
      WHERE mr.id = $1 AND mr.match_type = 'league'
    `, [req.params.id])
    const record = existing.rows[0]
    if (!record) return res.status(404).json({ error: "Record not found" })
    if (record.player_team_id !== req.user.teamId) {
      return res.status(403).json({ error: "You can only delete your own team's logged results" })
    }

    // Reverse BDR deltas before deleting
    await reverseMatchDeltas(record.player_id, record.opponent_id, record.result, record.player_score, record.opponent_score)

    await query("DELETE FROM match_records WHERE id = $1", [req.params.id])

    await recalcMarketValue(record.player_id)
    await recalcMarketValue(record.opponent_id)
    await recalcBestPlayer(record.player_id)
    await recalcBestPlayer(record.opponent_id)
    await recalcForm(record.player_id)
    await recalcForm(record.opponent_id)

    res.json({ deleted: true })
  } catch (err) { next(err) }
})

// POST /api/records — admin logs any result
router.post("/", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { playerId, opponentId, result, matchType, playerScore, opponentScore, date } =
      createSchema.parse(req.body)

    if (playerId === opponentId) {
      return res.status(400).json({ error: "Player cannot play against themselves" })
    }

    const oppRes = await query("SELECT grade FROM players WHERE id = $1", [opponentId])
    if (!oppRes.rows[0]) return res.status(404).json({ error: "Opponent not found" })
    const opponentGrade = 'C'

    const seasonNumber = await getCurrentSeason()
    const ins = await query(`
      INSERT INTO match_records
        (player_id, opponent_id, result, opponent_grade, match_type, player_score, opponent_score, recorded_at, recorded_by, season_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      playerId, opponentId, result, opponentGrade, matchType,
      playerScore ?? null, opponentScore ?? null,
      date || new Date().toISOString().slice(0, 10),
      req.user.id, seasonNumber,
    ])

    const letter = result === "win" ? "W" : result === "draw" ? "D" : "L"
    await query(`UPDATE players SET form = (SELECT ARRAY(SELECT unnest(ARRAY[$1::char(1)] || form) LIMIT 5)) WHERE id = $2`, [letter, playerId])

    const oppLetter = result === "win" ? "L" : result === "loss" ? "W" : "D"
    await query(`UPDATE players SET form = (SELECT ARRAY(SELECT unnest(ARRAY[$1::char(1)] || form) LIMIT 5)) WHERE id = $2`, [oppLetter, opponentId])

    let recalcError = null
    try {
      await applyMatchDeltas(playerId, opponentId, result, playerScore, opponentScore)
      await recalcMarketValue(playerId)
      await recalcMarketValue(opponentId)
    } catch (recalcErr) {
      console.error("Post-result recalc failed (match record still saved):", recalcErr)
      recalcError = recalcErr.message
    }

    const fresh = await query(
      `SELECT id, name, grade, market_value AS "marketValue", bdr_points AS "bdrPoints", best_player_points AS "bestPlayerPoints", form FROM players WHERE id = $1`,
      [playerId]
    )

    res.status(201).json({
      recalcError,
      record: { ...ins.rows[0], matchType, playerScore: playerScore ?? null, opponentScore: opponentScore ?? null },
      player: fresh.rows[0],
    })
  } catch (err) { next(err) }
})

// PATCH /api/records/:id — admin edits an existing match record
router.patch("/:id", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { result, playerScore, opponentScore } = z.object({
      result:        z.enum(["win", "draw", "loss"]),
      playerScore:   z.number().int().min(0).optional(),
      opponentScore: z.number().int().min(0).optional(),
    }).parse(req.body)

    // Fetch existing record including old values for delta reversal
    const existing = await query(
      "SELECT player_id, opponent_id, result AS old_result, player_score AS old_player_score, opponent_score AS old_opponent_score FROM match_records WHERE id = $1",
      [req.params.id]
    )
    if (!existing.rows[0]) return res.status(404).json({ error: "Record not found" })
    const { player_id: playerId, opponent_id: opponentId, old_result, old_player_score, old_opponent_score } = existing.rows[0]

    // Reverse old BDR deltas
    await reverseMatchDeltas(playerId, opponentId, old_result, old_player_score, old_opponent_score)

    await query(`
      UPDATE match_records
      SET result = $1, player_score = $2, opponent_score = $3
      WHERE id = $4
    `, [result, playerScore ?? null, opponentScore ?? null, req.params.id])

    // Apply new BDR deltas
    await applyMatchDeltas(playerId, opponentId, result, playerScore, opponentScore)

    // Rebuild form and MV for both players since result may have changed
    const letter    = result === "win" ? "W" : result === "draw" ? "D" : "L"
    const oppLetter = result === "win" ? "L" : result === "loss" ? "W" : "D"
    await query(`UPDATE players SET form = (SELECT ARRAY(SELECT unnest(ARRAY[$1::char(1)] || form) LIMIT 5)) WHERE id = $2`, [letter, playerId])
    await query(`UPDATE players SET form = (SELECT ARRAY(SELECT unnest(ARRAY[$1::char(1)] || form) LIMIT 5)) WHERE id = $2`, [oppLetter, opponentId])
    let recalcError = null
    try {
      await recalcMarketValue(playerId)
      await recalcMarketValue(opponentId)
      await recalcForm(playerId)
      await recalcForm(opponentId)
    } catch (recalcErr) {
      console.error("Post-edit recalc failed (result edit still saved):", recalcErr)
      recalcError = recalcErr.message
    }

    const fresh = await query(
      `SELECT id, name, grade, market_value AS "marketValue", bdr_points AS "bdrPoints", best_player_points AS "bestPlayerPoints", form FROM players WHERE id = $1`,
      [playerId]
    )
    res.json({ updated: true, player: fresh.rows[0], recalcError })
  } catch (err) { next(err) }
})

// DELETE /api/records/:id — admin only
router.delete("/:id", authenticate, adminOnly, async (req, res, next) => {
  try {
    const mrId = req.params.id

    // This match_records row may be referenced by a UCL fixture, UCL
    // knockout match, or Weekly tournament match — Postgres blocks deleting
    // it while any of those still point to it via match_record_id. Reset
    // the referencing row back to "pending" (no score/winner) first, so the
    // delete succeeds and that fixture just goes back to awaiting a result,
    // the same state as using "Edit result" > clearing it would leave it in.
    await query(`UPDATE ucl_fixtures SET match_record_id = NULL, status = 'pending', player1_score = NULL, player2_score = NULL WHERE match_record_id = $1`, [mrId])
    await query(`UPDATE ucl_knockout_matches SET match_record_id = NULL, status = 'pending', winner_id = NULL, player1_score = NULL, player2_score = NULL WHERE match_record_id = $1`, [mrId])
    await query(`UPDATE weekly_tournament_matches SET match_record_id = NULL, status = 'pending', winner_id = NULL, player1_score = NULL, player2_score = NULL WHERE match_record_id = $1`, [mrId])

    // Fetch old values before deleting so we can reverse BDR deltas
    const oldRec = await query(
      "SELECT player_id, opponent_id, result, player_score, opponent_score FROM match_records WHERE id = $1",
      [mrId]
    )
    if (!oldRec.rows[0]) return res.status(404).json({ error: "Record not found" })
    const { player_id, opponent_id, result: oldResult, player_score, opponent_score } = oldRec.rows[0]

    // Reverse BDR deltas
    await reverseMatchDeltas(player_id, opponent_id, oldResult, player_score, opponent_score)

    await query("DELETE FROM match_records WHERE id = $1", [mrId])

    await recalcMarketValue(player_id)
    await recalcMarketValue(opponent_id)
    await recalcBestPlayer(player_id)
    await recalcBestPlayer(opponent_id)
    await recalcForm(player_id)
    await recalcForm(opponent_id)

    const fresh = await query(
      `SELECT id, market_value AS "marketValue" FROM players WHERE id = $1`,
      [player_id]
    )
    res.json({ deleted: true, player: fresh.rows[0] })
  } catch (err) { next(err) }
})

export default router