/**
 * routes/wct.js — World Cup Tournament (fully manual, admin-only)
 * Prefix: /api/wct
 */
import { Router } from "express"
import { z } from "zod"
import { query, withTransaction } from "../db/pool.js"
import { authenticate, adminOnly } from "../middleware/auth.js"

const router = Router()
const auth = [authenticate, adminOnly]

// ─── Round-robin fixture generator ───────────────────────────────────────────
function generateRoundRobin(teamIds) {
  const list = [...teamIds]
  if (list.length % 2 !== 0) list.push(null)
  const total = list.length
  const rounds = []
  const seen = new Set()
  for (let r = 0; r < total - 1; r++) {
    const round = []
    for (let i = 0; i < total / 2; i++) {
      const h = list[i], a = list[total - 1 - i]
      if (!h || !a) continue
      const key = [h, a].sort().join("-")
      if (!seen.has(key)) { seen.add(key); round.push({ h, a }) }
    }
    if (round.length) rounds.push(round)
    list.splice(1, 0, list.pop())
  }
  return rounds
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNAMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/wct — list all tournaments
router.get("/", auth, async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM wct_tournaments ORDER BY created_at DESC")
    res.json(r.rows)
  } catch (err) { next(err) }
})

// POST /api/wct — create tournament
router.post("/", auth, async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body)
    const r = await query(
      "INSERT INTO wct_tournaments (name) VALUES ($1) RETURNING *", [name]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { next(err) }
})

