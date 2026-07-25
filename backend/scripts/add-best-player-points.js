/**
 * Migration: Add best_player_points column to players table.
 *
 * Run once:  node scripts/add-best-player-points.js
 *
 * Safe to run multiple times — uses IF NOT EXISTS.
 */
import dotenv from "dotenv"
dotenv.config()
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      ALTER TABLE players
      ADD COLUMN IF NOT EXISTS best_player_points INTEGER NOT NULL DEFAULT 0
    `)
    console.log("✅ best_player_points column added (or already exists)")
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => { console.error("Migration failed:", err); process.exit(1) })