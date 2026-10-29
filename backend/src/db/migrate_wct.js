/**
 * migrate_wct.js — World Cup Tournament schema
 * Run once: node src/db/migrate_wct.js
 */
import { query } from "./pool.js"

const SQL = `
-- ─────────────────────────────────────────────────────────────────────────────
-- WCT TOURNAMENTS (standalone, no season link)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_tournaments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  status     VARCHAR(30)  NOT NULL DEFAULT 'setup',
  -- setup | group_stage | qualification | knockout | completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT TEAMS  (fresh teams per tournament, not from existing teams table)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_teams (
  id              SERIAL PRIMARY KEY,
  tournament_id   INT NOT NULL REFERENCES wct_tournaments(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  group_letter    CHAR(1),          -- A–H, NULL = unassigned
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT PLAYERS (7 per team, 5 starting)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_players (
  id            SERIAL PRIMARY KEY,
  team_id       INT NOT NULL REFERENCES wct_teams(id) ON DELETE CASCADE,
  tournament_id INT NOT NULL REFERENCES wct_tournaments(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  is_starting   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT GROUP FIXTURES (round-robin within each group)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_group_fixtures (
  id              SERIAL PRIMARY KEY,
  tournament_id   INT NOT NULL REFERENCES wct_tournaments(id) ON DELETE CASCADE,
  group_letter    CHAR(1) NOT NULL,
  round_number    INT NOT NULL DEFAULT 1,
  home_team_id    INT REFERENCES wct_teams(id) ON DELETE SET NULL,
  away_team_id    INT REFERENCES wct_teams(id) ON DELETE SET NULL,
  home_goals      INT,
  away_goals      INT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | completed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT PLAYER MATCH STATS (goals per player per group fixture)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_player_stats (
  id          SERIAL PRIMARY KEY,
  fixture_id  INT NOT NULL REFERENCES wct_group_fixtures(id) ON DELETE CASCADE,
  player_id   INT NOT NULL REFERENCES wct_players(id) ON DELETE CASCADE,
  team_id     INT NOT NULL REFERENCES wct_teams(id) ON DELETE CASCADE,
  goals       INT NOT NULL DEFAULT 0,
  UNIQUE (fixture_id, player_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT QUALIFIED TEAMS (manually picked by admin for knockout)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_qualified_teams (
  id            SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES wct_tournaments(id) ON DELETE CASCADE,
  team_id       INT NOT NULL REFERENCES wct_teams(id) ON DELETE CASCADE,
  group_letter  CHAR(1),
  seed          INT,           -- position in bracket (1–32 for R32)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, team_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT KNOCKOUT FIXTURES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_knockout_fixtures (
  id              SERIAL PRIMARY KEY,
  tournament_id   INT NOT NULL REFERENCES wct_tournaments(id) ON DELETE CASCADE,
  round           VARCHAR(10) NOT NULL,
  -- R32 | R16 | QF | SF | FINAL
  match_number    INT NOT NULL,
  home_team_id    INT REFERENCES wct_teams(id) ON DELETE SET NULL,
  away_team_id    INT REFERENCES wct_teams(id) ON DELETE SET NULL,
  home_goals      INT,
  away_goals      INT,
  winner_id       INT REFERENCES wct_teams(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | completed
  next_match_id   INT REFERENCES wct_knockout_fixtures(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, round, match_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WCT KNOCKOUT PLAYER STATS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wct_knockout_player_stats (
  id          SERIAL PRIMARY KEY,
  fixture_id  INT NOT NULL REFERENCES wct_knockout_fixtures(id) ON DELETE CASCADE,
  player_id   INT NOT NULL REFERENCES wct_players(id) ON DELETE CASCADE,
  team_id     INT NOT NULL REFERENCES wct_teams(id) ON DELETE CASCADE,
  goals       INT NOT NULL DEFAULT 0,
  UNIQUE (fixture_id, player_id)
);
`

async function migrate() {
  try {
    await query(SQL)
    console.log("✅  WCT migration complete")
    process.exit(0)
  } catch (err) {
    console.error("❌  WCT migration failed:", err)
    process.exit(1)
  }
}

migrate()