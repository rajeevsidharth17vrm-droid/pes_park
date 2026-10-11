/**
 * duo.js — Dynamic Team Tournament (Duo) API routes
 * Base path: /api/duo
 *
 * Formats supported:
 *   round_robin    — All teams play each other (double round-robin)
 *   knockout       — Single elimination bracket
 *   group_knockout — Group stage (round-robin per group) → Knockout (top N advance)
 *
 * All write operations require admin auth.
 * Read operations are public.
 */
import { Router } from "express"
import { query, withTransaction } from "../db/pool.js"
import { authenticate, adminOnly } from "../middleware/auth.js"

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a round-robin schedule using the circle method.
 * Returns array of rounds, each round is array of [homeIdx, awayIdx].
 * Handles odd team count with a BYE (-1).
 */
function generateRoundRobin(teamIds) {
  const ids = [...teamIds]
  if (ids.length % 2 !== 0) ids.push(-1)
  const n = ids.length
  const rounds = []
  const rotate = [...ids]

  for (let r = 0; r < n - 1; r++) {
    const pairs = []
    for (let i = 0; i < n / 2; i++) {
      const home = rotate[i]
      const away = rotate[n - 1 - i]
      if (home !== -1 && away !== -1) pairs.push([home, away])
    }
    rounds.push(pairs)
    rotate.splice(1, 0, rotate.pop())
  }
  return rounds
}

/** Determine match result string from scores. */
function resultStr(homeScore, awayScore) {
  if (homeScore > awayScore) return "home"
  if (awayScore > homeScore) return "away"
  return "draw"
}

/**
 * Build a single-elimination bracket from an array of teamIds (already in desired seed order).
 * Returns array of fixture IDs grouped by round (fixturesByRound[r] = [id, id, ...]).
 * Writes directly to DB via the provided client.
 */
