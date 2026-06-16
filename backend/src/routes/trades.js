import { Router } from "express"
import { z } from "zod"
import { query, withTransaction } from "../db/pool.js"
import { authenticate, adminOnly } from "../middleware/auth.js"

const router = Router()

const TRADE_SELECT = `
  SELECT
    tr.id,
    tr.status,
    tr.created_at AS "requestedOn",
    tr.resolved_at AS "resolvedAt",
    p.id    AS "playerId",
    p.name  AS "playerName",
    p.grade AS "playerGrade",
    p.market_value AS "playerMV",
    ft.id   AS "fromTeamId",
    ft.name AS "fromTeam",
    tt.id   AS "toTeamId",
    tt.name AS "toTeam"
  FROM trade_requests tr
  JOIN players p  ON tr.player_id    = p.id
  JOIN teams   ft ON tr.from_team_id = ft.id
  JOIN teams   tt ON tr.to_team_id   = tt.id
`

// GET /api/trades  — all trades (admin) or trades for my team (owner)
router.get("/", authenticate, async (req, res, next) => {
  try {
    let sql = TRADE_SELECT
    const params = []
    const { status } = req.query

    if (req.user.role !== "admin" && req.user.teamId) {
      sql += ` WHERE (tr.from_team_id = $1 OR tr.to_team_id = $1)`
      params.push(req.user.teamId)
      if (status) {
        sql += ` AND tr.status = $2`
        params.push(status)
      }
    } else if (status) {
      sql += ` WHERE tr.status = $1`
      params.push(status)
    }

    sql += " ORDER BY tr.created_at DESC"
    const result = await query(sql, params)

    // Add direction from the perspective of the requesting team
    const myTeamId = req.user.teamId
    const rows = result.rows.map(r => ({
      ...r,
      direction: r.fromTeamId === myTeamId ? "sent" : "received",
    }))

    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/trades  — team owner requests a trade
const createSchema = z.object({
  playerId:   z.number().int().positive(),
  toTeamId:   z.number().int().positive(),
})

router.post("/", authenticate, async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(403).json({ error: "You are not associated with a team" })
    }
    const { playerId, toTeamId } = createSchema.parse(req.body)

    // Verify player belongs to the target team
    const playerRes = await query(
      "SELECT team_id, name FROM players WHERE id = $1",
      [playerId]
    )
    if (!playerRes.rows[0]) return res.status(404).json({ error: "Player not found" })
    if (playerRes.rows[0].team_id !== toTeamId) {
      return res.status(400).json({ error: "Player does not belong to the target team" })
    }
    if (toTeamId === req.user.teamId) {
      return res.status(400).json({ error: "Cannot trade with your own team" })
    }

    // Check for duplicate pending request
    const dupRes = await query(`
      SELECT id FROM trade_requests
      WHERE player_id = $1 AND from_team_id = $2 AND status = 'pending'
    `, [playerId, req.user.teamId])
    if (dupRes.rows[0]) {
      return res.status(409).json({ error: "A pending request for this player already exists" })
    }

    const ins = await query(`
      INSERT INTO trade_requests (player_id, from_team_id, to_team_id, requested_by)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [playerId, req.user.teamId, toTeamId, req.user.id])

    const fresh = await query(TRADE_SELECT + " WHERE tr.id = $1", [ins.rows[0].id])
    res.status(201).json({ ...fresh.rows[0], direction: "sent" })
  } catch (err) { next(err) }
})

// PATCH /api/trades/:id/review  — admin approves or rejects
const reviewSchema = z.object({
  action: z.enum(["approved", "rejected"]),
})

router.patch("/:id/review", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { action } = reviewSchema.parse(req.body)

    const tradeRes = await query(TRADE_SELECT + " WHERE tr.id = $1 AND tr.status = 'pending'", [req.params.id])
    if (!tradeRes.rows[0]) return res.status(404).json({ error: "Trade not found or already resolved" })
    const trade = tradeRes.rows[0]

    await withTransaction(async ({ query: q }) => {
      if (action === "approved") {
        // Move player to requesting team
        await q(
          "UPDATE players SET team_id = $1 WHERE id = $2",
          [trade.fromTeamId, trade.playerId]
        )
      }
      await q(`
        UPDATE trade_requests
        SET status = $1, reviewed_by = $2, resolved_at = NOW()
        WHERE id = $3
      `, [action, req.user.id, req.params.id])
    })

    const fresh = await query(TRADE_SELECT + " WHERE tr.id = $1", [req.params.id])
    res.json(fresh.rows[0])
  } catch (err) { next(err) }
})

// PATCH /api/trades/:id/cancel  — team owner cancels their own pending request
router.patch("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      UPDATE trade_requests SET status = 'cancelled', resolved_at = NOW()
      WHERE id = $1 AND from_team_id = $2 AND status = 'pending'
      RETURNING id
    `, [req.params.id, req.user.teamId])
    if (!result.rows[0]) return res.status(404).json({ error: "Trade not found or cannot be cancelled" })
    res.json({ cancelled: true })
  } catch (err) { next(err) }
})

export default router