// PATCH /api/wct/:id — update tournament (name or status)
router.patch("/:id", auth, async (req, res, next) => {
  try {
    const { name, status } = req.body
    const sets = [], vals = []
    if (name)   { vals.push(name);   sets.push(`name=$${vals.length}`) }
    if (status) { vals.push(status); sets.push(`status=$${vals.length}`) }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" })
    vals.push(req.params.id)
    const r = await query(
      `UPDATE wct_tournaments SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    )
    res.json(r.rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id — delete tournament (cascades)
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_tournaments WHERE id=$1", [req.params.id])
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/wct/:id/teams — teams with players
router.get("/:id/teams", auth, async (req, res, next) => {
  try {
    const teamsR = await query(
      "SELECT * FROM wct_teams WHERE tournament_id=$1 ORDER BY group_letter NULLS LAST, name ASC",
      [req.params.id]
    )
    const playersR = await query(
      "SELECT * FROM wct_players WHERE tournament_id=$1 ORDER BY is_starting DESC, name ASC",
      [req.params.id]
    )
    const teams = teamsR.rows.map(t => ({
      ...t,
      players: playersR.rows.filter(p => p.team_id === t.id)
    }))
    res.json(teams)
  } catch (err) { next(err) }
})

// POST /api/wct/:id/teams — add a team (with optional players)
router.post("/:id/teams", auth, async (req, res, next) => {
  try {
    const { name, group_letter, players = [] } = z.object({
      name: z.string().min(1),
      group_letter: z.string().length(1).toUpperCase().optional().nullable(),
      players: z.array(z.object({
        name: z.string().min(1),
        is_starting: z.boolean().default(false)
      })).max(7).optional()
    }).parse(req.body)

    let team, playerRows = []
    await withTransaction(async ({ query: q }) => {
      const tRes = await q(
        "INSERT INTO wct_teams (tournament_id, name, group_letter) VALUES ($1,$2,$3) RETURNING *",
        [req.params.id, name, group_letter ?? null]
      )
      team = tRes.rows[0]
      for (const p of players) {
        const pRes = await q(
          "INSERT INTO wct_players (team_id, tournament_id, name, is_starting) VALUES ($1,$2,$3,$4) RETURNING *",
          [team.id, req.params.id, p.name, p.is_starting]
        )
        playerRows.push(pRes.rows[0])
      }
    })
    res.status(201).json({ ...team, players: playerRows })
  } catch (err) { next(err) }
})

// PATCH /api/wct/:id/teams/:teamId — edit team (name or group)
router.patch("/:id/teams/:teamId", auth, async (req, res, next) => {
  try {
    const { name, group_letter } = req.body
    const sets = [], vals = []
    if (name !== undefined)         { vals.push(name);         sets.push(`name=$${vals.length}`) }
    if (group_letter !== undefined) { vals.push(group_letter === "" ? null : group_letter?.toUpperCase() ?? null); sets.push(`group_letter=$${vals.length}`) }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" })
    vals.push(req.params.teamId)
    const r = await query(
      `UPDATE wct_teams SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    )
    res.json(r.rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/teams/:teamId — delete team (cascades players, fixtures)
router.delete("/:id/teams/:teamId", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_teams WHERE id=$1 AND tournament_id=$2", [req.params.teamId, req.params.id])
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYERS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/wct/:id/teams/:teamId/players — add player to team
router.post("/:id/teams/:teamId/players", auth, async (req, res, next) => {
  try {
    const { name, is_starting = false } = z.object({
      name: z.string().min(1),
      is_starting: z.boolean().optional()
    }).parse(req.body)
    const r = await query(
      "INSERT INTO wct_players (team_id, tournament_id, name, is_starting) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.params.teamId, req.params.id, name, is_starting]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { next(err) }
})

// PATCH /api/wct/players/:playerId — edit player
router.patch("/players/:playerId", auth, async (req, res, next) => {
  try {
    const { name, is_starting } = req.body
    const sets = [], vals = []
    if (name !== undefined)       { vals.push(name);       sets.push(`name=$${vals.length}`) }
    if (is_starting !== undefined){ vals.push(is_starting); sets.push(`is_starting=$${vals.length}`) }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" })
    vals.push(req.params.playerId)
    const r = await query(
      `UPDATE wct_players SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    )
    res.json(r.rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/wct/players/:playerId — delete player
router.delete("/players/:playerId", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_players WHERE id=$1", [req.params.playerId])
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/wct/:id/generate-fixtures — round-robin for all groups
router.post("/:id/generate-fixtures", auth, async (req, res, next) => {
  try {
    const tid = req.params.id

    // Wipe existing group fixtures (cascades stats)
    await query("DELETE FROM wct_group_fixtures WHERE tournament_id=$1", [tid])

    const teamsR = await query(
      "SELECT id, group_letter FROM wct_teams WHERE tournament_id=$1 AND group_letter IS NOT NULL ORDER BY group_letter, name",
      [tid]
    )

    // Group by letter
    const byGroup = {}
    for (const t of teamsR.rows) {
      if (!byGroup[t.group_letter]) byGroup[t.group_letter] = []
      byGroup[t.group_letter].push(t.id)
    }

    let total = 0
    for (const [letter, ids] of Object.entries(byGroup)) {
      const rounds = generateRoundRobin(ids)
      for (let r = 0; r < rounds.length; r++) {
        for (const { h, a } of rounds[r]) {
          await query(
            "INSERT INTO wct_group_fixtures (tournament_id, group_letter, round_number, home_team_id, away_team_id) VALUES ($1,$2,$3,$4,$5)",
            [tid, letter, r + 1, h, a]
          )
          total++
        }
      }
    }

    await query("UPDATE wct_tournaments SET status='group_stage' WHERE id=$1", [tid])
    res.json({ generated: total })
  } catch (err) { next(err) }
})

// GET /api/wct/:id/group-fixtures — all group fixtures with team names
router.get("/:id/group-fixtures", auth, async (req, res, next) => {
  try {
    const r = await query(`
      SELECT
        f.id, f.group_letter, f.round_number,
        f.home_goals, f.away_goals, f.status,
        f.home_team_id, f.away_team_id,
        ht.name AS home_team_name,
        at.name AS away_team_name
      FROM wct_group_fixtures f
      LEFT JOIN wct_teams ht ON ht.id = f.home_team_id
      LEFT JOIN wct_teams at ON at.id = f.away_team_id
      WHERE f.tournament_id=$1
      ORDER BY f.group_letter, f.round_number, f.id
    `, [req.params.id])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// PATCH /api/wct/:id/group-fixtures/:fixtureId — save / update result
router.patch("/:id/group-fixtures/:fixtureId", auth, async (req, res, next) => {
  try {
    const { home_goals, away_goals, player_stats = [] } = z.object({
      home_goals: z.number().int().min(0),
      away_goals: z.number().int().min(0),
      player_stats: z.array(z.object({
        player_id: z.number().int().positive(),
        team_id:   z.number().int().positive(),
        goals:     z.number().int().min(0)
      })).optional()
    }).parse(req.body)

    await withTransaction(async ({ query: q }) => {
      await q(
        "UPDATE wct_group_fixtures SET home_goals=$1, away_goals=$2, status='completed' WHERE id=$3",
        [home_goals, away_goals, req.params.fixtureId]
      )
      // Upsert player stats
      for (const ps of player_stats) {
        await q(`
          INSERT INTO wct_player_stats (fixture_id, player_id, team_id, goals)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (fixture_id, player_id) DO UPDATE SET goals=$4
        `, [req.params.fixtureId, ps.player_id, ps.team_id, ps.goals])
      }
    })
    res.json({ updated: true })
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/group-fixtures/:fixtureId/result — clear result
router.delete("/:id/group-fixtures/:fixtureId/result", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_player_stats WHERE fixture_id=$1", [req.params.fixtureId])
    await query(
      "UPDATE wct_group_fixtures SET home_goals=NULL, away_goals=NULL, status='pending' WHERE id=$1",
      [req.params.fixtureId]
    )
    res.json({ cleared: true })
  } catch (err) { next(err) }
})

// GET /api/wct/:id/group-fixtures/:fixtureId/stats — player stats for a fixture
router.get("/:id/group-fixtures/:fixtureId/stats", auth, async (req, res, next) => {
  try {
    const r = await query(`
      SELECT s.*, p.name AS player_name, p.is_starting
      FROM wct_player_stats s
      JOIN wct_players p ON p.id = s.player_id
      WHERE s.fixture_id=$1
      ORDER BY s.team_id, s.goals DESC
    `, [req.params.fixtureId])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// STANDINGS (auto-calculated, read-only)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/:id/standings", async (req, res, next) => {
  try {
    const r = await query(`
      SELECT
        t.id, t.name, t.group_letter,
        COUNT(f.id) FILTER (WHERE f.status='completed') AS played,
        COUNT(f.id) FILTER (WHERE f.status='completed' AND (
          (f.home_team_id=t.id AND f.home_goals > f.away_goals) OR
          (f.away_team_id=t.id AND f.away_goals > f.home_goals)
        )) AS won,
        COUNT(f.id) FILTER (WHERE f.status='completed' AND f.home_goals=f.away_goals) AS drawn,
        COUNT(f.id) FILTER (WHERE f.status='completed' AND (
          (f.home_team_id=t.id AND f.home_goals < f.away_goals) OR
          (f.away_team_id=t.id AND f.away_goals < f.home_goals)
        )) AS lost,
        COALESCE(SUM(CASE
          WHEN f.status='completed' AND f.home_team_id=t.id THEN f.home_goals
          WHEN f.status='completed' AND f.away_team_id=t.id THEN f.away_goals
          ELSE 0 END),0) AS gf,
        COALESCE(SUM(CASE
          WHEN f.status='completed' AND f.home_team_id=t.id THEN f.away_goals
          WHEN f.status='completed' AND f.away_team_id=t.id THEN f.home_goals
          ELSE 0 END),0) AS ga
      FROM wct_teams t
      LEFT JOIN wct_group_fixtures f
        ON f.tournament_id=t.tournament_id
        AND (f.home_team_id=t.id OR f.away_team_id=t.id)
      WHERE t.tournament_id=$1 AND t.group_letter IS NOT NULL
      GROUP BY t.id, t.name, t.group_letter
      ORDER BY t.group_letter, (won*3 + drawn) DESC, (gf-ga) DESC, gf DESC
    `, [req.params.id])

    // Group by letter
    const byGroup = {}
    for (const row of r.rows) {
      const g = row.group_letter
      if (!byGroup[g]) byGroup[g] = []
      const won = parseInt(row.won) || 0
      const drawn = parseInt(row.drawn) || 0
      const gf = parseInt(row.gf) || 0
      const ga = parseInt(row.ga) || 0
      byGroup[g].push({
        id: row.id, name: row.name, group_letter: g,
        played: parseInt(row.played) || 0,
        won, drawn, lost: parseInt(row.lost) || 0, gf, ga,
        gd: gf - ga, points: won * 3 + drawn
      })
    }

    res.json(byGroup)
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// TOP SCORERS (group stage)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/:id/top-scorers", async (req, res, next) => {
  try {
    const r = await query(`
      SELECT
        p.id, p.name AS player_name, t.name AS team_name, t.group_letter,
        COALESCE(SUM(s.goals),0) AS goals
      FROM wct_player_stats s
      JOIN wct_players p ON p.id=s.player_id
      JOIN wct_teams t ON t.id=s.team_id
      WHERE t.tournament_id=$1
      GROUP BY p.id, p.name, t.name, t.group_letter
      HAVING SUM(s.goals) > 0
      ORDER BY goals DESC, p.name ASC
      LIMIT 20
    `, [req.params.id])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// QUALIFICATION (manual pick)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/wct/:id/qualified — list qualified teams
router.get("/:id/qualified", auth, async (req, res, next) => {
  try {
    const r = await query(`
      SELECT q.*, t.name AS team_name, t.group_letter AS team_group
      FROM wct_qualified_teams q
      JOIN wct_teams t ON t.id=q.team_id
      WHERE q.tournament_id=$1
      ORDER BY q.seed NULLS LAST, t.group_letter, t.name
    `, [req.params.id])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// POST /api/wct/:id/qualified — add a team to qualified list
router.post("/:id/qualified", auth, async (req, res, next) => {
  try {
    const { team_id, seed } = z.object({
      team_id: z.number().int().positive(),
      seed: z.number().int().min(1).optional().nullable()
    }).parse(req.body)

    const teamR = await query("SELECT group_letter FROM wct_teams WHERE id=$1", [team_id])
    const group_letter = teamR.rows[0]?.group_letter

    const r = await query(`
      INSERT INTO wct_qualified_teams (tournament_id, team_id, group_letter, seed)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (tournament_id, team_id) DO UPDATE SET seed=$4, group_letter=$3
      RETURNING *
    `, [req.params.id, team_id, group_letter, seed ?? null])
    res.status(201).json(r.rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/qualified/:teamId — remove from qualified
router.delete("/:id/qualified/:teamId", auth, async (req, res, next) => {
  try {
    await query(
      "DELETE FROM wct_qualified_teams WHERE tournament_id=$1 AND team_id=$2",
      [req.params.id, req.params.teamId]
    )
    res.json({ removed: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// KNOCKOUT FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/wct/:id/knockout — all knockout fixtures
router.get("/:id/knockout", auth, async (req, res, next) => {
  try {
    const r = await query(`
      SELECT
        f.id, f.round, f.match_number, f.status,
        f.home_goals, f.away_goals,
        f.home_team_id, f.away_team_id, f.winner_id,
        f.next_match_id,
        ht.name AS home_team_name,
        at.name AS away_team_name,
        wt.name AS winner_name
      FROM wct_knockout_fixtures f
      LEFT JOIN wct_teams ht ON ht.id=f.home_team_id
      LEFT JOIN wct_teams at ON at.id=f.away_team_id
      LEFT JOIN wct_teams wt ON wt.id=f.winner_id
      WHERE f.tournament_id=$1
      ORDER BY
        CASE f.round
          WHEN 'R32'   THEN 1
          WHEN 'R16'   THEN 2
          WHEN 'QF'    THEN 3
          WHEN 'SF'    THEN 4
          WHEN 'FINAL' THEN 5
          ELSE 6 END,
        f.match_number
    `, [req.params.id])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// POST /api/wct/:id/generate-knockout — create empty bracket (R32 = 16 matches)
router.post("/:id/generate-knockout", auth, async (req, res, next) => {
  try {
    const { round = "R32", match_count } = req.body
    const ROUND_SIZES = { R32: 16, R16: 8, QF: 4, SF: 2, FINAL: 1 }
    const count = match_count || ROUND_SIZES[round] || 16

    // Don't wipe existing rounds — admin may have multiple rounds in progress
    // Just add the requested round if not already there
    const existing = await query(
      "SELECT id FROM wct_knockout_fixtures WHERE tournament_id=$1 AND round=$2 LIMIT 1",
      [req.params.id, round]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `${round} fixtures already exist` })
    }

    for (let i = 1; i <= count; i++) {
      await query(
        "INSERT INTO wct_knockout_fixtures (tournament_id, round, match_number) VALUES ($1,$2,$3)",
        [req.params.id, round, i]
      )
    }

    await query("UPDATE wct_tournaments SET status='knockout' WHERE id=$1 AND status='qualification'", [req.params.id])
    res.status(201).json({ created: count, round })
  } catch (err) { next(err) }
})

// POST /api/wct/:id/knockout — create a single knockout fixture manually
router.post("/:id/knockout", auth, async (req, res, next) => {
  try {
    const { round, match_number, home_team_id, away_team_id } = z.object({
      round: z.string(),
      match_number: z.number().int().positive(),
      home_team_id: z.number().int().positive().optional().nullable(),
      away_team_id: z.number().int().positive().optional().nullable()
    }).parse(req.body)
    const r = await query(`
      INSERT INTO wct_knockout_fixtures (tournament_id, round, match_number, home_team_id, away_team_id)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (tournament_id, round, match_number) DO UPDATE
        SET home_team_id=$4, away_team_id=$5
      RETURNING *
    `, [req.params.id, round, match_number, home_team_id ?? null, away_team_id ?? null])
    res.status(201).json(r.rows[0])
  } catch (err) { next(err) }
})

// PATCH /api/wct/:id/knockout/:fixtureId — update teams, result, winner
router.patch("/:id/knockout/:fixtureId", auth, async (req, res, next) => {
  try {
    const body = z.object({
      home_team_id:  z.number().int().positive().optional().nullable(),
      away_team_id:  z.number().int().positive().optional().nullable(),
      home_goals:    z.number().int().min(0).optional().nullable(),
      away_goals:    z.number().int().min(0).optional().nullable(),
      winner_id:     z.number().int().positive().optional().nullable(),
      status:        z.enum(["pending","completed"]).optional(),
      next_match_id: z.number().int().positive().optional().nullable(),
      player_stats:  z.array(z.object({
        player_id: z.number().int().positive(),
        team_id:   z.number().int().positive(),
        goals:     z.number().int().min(0)
      })).optional()
    }).parse(req.body)

    const { player_stats, ...fields } = body
    const sets = [], vals = []
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { vals.push(v); sets.push(`${k}=$${vals.length}`) }
    }

    if (sets.length) {
      vals.push(req.params.fixtureId)
      await query(
        `UPDATE wct_knockout_fixtures SET ${sets.join(",")} WHERE id=$${vals.length}`, vals
      )
    }

    if (player_stats?.length) {
      for (const ps of player_stats) {
        await query(`
          INSERT INTO wct_knockout_player_stats (fixture_id, player_id, team_id, goals)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (fixture_id, player_id) DO UPDATE SET goals=$4
        `, [req.params.fixtureId, ps.player_id, ps.team_id, ps.goals])
      }
    }

    res.json({ updated: true })
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/knockout/:fixtureId — delete a knockout fixture
router.delete("/:id/knockout/:fixtureId", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_knockout_fixtures WHERE id=$1 AND tournament_id=$2",
      [req.params.fixtureId, req.params.id])
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/knockout/:fixtureId/result — clear knockout result
router.delete("/:id/knockout/:fixtureId/result", auth, async (req, res, next) => {
  try {
    await query("DELETE FROM wct_knockout_player_stats WHERE fixture_id=$1", [req.params.fixtureId])
    await query(
      "UPDATE wct_knockout_fixtures SET home_goals=NULL, away_goals=NULL, winner_id=NULL, status='pending' WHERE id=$1",
      [req.params.fixtureId]
    )
    res.json({ cleared: true })
  } catch (err) { next(err) }
})

// GET /api/wct/:id/knockout/:fixtureId/stats
router.get("/:id/knockout/:fixtureId/stats", auth, async (req, res, next) => {
  try {
    const r = await query(`
      SELECT s.*, p.name AS player_name, p.is_starting
      FROM wct_knockout_player_stats s
      JOIN wct_players p ON p.id=s.player_id
      WHERE s.fixture_id=$1
      ORDER BY s.team_id, s.goals DESC
    `, [req.params.fixtureId])
    res.json(r.rows)
  } catch (err) { next(err) }
})

// DELETE /api/wct/:id/knockout — wipe a specific round's fixtures
router.delete("/:id/knockout", auth, async (req, res, next) => {
  try {
    const { round } = req.query
    if (!round) return res.status(400).json({ error: "round query param required" })
    await query(
      "DELETE FROM wct_knockout_fixtures WHERE tournament_id=$1 AND round=$2",
      [req.params.id, round]
    )
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

export default router