async function buildKnockoutBracket(client, tournamentId, seededTeamIds, stage = "main") {
  const n = seededTeamIds.length
  let bracketSize = 1
  while (bracketSize < n) bracketSize *= 2

  const padded = [...seededTeamIds]
  while (padded.length < bracketSize) padded.push(null) // BYE

  const totalRounds = Math.log2(bracketSize)
  const fixturesByRound = []

  // Create empty fixture slots
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r)
    fixturesByRound.push([])
    for (let pos = 1; pos <= matchCount; pos++) {
      const res = await client.query(
        `INSERT INTO duo_fixtures (tournament_id, round, bracket_position, stage, home_team_id, away_team_id)
         VALUES ($1, $2, $3, $4, NULL, NULL) RETURNING id`,
        [tournamentId, r, pos, stage]
      )
      fixturesByRound[r - 1].push(res.rows[0].id)
    }
  }

  // Wire next_fixture_id (winner goes to ceil(pos/2) of next round)
  for (let r = 0; r < totalRounds - 1; r++) {
    for (let i = 0; i < fixturesByRound[r].length; i++) {
      const nextFixId = fixturesByRound[r + 1][Math.floor(i / 2)]
      await client.query(
        "UPDATE duo_fixtures SET next_fixture_id = $1 WHERE id = $2",
        [nextFixId, fixturesByRound[r][i]]
      )
    }
  }

  // Fill round 1 teams
  for (let i = 0; i < fixturesByRound[0].length; i++) {
    const homeId = padded[i * 2] ?? null
    const awayId = padded[i * 2 + 1] ?? null
    await client.query(
      "UPDATE duo_fixtures SET home_team_id = $1, away_team_id = $2 WHERE id = $3",
      [homeId, awayId, fixturesByRound[0][i]]
    )
    // Auto-advance BYE
    if (homeId && !awayId) {
      const nextFixId = fixturesByRound[1]?.[Math.floor(i / 2)]
      if (nextFixId) {
        const col = i % 2 === 0 ? "home_team_id" : "away_team_id"
        await client.query(`UPDATE duo_fixtures SET ${col} = $1 WHERE id = $2`, [homeId, nextFixId])
      }
      await client.query(
        "UPDATE duo_fixtures SET status = 'completed', winner_team_id = $1 WHERE id = $2",
        [homeId, fixturesByRound[0][i]]
      )
    }
  }

  return fixturesByRound
}

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/tournaments", async (req, res) => {
  try {
    const { season } = req.query
    let sql = "SELECT * FROM duo_tournaments"
    const params = []
    if (season) { sql += " WHERE season_number = $1"; params.push(season) }
    sql += " ORDER BY created_at DESC"
    res.json((await query(sql, params)).rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post("/tournaments", authenticate, adminOnly, async (req, res) => {
  try {
    const { name, season_number = 1, team_size = 2, format = "round_robin", num_teams = 8, settings = {} } = req.body
    if (!name) return res.status(400).json({ error: "name is required" })
    if (!["round_robin", "knockout", "group_knockout"].includes(format))
      return res.status(400).json({ error: "format must be round_robin, knockout, or group_knockout" })
    if (team_size < 1 || team_size > 11)
      return res.status(400).json({ error: "team_size must be between 1 and 11" })

    const result = await query(
      `INSERT INTO duo_tournaments (name, season_number, team_size, format, num_teams, settings)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, season_number, team_size, format, num_teams, JSON.stringify(settings)]
    )
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get("/tournaments/:id", async (req, res) => {
  try {
    const { id } = req.params
    const [tRes, teamsRes] = await Promise.all([
      query("SELECT * FROM duo_tournaments WHERE id = $1", [id]),
      query(`
        SELECT dt.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', dtp.id, 'player_id', dtp.player_id, 'slot', dtp.slot,
                'player_name', p.name, 'player_grade', p.grade
              ) ORDER BY dtp.slot
            ) FILTER (WHERE dtp.id IS NOT NULL), '[]'
          ) AS players
        FROM duo_teams dt
        LEFT JOIN duo_team_players dtp ON dtp.team_id = dt.id
        LEFT JOIN players p ON p.id = dtp.player_id
        WHERE dt.tournament_id = $1
        GROUP BY dt.id
        ORDER BY dt.id
      `, [id])
    ])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    res.json({ ...tRes.rows[0], teams: teamsRes.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch("/tournaments/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { name, settings, status } = req.body
    const fields = [], vals = []
    let idx = 1
    if (name !== undefined) { fields.push(`name = $${idx++}`); vals.push(name) }
    if (settings !== undefined) { fields.push(`settings = $${idx++}`); vals.push(JSON.stringify(settings)) }
    if (status !== undefined) {
      if (!["draft", "active", "completed"].includes(status))
        return res.status(400).json({ error: "Invalid status" })
      fields.push(`status = $${idx++}`); vals.push(status)
    }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" })
    vals.push(id)
    const result = await query(
      `UPDATE duo_tournaments SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, vals
    )
    if (!result.rows.length) return res.status(404).json({ error: "Tournament not found" })
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete("/tournaments/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await query("DELETE FROM duo_tournaments WHERE id = $1", [req.params.id])
    res.json({ deleted: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/tournaments/:id/teams", async (req, res) => {
  try {
    const result = await query(`
      SELECT dt.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', dtp.id, 'player_id', dtp.player_id, 'slot', dtp.slot,
              'player_name', p.name, 'player_grade', p.grade
            ) ORDER BY dtp.slot
          ) FILTER (WHERE dtp.id IS NOT NULL), '[]'
        ) AS players
      FROM duo_teams dt
      LEFT JOIN duo_team_players dtp ON dtp.team_id = dt.id
      LEFT JOIN players p ON p.id = dtp.player_id
      WHERE dt.tournament_id = $1
      GROUP BY dt.id
      ORDER BY dt.id
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post("/tournaments/:id/teams", authenticate, adminOnly, async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: "Team name is required" })
    const result = await query(
      "INSERT INTO duo_teams (tournament_id, name) VALUES ($1, $2) RETURNING *",
      [req.params.id, name]
    )
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch("/tournaments/:id/teams/:teamId", authenticate, adminOnly, async (req, res) => {
  try {
    const { name } = req.body
    const result = await query(
      "UPDATE duo_teams SET name = $1 WHERE id = $2 AND tournament_id = $3 RETURNING *",
      [name, req.params.teamId, req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: "Team not found" })
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete("/tournaments/:id/teams/:teamId", authenticate, adminOnly, async (req, res) => {
  try {
    await query("DELETE FROM duo_teams WHERE id = $1 AND tournament_id = $2", [req.params.teamId, req.params.id])
    res.json({ deleted: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PLAYERS
// ─────────────────────────────────────────────────────────────────────────────

router.post("/tournaments/:id/teams/:teamId/players", authenticate, adminOnly, async (req, res) => {
  try {
    const { player_id, slot } = req.body
    if (!player_id) return res.status(400).json({ error: "player_id is required" })
    const tRes = await query("SELECT team_size FROM duo_tournaments WHERE id = $1", [req.params.id])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    const { team_size } = tRes.rows[0]
    const countRes = await query("SELECT COUNT(*) FROM duo_team_players WHERE team_id = $1", [req.params.teamId])
    const count = parseInt(countRes.rows[0].count)
    if (count >= team_size)
      return res.status(400).json({ error: `Team already has ${team_size} players` })
    const assignedSlot = slot || count + 1
    const result = await query(
      `INSERT INTO duo_team_players (tournament_id, team_id, player_id, slot)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.params.teamId, player_id, assignedSlot]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Player already in this tournament" })
    res.status(500).json({ error: err.message })
  }
})

router.delete("/tournaments/:id/teams/:teamId/players/:playerId", authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      "DELETE FROM duo_team_players WHERE team_id = $1 AND player_id = $2 AND tournament_id = $3",
      [req.params.teamId, req.params.playerId, req.params.id]
    )
    res.json({ deleted: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP DRAW (group_knockout only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/duo/tournaments/:id/draw-groups
 * Body: {
 *   mode: "auto" | "manual",
 *   num_groups: N,
 *   assignments?: [{ teamId, groupNumber }]   ← required for manual
 * }
 * - Auto: shuffles teams and distributes evenly into groups 1..N
 * - Manual: assigns each team to the given group number
 */
router.post("/tournaments/:id/draw-groups", authenticate, adminOnly, async (req, res) => {
  try {
    const { mode = "auto", num_groups, assignments } = req.body
    const tournamentId = req.params.id

    if (!num_groups || num_groups < 2)
      return res.status(400).json({ error: "num_groups must be at least 2" })

    const tRes = await query("SELECT * FROM duo_tournaments WHERE id = $1", [tournamentId])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    if (tRes.rows[0].format !== "group_knockout")
      return res.status(400).json({ error: "This tournament is not group_knockout format" })

    // Check no group fixtures already exist
    const fCheck = await query(
      "SELECT COUNT(*) FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'group'",
      [tournamentId]
    )
    if (parseInt(fCheck.rows[0].count) > 0)
      return res.status(400).json({ error: "Group fixtures already generated. Reset them first." })

    const teamsRes = await query(
      "SELECT id FROM duo_teams WHERE tournament_id = $1 ORDER BY id",
      [tournamentId]
    )
    const teams = teamsRes.rows

    if (mode === "manual") {
      if (!Array.isArray(assignments) || assignments.length !== teams.length)
        return res.status(400).json({ error: "assignments must include all teams" })

      for (const a of assignments) {
        if (a.groupNumber < 1 || a.groupNumber > num_groups)
          return res.status(400).json({ error: `groupNumber must be between 1 and ${num_groups}` })
        await query(
          "UPDATE duo_teams SET group_number = $1 WHERE id = $2 AND tournament_id = $3",
          [a.groupNumber, a.teamId, tournamentId]
        )
      }
    } else {
      // Auto: shuffle and distribute evenly
      const shuffled = [...teams].sort(() => Math.random() - 0.5)
      for (let i = 0; i < shuffled.length; i++) {
        const groupNumber = (i % num_groups) + 1
        await query(
          "UPDATE duo_teams SET group_number = $1 WHERE id = $2",
          [groupNumber, shuffled[i].id]
        )
      }
    }

    // Return updated teams with group assignments
    const updated = await query(
      "SELECT id, name, group_number FROM duo_teams WHERE tournament_id = $1 ORDER BY group_number, id",
      [tournamentId]
    )
    res.json({ drawn: true, teams: updated.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE GROUP FIXTURES (group_knockout only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/duo/tournaments/:id/generate-group-fixtures
 * Generates double round-robin fixtures within each group.
 * Requires all teams to have a group_number assigned.
 */
router.post("/tournaments/:id/generate-group-fixtures", authenticate, adminOnly, async (req, res) => {
  try {
    const tournamentId = req.params.id

    const tRes = await query("SELECT * FROM duo_tournaments WHERE id = $1", [tournamentId])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    if (tRes.rows[0].format !== "group_knockout")
      return res.status(400).json({ error: "This tournament is not group_knockout format" })

    // Check all teams have groups assigned
    const unassigned = await query(
      "SELECT COUNT(*) FROM duo_teams WHERE tournament_id = $1 AND group_number IS NULL",
      [tournamentId]
    )
    if (parseInt(unassigned.rows[0].count) > 0)
      return res.status(400).json({ error: "Some teams don't have a group assigned. Draw groups first." })

    // Check no group fixtures already exist
    const existCheck = await query(
      "SELECT COUNT(*) FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'group'",
      [tournamentId]
    )
    if (parseInt(existCheck.rows[0].count) > 0)
      return res.status(400).json({ error: "Group fixtures already generated. Delete them first." })

    const teamsRes = await query(
      "SELECT id, group_number FROM duo_teams WHERE tournament_id = $1 ORDER BY group_number, id",
      [tournamentId]
    )

    // Group teams by group_number
    const groups = {}
    for (const t of teamsRes.rows) {
      if (!groups[t.group_number]) groups[t.group_number] = []
      groups[t.group_number].push(t.id)
    }

    await withTransaction(async (client) => {
      // Each group gets its own round-robin. We offset round numbers so rounds
      // across groups don't collide visually: all group-1 fixtures are round 1, 2, ...
      // Since different groups play simultaneously we just use the same round numbers.
      for (const [groupNum, groupTeamIds] of Object.entries(groups)) {
        if (groupTeamIds.length < 2) continue
        const rounds = generateRoundRobin(groupTeamIds)
        let roundNum = 1

        // First leg
        for (const round of rounds) {
          for (const [homeId, awayId] of round) {
            await client.query(
              `INSERT INTO duo_fixtures (tournament_id, round, home_team_id, away_team_id, stage)
               VALUES ($1, $2, $3, $4, 'group')`,
              [tournamentId, roundNum, homeId, awayId]
            )
          }
          roundNum++
        }
        // Second leg (reverse)
        for (const round of rounds) {
          for (const [homeId, awayId] of round) {
            await client.query(
              `INSERT INTO duo_fixtures (tournament_id, round, home_team_id, away_team_id, stage)
               VALUES ($1, $2, $3, $4, 'group')`,
              [tournamentId, roundNum, awayId, homeId]
            )
          }
          roundNum++
        }
      }

      // Mark tournament active
      await client.query(
        "UPDATE duo_tournaments SET status = 'active' WHERE id = $1",
        [tournamentId]
      )
    })

    const fixtures = await query(
      "SELECT * FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'group' ORDER BY round, id",
      [tournamentId]
    )
    res.status(201).json({ generated: fixtures.rows.length, fixtures: fixtures.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP STANDINGS (group_knockout only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/duo/tournaments/:id/group-standings
 * Returns teams grouped by group_number, ordered by points within each group.
 */
router.get("/tournaments/:id/group-standings", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        dt.*,
        (dt.won * 3 + dt.drawn) AS points,
        (dt.gf - dt.ga)         AS gd,
        COALESCE(
          json_agg(
            json_build_object('player_id', dtp.player_id, 'slot', dtp.slot, 'player_name', p.name)
            ORDER BY dtp.slot
          ) FILTER (WHERE dtp.id IS NOT NULL), '[]'
        ) AS players
      FROM duo_teams dt
      LEFT JOIN duo_team_players dtp ON dtp.team_id = dt.id
      LEFT JOIN players p ON p.id = dtp.player_id
      WHERE dt.tournament_id = $1
      GROUP BY dt.id
      ORDER BY dt.group_number NULLS LAST,
               (dt.won * 3 + dt.drawn) DESC,
               (dt.gf - dt.ga) DESC,
               dt.gf DESC,
               dt.name
    `, [req.params.id])

    // Reshape into { groupNumber: [teams...] }
    const grouped = {}
    for (const row of result.rows) {
      const g = String(row.group_number ?? "unassigned")
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(row)
    }
    res.json(grouped)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE KNOCKOUT FROM GROUPS (group_knockout only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/duo/tournaments/:id/generate-knockout
 * Body: { advance_per_group: N }   (default 2)
 *
 * Takes the top N teams from each group (by points, then GD, then GF)
 * and generates a knockout bracket.
 *
 * Seeding: cross-seeding to avoid same-group opponents in R1
 *   e.g. 4 groups, 2 per group → A1 vs D2, B1 vs C2, C1 vs B2, D1 vs A2
 */
router.post("/tournaments/:id/generate-knockout", authenticate, adminOnly, async (req, res) => {
  try {
    const { advance_per_group = 2 } = req.body
    const tournamentId = req.params.id

    const tRes = await query("SELECT * FROM duo_tournaments WHERE id = $1", [tournamentId])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    if (tRes.rows[0].format !== "group_knockout")
      return res.status(400).json({ error: "This tournament is not group_knockout format" })

    // Check knockout fixtures don't already exist
    const koCheck = await query(
      "SELECT COUNT(*) FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'knockout'",
      [tournamentId]
    )
    if (parseInt(koCheck.rows[0].count) > 0)
      return res.status(400).json({ error: "Knockout fixtures already generated. Delete them first." })

    // Get group standings
    const standingsRes = await query(`
      SELECT id, group_number,
        (won * 3 + drawn) AS points,
        (gf - ga)         AS gd,
        gf
      FROM duo_teams
      WHERE tournament_id = $1 AND group_number IS NOT NULL
      ORDER BY group_number,
               (won * 3 + drawn) DESC,
               (gf - ga) DESC,
               gf DESC
    `, [tournamentId])

    // Group teams by group_number
    const groups = {}
    for (const row of standingsRes.rows) {
      const g = row.group_number
      if (!groups[g]) groups[g] = []
      groups[g].push(row.id)
    }

    const groupNumbers = Object.keys(groups).sort((a, b) => +a - +b)
    const numGroups = groupNumbers.length

    // Collect top N from each group
    const rankSlots = [] // rankSlots[rank][groupIndex] = teamId
    for (let rank = 0; rank < advance_per_group; rank++) {
      rankSlots.push([])
      for (const g of groupNumbers) {
        const teamId = groups[g][rank]
        if (teamId) rankSlots[rank].push(teamId)
      }
    }

    // Cross-seeding: pair rank-1 teams with reversed rank-2 teams
    // so same-group teams don't meet in round 1
    // For 1 advancing per group: just use rank-1 teams in order
    let seeded = []

    if (advance_per_group === 1) {
      seeded = rankSlots[0]
    } else {
      // Interleave: A1 with reversed runner-ups
      // [A1, B1, C1, D1] + reversed [D2, C2, B2, A2] → pairs: A1-D2, B1-C2, C1-B2, D1-A2
      const winners   = rankSlots[0]
      const runnersUp = [...rankSlots[1]].reverse()
      for (let i = 0; i < winners.length; i++) {
        seeded.push(winners[i])
        if (runnersUp[i]) seeded.push(runnersUp[i])
      }
      // Remaining ranks (3rd place onwards if advance_per_group > 2)
      for (let rank = 2; rank < advance_per_group; rank++) {
        seeded = [...seeded, ...rankSlots[rank]]
      }
    }

    if (seeded.length < 2)
      return res.status(400).json({ error: "Not enough teams to generate a knockout bracket" })

    await withTransaction(async (client) => {
      await buildKnockoutBracket(client, tournamentId, seeded, "knockout")
    })

    const fixtures = await query(
      "SELECT * FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'knockout' ORDER BY round, bracket_position",
      [tournamentId]
    )
    res.status(201).json({ generated: fixtures.rows.length, fixtures: fixtures.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE KNOCKOUT FIXTURES ONLY (group_knockout — allows replaying group stage)
// ─────────────────────────────────────────────────────────────────────────────

router.delete("/tournaments/:id/fixtures/knockout", authenticate, adminOnly, async (req, res) => {
  try {
    await query(
      "DELETE FROM duo_fixtures WHERE tournament_id = $1 AND stage = 'knockout'",
      [req.params.id]
    )
    res.json({ deleted: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES — GENERATE (round_robin / knockout formats only)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/tournaments/:id/fixtures/generate", authenticate, adminOnly, async (req, res) => {
  try {
    const tRes = await query("SELECT * FROM duo_tournaments WHERE id = $1", [req.params.id])
    if (!tRes.rows.length) return res.status(404).json({ error: "Tournament not found" })
    const tournament = tRes.rows[0]

    if (tournament.format === "group_knockout")
      return res.status(400).json({
        error: "For group_knockout format, use draw-groups → generate-group-fixtures → generate-knockout instead."
      })

    const existCheck = await query("SELECT COUNT(*) FROM duo_fixtures WHERE tournament_id = $1", [req.params.id])
    if (parseInt(existCheck.rows[0].count) > 0)
      return res.status(400).json({ error: "Fixtures already generated. Delete them first." })

    const teamsRes = await query("SELECT id FROM duo_teams WHERE tournament_id = $1 ORDER BY id", [req.params.id])
    const teamIds = teamsRes.rows.map(r => r.id)
    if (teamIds.length < 2) return res.status(400).json({ error: "Need at least 2 teams" })

    await withTransaction(async (client) => {
      if (tournament.format === "round_robin") {
        const rounds = generateRoundRobin(teamIds)
        let roundNum = 1
        for (const round of rounds) {
          for (const [homeId, awayId] of round) {
            await client.query(
              `INSERT INTO duo_fixtures (tournament_id, round, home_team_id, away_team_id, stage)
               VALUES ($1, $2, $3, $4, 'main')`,
              [req.params.id, roundNum, homeId, awayId]
            )
          }
          roundNum++
        }
        for (const round of rounds) {
          for (const [homeId, awayId] of round) {
            await client.query(
              `INSERT INTO duo_fixtures (tournament_id, round, home_team_id, away_team_id, stage)
               VALUES ($1, $2, $3, $4, 'main')`,
              [req.params.id, roundNum, awayId, homeId]
            )
          }
          roundNum++
        }
      } else if (tournament.format === "knockout") {
        const shuffled = [...teamIds].sort(() => Math.random() - 0.5)
        await buildKnockoutBracket(client, req.params.id, shuffled, "main")
      }

      await client.query(
        "UPDATE duo_tournaments SET status = 'active' WHERE id = $1",
        [req.params.id]
      )
    })

    const fixtures = await query(
      "SELECT * FROM duo_fixtures WHERE tournament_id = $1 ORDER BY round, bracket_position NULLS LAST, id",
      [req.params.id]
    )
    res.status(201).json({ generated: fixtures.rows.length, fixtures: fixtures.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE ALL fixtures
router.delete("/tournaments/:id/fixtures", authenticate, adminOnly, async (req, res) => {
  try {
    await query("DELETE FROM duo_fixtures WHERE tournament_id = $1", [req.params.id])
    // Also clear group assignments
    await query(
      "UPDATE duo_teams SET group_number = NULL, played=0, won=0, drawn=0, lost=0, gf=0, ga=0 WHERE tournament_id = $1",
      [req.params.id]
    )
    await query("UPDATE duo_tournaments SET status = 'draft' WHERE id = $1", [req.params.id])
    res.json({ deleted: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES — READ
// ─────────────────────────────────────────────────────────────────────────────

router.get("/tournaments/:id/fixtures", async (req, res) => {
  try {
    const { stage } = req.query
    let sql = `
      SELECT
        f.*,
        ht.name AS home_team_name, ht.group_number AS home_team_group,
        at.name AS away_team_name, at.group_number AS away_team_group,
        wt.name AS winner_team_name,
        thp.name AS tiebreaker_home_player_name,
        tap.name AS tiebreaker_away_player_name,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', mr.id, 'slot', mr.slot,
              'home_player_id', mr.home_player_id, 'away_player_id', mr.away_player_id,
              'home_score', mr.home_score, 'away_score', mr.away_score,
              'result', mr.result,
              'home_player_name', hp.name, 'away_player_name', ap.name
            ) ORDER BY mr.slot
          )
          FROM duo_match_records mr
          JOIN players hp ON hp.id = mr.home_player_id
          JOIN players ap ON ap.id = mr.away_player_id
          WHERE mr.fixture_id = f.id), '[]'
        ) AS match_records
      FROM duo_fixtures f
      LEFT JOIN duo_teams ht  ON ht.id = f.home_team_id
      LEFT JOIN duo_teams at  ON at.id = f.away_team_id
      LEFT JOIN duo_teams wt  ON wt.id = f.winner_team_id
      LEFT JOIN players thp ON thp.id = f.tiebreaker_home_player
      LEFT JOIN players tap ON tap.id = f.tiebreaker_away_player
      WHERE f.tournament_id = $1`
    const params = [req.params.id]
    if (stage) { sql += ` AND f.stage = $2`; params.push(stage) }
    sql += " ORDER BY f.round, f.bracket_position NULLS LAST, f.id"

    res.json((await query(sql, params)).rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get("/fixtures/:id", async (req, res) => {
  try {
    const fRes = await query(`
      SELECT f.*,
        ht.name AS home_team_name, at.name AS away_team_name, wt.name AS winner_team_name
      FROM duo_fixtures f
      LEFT JOIN duo_teams ht ON ht.id = f.home_team_id
      LEFT JOIN duo_teams at ON at.id = f.away_team_id
      LEFT JOIN duo_teams wt ON wt.id = f.winner_team_id
      WHERE f.id = $1
    `, [req.params.id])
    if (!fRes.rows.length) return res.status(404).json({ error: "Fixture not found" })

    const mrRes = await query(`
      SELECT mr.*, hp.name AS home_player_name, ap.name AS away_player_name
      FROM duo_match_records mr
      JOIN players hp ON hp.id = mr.home_player_id
      JOIN players ap ON ap.id = mr.away_player_id
      WHERE mr.fixture_id = $1 ORDER BY mr.slot
    `, [req.params.id])

    res.json({ ...fRes.rows[0], match_records: mrRes.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/duo/fixtures/:id/result
 * A fixture needs a tiebreaker when it's an elimination match (stage = 'knockout' or format = 'knockout').
 * Group stage fixtures (stage = 'group') always allow draws.
 */
router.patch("/fixtures/:id/result", authenticate, adminOnly, async (req, res) => {
  try {
    const { matchups } = req.body
    if (!Array.isArray(matchups) || matchups.length === 0)
      return res.status(400).json({ error: "matchups array is required" })

    const fixRes = await query(
      "SELECT f.*, dt.format, dt.team_size FROM duo_fixtures f JOIN duo_tournaments dt ON dt.id = f.tournament_id WHERE f.id = $1",
      [req.params.id]
    )
    if (!fixRes.rows.length) return res.status(404).json({ error: "Fixture not found" })
    const fixture = fixRes.rows[0]

    if (fixture.status === "completed")
      return res.status(400).json({ error: "Fixture already completed. Reset it first." })

    if (matchups.length !== fixture.team_size)
      return res.status(400).json({ error: `Expected ${fixture.team_size} matchups, got ${matchups.length}` })

    // A tiebreaker is needed only for knockout-phase fixtures
    const isKnockoutPhase = fixture.format === "knockout" || fixture.stage === "knockout"

    await withTransaction(async (client) => {
      await client.query("DELETE FROM duo_match_records WHERE fixture_id = $1", [req.params.id])

      let homeWins = 0, awayWins = 0

      for (const m of matchups) {
        const { slot, home_player_id, away_player_id, home_score, away_score } = m
        const result = resultStr(home_score, away_score)
        if (result === "home") homeWins++
        else if (result === "away") awayWins++

        await client.query(
          `INSERT INTO duo_match_records
            (fixture_id, tournament_id, home_player_id, away_player_id, home_score, away_score, result, slot)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [req.params.id, fixture.tournament_id, home_player_id, away_player_id, home_score, away_score, result, slot]
        )
      }

      const teamResult = resultStr(homeWins, awayWins)
      const isTie = teamResult === "draw"
      const winnerTeamId = isTie ? null : (teamResult === "home" ? fixture.home_team_id : fixture.away_team_id)
      const needsTiebreaker = isKnockoutPhase && isTie

      await client.query(
        `UPDATE duo_fixtures
         SET home_score = $1, away_score = $2, winner_team_id = $3,
             is_tiebreaker_needed = $4,
             status = CASE WHEN $5 THEN 'upcoming' ELSE 'completed' END
         WHERE id = $6`,
        [homeWins, awayWins, winnerTeamId, needsTiebreaker, needsTiebreaker, req.params.id]
      )

      // Update team standings for group-phase / round-robin fixtures
      const updateStandings = fixture.format === "round_robin" || fixture.stage === "group"
      if (updateStandings) {
        const updateTeam = async (teamId, won, drew, lost, gf, ga) =>
          client.query(
            `UPDATE duo_teams SET played=played+1, won=won+$1, drawn=drawn+$2, lost=lost+$3, gf=gf+$4, ga=ga+$5 WHERE id=$6`,
            [won, drew, lost, gf, ga, teamId]
          )
        await updateTeam(fixture.home_team_id,
          teamResult === "home" ? 1 : 0, isTie ? 1 : 0, teamResult === "away" ? 1 : 0, homeWins, awayWins)
        await updateTeam(fixture.away_team_id,
          teamResult === "away" ? 1 : 0, isTie ? 1 : 0, teamResult === "home" ? 1 : 0, awayWins, homeWins)
      }

      // Advance winner in knockout bracket
      if (isKnockoutPhase && !needsTiebreaker && winnerTeamId && fixture.next_fixture_id) {
        const col = fixture.bracket_position % 2 === 1 ? "home_team_id" : "away_team_id"
        await client.query(
          `UPDATE duo_fixtures SET ${col} = $1 WHERE id = $2`,
          [winnerTeamId, fixture.next_fixture_id]
        )
      }
    })

    const updated = await query(`
      SELECT f.*, ht.name AS home_team_name, at.name AS away_team_name
      FROM duo_fixtures f
      LEFT JOIN duo_teams ht ON ht.id = f.home_team_id
      LEFT JOIN duo_teams at ON at.id = f.away_team_id
      WHERE f.id = $1
    `, [req.params.id])
    res.json(updated.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE RESET
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/fixtures/:id/reset", authenticate, adminOnly, async (req, res) => {
  try {
    const fixRes = await query(
      "SELECT f.*, dt.format FROM duo_fixtures f JOIN duo_tournaments dt ON dt.id = f.tournament_id WHERE f.id = $1",
      [req.params.id]
    )
    if (!fixRes.rows.length) return res.status(404).json({ error: "Fixture not found" })
    const fixture = fixRes.rows[0]
    if (fixture.status !== "completed") return res.status(400).json({ error: "Fixture not completed" })

    const isKnockoutPhase = fixture.format === "knockout" || fixture.stage === "knockout"
    const updateStandings  = fixture.format === "round_robin" || fixture.stage === "group"

    await withTransaction(async (client) => {
      if (updateStandings) {
        const prevResult = resultStr(fixture.home_score, fixture.away_score)
        const isTie = prevResult === "draw"
        const undoTeam = async (teamId, won, drew, lost, gf, ga) =>
          client.query(
            `UPDATE duo_teams SET played=played-1, won=won-$1, drawn=drawn-$2, lost=lost-$3, gf=gf-$4, ga=ga-$5 WHERE id=$6`,
            [won, drew, lost, gf, ga, teamId]
          )
        await undoTeam(fixture.home_team_id,
          prevResult === "home" ? 1 : 0, isTie ? 1 : 0, prevResult === "away" ? 1 : 0,
          fixture.home_score, fixture.away_score)
        await undoTeam(fixture.away_team_id,
          prevResult === "away" ? 1 : 0, isTie ? 1 : 0, prevResult === "home" ? 1 : 0,
          fixture.away_score, fixture.home_score)
      }

      if (isKnockoutPhase && fixture.winner_team_id && fixture.next_fixture_id) {
        const col = fixture.bracket_position % 2 === 1 ? "home_team_id" : "away_team_id"
        await client.query(`UPDATE duo_fixtures SET ${col} = NULL WHERE id = $1`, [fixture.next_fixture_id])
      }

      await client.query(
        `UPDATE duo_fixtures
         SET home_score=0, away_score=0, winner_team_id=NULL,
             is_tiebreaker_needed=FALSE, tiebreaker_home_player=NULL,
             tiebreaker_away_player=NULL, tiebreaker_result=NULL, status='upcoming'
         WHERE id = $1`,
        [req.params.id]
      )
      await client.query("DELETE FROM duo_match_records WHERE fixture_id = $1", [req.params.id])
    })

    res.json({ reset: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// TIEBREAKER
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/fixtures/:id/tiebreaker", authenticate, adminOnly, async (req, res) => {
  try {
    const { tiebreaker_home_player, tiebreaker_away_player, tiebreaker_result } = req.body
    const fixRes = await query("SELECT * FROM duo_fixtures WHERE id = $1", [req.params.id])
    if (!fixRes.rows.length) return res.status(404).json({ error: "Fixture not found" })
    const fixture = fixRes.rows[0]
    if (!fixture.is_tiebreaker_needed)
      return res.status(400).json({ error: "This fixture does not need a tiebreaker" })

    if (tiebreaker_result) {
      if (!["home", "away"].includes(tiebreaker_result))
        return res.status(400).json({ error: "tiebreaker_result must be 'home' or 'away'" })
      const winnerTeamId = tiebreaker_result === "home" ? fixture.home_team_id : fixture.away_team_id
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE duo_fixtures
           SET tiebreaker_result=$1, winner_team_id=$2, status='completed', is_tiebreaker_needed=FALSE
           WHERE id=$3`,
          [tiebreaker_result, winnerTeamId, req.params.id]
        )
        if (fixture.next_fixture_id) {
          const col = fixture.bracket_position % 2 === 1 ? "home_team_id" : "away_team_id"
          await client.query(
            `UPDATE duo_fixtures SET ${col} = $1 WHERE id = $2`,
            [winnerTeamId, fixture.next_fixture_id]
          )
        }
      })
    } else {
      const updates = {}
      if (tiebreaker_home_player !== undefined) updates.tiebreaker_home_player = tiebreaker_home_player
      if (tiebreaker_away_player !== undefined) updates.tiebreaker_away_player = tiebreaker_away_player
      const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`)
      const vals = [...Object.values(updates), req.params.id]
      await query(`UPDATE duo_fixtures SET ${fields.join(", ")} WHERE id = $${vals.length}`, vals)
    }

    res.json((await query("SELECT * FROM duo_fixtures WHERE id = $1", [req.params.id])).rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS (overall / round-robin)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/tournaments/:id/standings", async (req, res) => {
  try {
    const result = await query(`
      SELECT dt.*,
        (dt.won * 3 + dt.drawn) AS points,
        (dt.gf - dt.ga)         AS gd,
        COALESCE(
          json_agg(
            json_build_object('player_id', dtp.player_id, 'slot', dtp.slot, 'player_name', p.name)
            ORDER BY dtp.slot
          ) FILTER (WHERE dtp.id IS NOT NULL), '[]'
        ) AS players
      FROM duo_teams dt
      LEFT JOIN duo_team_players dtp ON dtp.team_id = dt.id
      LEFT JOIN players p ON p.id = dtp.player_id
      WHERE dt.tournament_id = $1
      GROUP BY dt.id
      ORDER BY points DESC, gd DESC, dt.gf DESC, dt.name
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// TOP SCORERS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/tournaments/:id/top-scorers", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.id AS player_id,
        p.name AS player_name,
        COUNT(*) FILTER (WHERE mr.result = 'home' AND mr.home_player_id = p.id) +
        COUNT(*) FILTER (WHERE mr.result = 'away' AND mr.away_player_id = p.id) AS wins,
        COUNT(*) FILTER (WHERE mr.result = 'draw') AS draws,
        COUNT(*) AS played,
        SUM(CASE WHEN mr.home_player_id = p.id THEN mr.home_score ELSE mr.away_score END) AS total_goals
      FROM duo_match_records mr
      JOIN players p ON p.id = mr.home_player_id OR p.id = mr.away_player_id
      WHERE mr.tournament_id = $1 AND (mr.home_player_id = p.id OR mr.away_player_id = p.id)
      GROUP BY p.id, p.name
      ORDER BY wins DESC, total_goals DESC, p.name
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE TOURNAMENT
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/tournaments/:id/complete", authenticate, adminOnly, async (req, res) => {
  try {
    const result = await query(
      "UPDATE duo_tournaments SET status = 'completed' WHERE id = $1 RETURNING *",
      [req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: "Tournament not found" })
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router