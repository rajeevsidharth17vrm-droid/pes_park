// scripts/add-quick-tournament.js
//
// One-time setup for the new Quick Tournament feature — a second,
// independent single-elimination tournament type running alongside
// Weekly Tournament, with its own trophy + Golden Boot.
//
// This script:
//   1. Adds trophy8_count (Quick Tournament champion) and trophy9_count
//      (Quick Tournament Golden Boot) columns to players
//   2. Creates quick_tournaments / quick_tournament_players /
//      quick_tournament_matches tables — same shape as the existing
//      weekly_tournament_* tables
//   3. Re-applies the players_full view to include trophy8Count/trophy9Count
//
// Safe to run more than once — every statement uses IF NOT EXISTS /
// CREATE OR REPLACE.
//
// Run once:
//   node scripts/add-quick-tournament.js

import dotenv from "dotenv"
dotenv.config()
import { query } from "../src/db/pool.js"

const SQL = `
-- ── Trophy columns ──────────────────────────────────────────────────────────
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS trophy8_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trophy9_count INT NOT NULL DEFAULT 0;

-- ── Quick Tournament tables (mirrors weekly_tournament_*) ──────────────────
CREATE TABLE IF NOT EXISTS quick_tournaments (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'setup',
  total_rounds   INT,
  player_count   INT,
  season_number  INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_tournament_players (
  id             SERIAL PRIMARY KEY,
  tournament_id  INT NOT NULL REFERENCES quick_tournaments(id) ON DELETE CASCADE,
  player_id      INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed           INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quick_players_tournament ON quick_tournament_players(tournament_id);

CREATE TABLE IF NOT EXISTS quick_tournament_matches (
  id               SERIAL PRIMARY KEY,
  tournament_id    INT NOT NULL REFERENCES quick_tournaments(id) ON DELETE CASCADE,
  round            INT NOT NULL,
  match_number     INT NOT NULL,
  player1_id       INT REFERENCES players(id) ON DELETE SET NULL,
  player2_id       INT REFERENCES players(id) ON DELETE SET NULL,
  player1_score    INT,
  player2_score    INT,
  winner_id        INT REFERENCES players(id) ON DELETE SET NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  match_record_id  INT REFERENCES match_records(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_quick_matches_tournament ON quick_tournament_matches(tournament_id);

-- ── players_full view — add trophy8Count/trophy9Count ───────────────────────
CREATE OR REPLACE VIEW players_full AS
SELECT
  p.id,
  p.name,
  p.alias,
  p.grade,
  p.auction_price AS "auctionPrice",
  p.market_value  AS "marketValue",
  p.bdr_points    AS "bdrPoints",
  p.form,
  p.trophy1_count AS "trophy1Count",
  p.trophy2_count AS "trophy2Count",
  p.trophy3_count AS "trophy3Count",
  p.trophy4_count AS "trophy4Count",
  p.trophy5_count AS "trophy5Count",
  p.trophy6_count AS "trophy6Count",
  p.trophy7_count AS "trophy7Count",
  p.trophy8_count AS "trophy8Count",
  p.trophy9_count AS "trophy9Count",
  t.name          AS team,
  p.team_id       AS "teamId",
  t.logo_url      AS "teamLogo",
  p.avatar_id     AS "avatarId",
  p.avatar_url    AS "avatarUrl",
  p.avatar_bg_url AS "avatarBgUrl",
  p.is_captain    AS "isCaptain",
  p.image_url     AS "imageUrl",
  p.ucl_group_id  AS "uclGroupId"
FROM players p
LEFT JOIN teams t ON p.team_id = t.id;
`

async function run() {
  console.log("🔧 Setting up Quick Tournament (trophy columns, tables, view)…")
  try {
    await query(SQL)
    console.log("✅ Done — trophy8_count/trophy9_count added, quick_tournament_* tables created, players_full updated")
  } catch (err) {
    console.error("❌ Failed:", err.message)
    process.exit(1)
  }
  process.exit(0)
}

run()