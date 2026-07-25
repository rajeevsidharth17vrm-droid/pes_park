/**
 * seed.js — populates the DB with the same data as mockData.js
 * Usage: npm run db:seed
 */
import bcrypt from "bcryptjs"
import { query, withTransaction } from "./pool.js"

async function seed() {
  console.log("🌱 Seeding database…")

  await withTransaction(async ({ query: q }) => {

    // ── Teams ────────────────────────────────────────────────────────────────
    const teamRows = await q(`
      INSERT INTO teams (name, played, won, drawn, lost, gf, ga) VALUES
        ('Nexus FC',        14, 10, 2, 2,   38, 15),
        ('Phantom United',  14,  9, 3, 2,   31, 18),
        ('Storm City',      14,  8, 2, 4,   27, 21),
        ('Apex Athletic',   14,  7, 3, 4,   24, 19),
        ('Volt FC',         14,  6, 2, 6,   22, 24),
        ('Surge Sports',    14,  5, 3, 6,   19, 26),
        ('Blaze FC',        14,  3, 2, 9,   14, 31),
        ('Alpha United',    14,  1, 1, 12,   9, 38)
      ON CONFLICT (name) DO UPDATE SET
        played = EXCLUDED.played, won = EXCLUDED.won, drawn = EXCLUDED.drawn,
        lost = EXCLUDED.lost, gf = EXCLUDED.gf, ga = EXCLUDED.ga
      RETURNING id, name
    `)
    const teamId = Object.fromEntries(teamRows.rows.map(r => [r.name, r.id]))
    console.log("  ✓ Teams")

    // ── Admin user ───────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("Admin@123", 10)
    await q(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@tamil-efl.com', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [adminHash])

    // ── Team owner accounts ──────────────────────────────────────────────────
    const ownerHash = await bcrypt.hash("Owner@123", 10)
    for (const [teamName, id] of Object.entries(teamId)) {
      const slug = teamName.toLowerCase().replace(/\s+/g, "")
      await q(`
        INSERT INTO users (username, email, password_hash, role, team_id)
        VALUES ($1, $2, $3, 'team_owner', $4)
        ON CONFLICT (email) DO NOTHING
      `, [slug, `${slug}@tamil-efl.com`, ownerHash, id])
    }
    console.log("  ✓ Users")

    // ── Players ──────────────────────────────────────────────────────────────
    const playersData = [
      { name: "Arjun Sharma",  alias: "Blaze",   team: "Nexus FC",       grade: "S",  auction: 250, mv: 295, bdr: 2840, form: ["W","W","W","D","W"] },
      { name: "Rahul Menon",   alias: "Phantom", team: "Phantom United", grade: "A+", auction: 200, mv: 270, bdr: 2330, form: ["W","W","D","W","L"] },
      { name: "Vikram Nair",   alias: "Storm",   team: "Storm City",     grade: "A+", auction: 185, mv: 250, bdr: 1980, form: ["W","D","W","W","L"] },
      { name: "Kiran Reddy",   alias: "Apex",    team: "Apex Athletic",  grade: "A",  auction: 160, mv: 215, bdr: 1740, form: ["W","W","L","W","D"] },
      { name: "Suresh Kumar",  alias: "Volt",    team: "Volt FC",        grade: "A",  auction: 140, mv: 200, bdr: 1540, form: ["L","W","W","D","W"] },
      { name: "Deepak Pillai", alias: "Surge",   team: "Surge Sports",   grade: "B",  auction: 110, mv: 165, bdr: 1280, form: ["W","L","D","W","W"] },
      { name: "Anil Krishnan", alias: "Blaze7",  team: "Blaze FC",       grade: "B",  auction: 90,  mv: 140, bdr: 1080, form: ["L","W","L","D","W"] },
      { name: "Pradeep Singh", alias: "Alpha8",  team: "Alpha United",   grade: "C",  auction: 60,  mv: 90,  bdr: 720,  form: ["L","L","W","L","D"] },
      { name: "Rohan Das",     alias: "Raptor",  team: "Nexus FC",       grade: "A",  auction: 150, mv: 190, bdr: 1420, form: ["W","L","W","W","D"] },
      { name: "Siddharth Roy", alias: "Sid",     team: "Nexus FC",       grade: "B",  auction: 100, mv: 140, bdr: 1060, form: ["D","W","L","W","W"] },
      { name: "Manish Iyer",   alias: "Mani",    team: "Nexus FC",       grade: "C",  auction: 55,  mv: 80,  bdr: 560,  form: ["L","W","L","D","W"] },
    ]

    const playerRows = []
    for (const p of playersData) {
      const res = await q(`
        INSERT INTO players (name, alias, team_id, grade, auction_price, market_value, bdr_points, form)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
        RETURNING id, name
      `, [p.name, p.alias, teamId[p.team], p.grade, p.auction, p.mv, p.bdr, p.form])
      if (res.rows[0]) playerRows.push({ ...res.rows[0], ...p })
    }
    const playerId = Object.fromEntries(playerRows.map(r => [r.name, r.id]))
    console.log("  ✓ Players")

    // ── Match records ────────────────────────────────────────────────────────
    const records = [
      { player: "Arjun Sharma",  opponent: "Rahul Menon",   oppGrade: "A+", result: "win",  date: "2024-06-14" },
      { player: "Arjun Sharma",  opponent: "Vikram Nair",   oppGrade: "A+", result: "win",  date: "2024-06-12" },
      { player: "Arjun Sharma",  opponent: "Kiran Reddy",   oppGrade: "A",  result: "draw", date: "2024-06-10" },
      { player: "Rahul Menon",   opponent: "Arjun Sharma",  oppGrade: "S",  result: "loss", date: "2024-06-14" },
      { player: "Rahul Menon",   opponent: "Kiran Reddy",   oppGrade: "A",  result: "win",  date: "2024-06-12" },
      { player: "Vikram Nair",   opponent: "Suresh Kumar",  oppGrade: "A",  result: "win",  date: "2024-06-13" },
      { player: "Kiran Reddy",   opponent: "Deepak Pillai", oppGrade: "B",  result: "win",  date: "2024-06-11" },
      { player: "Suresh Kumar",  opponent: "Anil Krishnan", oppGrade: "B",  result: "win",  date: "2024-06-10" },
    ]
    for (const r of records) {
      const pid = playerId[r.player]
      const oid = playerId[r.opponent]
      if (!pid || !oid) continue
      await q(`
        INSERT INTO match_records (player_id, opponent_id, result, opponent_grade, recorded_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [pid, oid, r.result, r.oppGrade, r.date])
    }
    console.log("  ✓ Match records")

    // ── Fixtures ─────────────────────────────────────────────────────────────
    const fixtures = [
      { home: "Nexus FC",       away: "Blaze FC",       round: 14, date: "2024-06-14", hs: 3, as_: 1,    status: "completed" },
      { home: "Phantom United", away: "Storm City",     round: 14, date: "2024-06-14", hs: 2, as_: 2,    status: "completed" },
      { home: "Nexus FC",       away: "Storm City",     round: 13, date: "2024-06-12", hs: 3, as_: 3,    status: "completed" },
      { home: "Volt FC",        away: "Nexus FC",       round: 12, date: "2024-06-10", hs: 0, as_: 2,    status: "completed" },
      { home: "Nexus FC",       away: "Alpha United",   round: 11, date: "2024-06-07", hs: 4, as_: 0,    status: "completed" },
      { home: "Surge Sports",   away: "Nexus FC",       round: 10, date: "2024-06-05", hs: 1, as_: 2,    status: "completed" },
      { home: "Apex Athletic",  away: "Volt FC",        round: 10, date: "2024-06-13", hs: 1, as_: 0,    status: "completed" },
      { home: "Surge Sports",   away: "Alpha United",   round: 10, date: "2024-06-13", hs: 2, as_: 1,    status: "completed" },
      { home: "Nexus FC",       away: "Apex Athletic",  round: 15, date: "2024-06-18", hs: null, as_: null, status: "upcoming" },
      { home: "Phantom United", away: "Nexus FC",       round: 16, date: "2024-06-22", hs: null, as_: null, status: "upcoming" },
      { home: "Nexus FC",       away: "Storm City",     round: 17, date: "2024-06-26", hs: null, as_: null, status: "upcoming" },
    ]
    for (const f of fixtures) {
      await q(`
        INSERT INTO fixtures (home_team_id, away_team_id, round, scheduled_date, home_score, away_score, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [teamId[f.home], teamId[f.away], f.round, f.date, f.hs, f.as_, f.status])
    }
    console.log("  ✓ Fixtures")

// ── Trade requests ───────────────────────────────────────────────────────
    await q(`
      INSERT INTO trade_requests (player_id, from_team_id, to_team_id, trade_type, status)
      VALUES
        ($1, $2, $3, 'player_swap', 'pending_team'),
        ($4, $5, $6, 'player_swap', 'pending_admin'),
        ($7, $8, $9, 'player_swap', 'rejected_by_team'),
        ($10, $11, $12, 'player_swap', 'pending_team'),
        ($13, $14, $15, 'player_swap', 'approved')
      ON CONFLICT DO NOTHING
    `, [
      playerId["Rahul Menon"],   teamId["Nexus FC"],      teamId["Phantom United"],
      playerId["Arjun Sharma"],  teamId["Storm City"],    teamId["Nexus FC"],
      playerId["Vikram Nair"],   teamId["Nexus FC"],      teamId["Storm City"],
      playerId["Siddharth Roy"], teamId["Apex Athletic"], teamId["Nexus FC"],
      playerId["Kiran Reddy"],   teamId["Nexus FC"],      teamId["Apex Athletic"],
    ])
    console.log("  ✓ Trade requests")
  })

  console.log("✅ Seed complete")
  process.exit(0)
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message)
  process.exit(1)
})
