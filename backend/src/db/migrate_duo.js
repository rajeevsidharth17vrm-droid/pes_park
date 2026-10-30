/**
 * migrate_duo.js — Dynamic Team Tournament (Duo) schema
 * Usage: node src/db/migrate_duo.js
 *
 * Creates tables for the configurable team tournament system.
 * Team size is fully dynamic (2v2, 3v3, 4v4, custom).
 */
import { query } from "./pool.js"

const SQL = `
-- ─────────────────────────────────────────────────────────────────────────────
-- DUO TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duo_tournaments (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  season_number  INT NOT NULL DEFAULT 1,
  team_size      INT NOT NULL DEFAULT 2,      -- players per team: 2, 3, 4, 5 …
  format         VARCHAR(20)  NOT NULL DEFAULT 'round_robin',
                 -- 'round_robin' | 'knockout' | 'group_knockout'
  num_teams      INT NOT NULL DEFAULT 8,      -- expected total teams
  status         VARCHAR(20)  NOT NULL DEFAULT 'draft',
                 -- 'draft' | 'active' | 'completed'
  settings       JSONB        NOT NULL DEFAULT '{}',
                 -- {
                 --   best_player_enabled: bool,
                 --   golden_boot_enabled: bool,
                 --   affects_main_stats:  bool   (default false — isolated)
                 -- }
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DUO TEAMS  (teams inside a tournament)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duo_teams (
  id             SERIAL PRIMARY KEY,
  tournament_id  INT NOT NULL REFERENCES duo_tournaments(id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  played         INT DEFAULT 0,
  won            INT DEFAULT 0,
  drawn          INT DEFAULT 0,
  lost           INT DEFAULT 0,
  gf             INT DEFAULT 0,   -- individual match wins FOR
  ga             INT DEFAULT 0,   -- individual match wins AGAINST
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duo_teams_tournament ON duo_teams(tournament_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DUO TEAM PLAYERS  (which existing player is on which duo team)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duo_team_players (
  id             SERIAL PRIMARY KEY,
  tournament_id  INT NOT NULL REFERENCES duo_tournaments(id) ON DELETE CASCADE,
  team_id        INT NOT NULL REFERENCES duo_teams(id)        ON DELETE CASCADE,
  player_id      INT NOT NULL REFERENCES players(id)          ON DELETE CASCADE,
  slot           INT NOT NULL DEFAULT 1,   -- 1..team_size, display order
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, player_id)        -- one player per tournament
);
CREATE INDEX IF NOT EXISTS idx_duo_team_players_team ON duo_team_players(team_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DUO FIXTURES  (team-level match schedule)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duo_fixtures (
  id                     SERIAL PRIMARY KEY,
  tournament_id          INT NOT NULL REFERENCES duo_tournaments(id) ON DELETE CASCADE,
  round                  INT NOT NULL,
  home_team_id           INT REFERENCES duo_teams(id) ON DELETE SET NULL,
  away_team_id           INT REFERENCES duo_teams(id) ON DELETE SET NULL,
  home_score             INT DEFAULT 0,     -- individual wins for home
  away_score             INT DEFAULT 0,     -- individual wins for away
  status                 VARCHAR(20) DEFAULT 'upcoming',  -- 'upcoming' | 'completed'
  winner_team_id         INT REFERENCES duo_teams(id) ON DELETE SET NULL,
  -- Knockout tiebreaker
  is_tiebreaker_needed   BOOLEAN DEFAULT FALSE,
  tiebreaker_home_player INT REFERENCES players(id) ON DELETE SET NULL,
  tiebreaker_away_player INT REFERENCES players(id) ON DELETE SET NULL,
  tiebreaker_result      VARCHAR(10),   -- 'home' | 'away'
  -- Knockout bracket positioning
  bracket_position       INT,           -- slot in the bracket (1-indexed per round)
  next_fixture_id        INT REFERENCES duo_fixtures(id) ON DELETE SET NULL,
  scheduled_date         DATE DEFAULT CURRENT_DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duo_fixtures_tournament ON duo_fixtures(tournament_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DUO MATCH RECORDS  (individual 1v1 results inside a team fixture)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duo_match_records (
  id               SERIAL PRIMARY KEY,
  fixture_id       INT NOT NULL REFERENCES duo_fixtures(id) ON DELETE CASCADE,
  tournament_id    INT NOT NULL REFERENCES duo_tournaments(id) ON DELETE CASCADE,
  home_player_id   INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  away_player_id   INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  home_score       INT NOT NULL DEFAULT 0,
  away_score       INT NOT NULL DEFAULT 0,
  result           VARCHAR(10) NOT NULL,   -- 'home' | 'away' | 'draw'
  slot             INT NOT NULL DEFAULT 1, -- matchup slot 1..team_size
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duo_match_records_fixture    ON duo_match_records(fixture_id);
CREATE INDEX IF NOT EXISTS idx_duo_match_records_home_player ON duo_match_records(home_player_id);
CREATE INDEX IF NOT EXISTS idx_duo_match_records_away_player ON duo_match_records(away_player_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- KNOCKOUT DOUBLE-LEG SUPPORT (added post-initial migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- leg_number: 1 = first leg, 2 = second leg (home/away swapped)
-- tie_group:  shared integer for Leg 1 + Leg 2 fixtures of the same knockout tie
ALTER TABLE duo_fixtures ADD COLUMN IF NOT EXISTS leg_number INTEGER DEFAULT 1;
ALTER TABLE duo_fixtures ADD COLUMN IF NOT EXISTS tie_group  INTEGER;
CREATE INDEX IF NOT EXISTS idx_duo_fixtures_tie_group
  ON duo_fixtures(tie_group) WHERE tie_group IS NOT NULL;
`

async function migrate() {
  console.log("Running Duo migration…")
  try {
    await query(SQL)
    console.log("✅ Duo tables created successfully.")
  } catch (err) {
    console.error("Migration failed:", err)
    process.exit(1)
  }
  process.exit(0)
}

migrate()