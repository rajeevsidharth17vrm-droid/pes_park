import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { query } from "../db/pool.js"
import { authenticate, adminOnly } from "../middleware/auth.js"

const router = Router()

// GET /api/teams — public
router.get("/", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM league_standings ORDER BY position")
    res.json(result.rows)
  } catch (err) { next(err) }
})

// GET /api/teams/:id — single team with roster
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const teamRes = await query("SELECT * FROM league_standings WHERE id = $1", [req.params.id])
    if (!teamRes.rows[0]) return res.status(404).json({ error: "Team not found" })
    const playersRes = await query(
      `SELECT * FROM players_full WHERE "teamId" = $1 ORDER BY "bdrPoints" DESC`,
      [req.params.id]
    )
    res.json({ ...teamRes.rows[0], players: playersRes.rows })
  } catch (err) { next(err) }
})

// POST /api/teams — admin creates team + owner account
const createTeamSchema = z.object({
  name:          z.string().min(1),
  ownerUsername: z.string().min(2),
  ownerEmail:    z.string().email(),
  ownerPassword: z.string().min(6),
})

router.post("/", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { name, ownerUsername, ownerEmail, ownerPassword } = createTeamSchema.parse(req.body)
    const teamRes = await query(
      "INSERT INTO teams (name) VALUES ($1) RETURNING id, name", [name]
    )
    const team = teamRes.rows[0]
    const hash = await bcrypt.hash(ownerPassword, 12)
    await query(
      `INSERT INTO users (username, email, password_hash, role, team_id) VALUES ($1,$2,$3,'team_owner',$4)`,
      [ownerUsername, ownerEmail, hash, team.id]
    )
    res.status(201).json({ team, owner: { username: ownerUsername, email: ownerEmail } })
  } catch (err) { next(err) }
})

// PATCH /api/teams/:id — admin edits team name or stats
router.patch("/:id", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { name, played, won, drawn, lost, gf, ga } = req.body
    const result = await query(`
      UPDATE teams SET
        name   = COALESCE($1, name),
        played = COALESCE($2, played), won   = COALESCE($3, won),
        drawn  = COALESCE($4, drawn),  lost  = COALESCE($5, lost),
        gf     = COALESCE($6, gf),     ga    = COALESCE($7, ga)
      WHERE id = $8 RETURNING *
    `, [name ?? null, played, won, drawn, lost, gf, ga, req.params.id])
    if (!result.rows[0]) return res.status(404).json({ error: "Team not found" })
    res.json(result.rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/teams/:id — admin deletes team
router.delete("/:id", authenticate, adminOnly, async (req, res, next) => {
  try {
    const result = await query(
      "DELETE FROM teams WHERE id = $1 RETURNING id, name", [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "Team not found" })
    res.json({ deleted: true, team: result.rows[0] })
  } catch (err) { next(err) }
})

export default router