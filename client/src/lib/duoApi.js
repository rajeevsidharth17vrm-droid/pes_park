/**
 * duoApi.js — Duo (Dynamic Team Tournament) API client
 */
import api from "./api.js"

const BASE = "/duo"

export const duoApi = {
  // ── Tournaments ──────────────────────────────────────────────────────────
  listTournaments: (season) =>
    api.get(`${BASE}/tournaments`, { params: season ? { season } : {} }).then(r => r.data),

  createTournament: (body) =>
    api.post(`${BASE}/tournaments`, body).then(r => r.data),

  getTournament: (id) =>
    api.get(`${BASE}/tournaments/${id}`).then(r => r.data),

  updateTournament: (id, body) =>
    api.patch(`${BASE}/tournaments/${id}`, body).then(r => r.data),

  deleteTournament: (id) =>
    api.delete(`${BASE}/tournaments/${id}`).then(r => r.data),

  completeTournament: (id) =>
    api.patch(`${BASE}/tournaments/${id}/complete`).then(r => r.data),

  // ── Teams ────────────────────────────────────────────────────────────────
  listTeams: (tournamentId) =>
    api.get(`${BASE}/tournaments/${tournamentId}/teams`).then(r => r.data),

  createTeam: (tournamentId, name) =>
    api.post(`${BASE}/tournaments/${tournamentId}/teams`, { name }).then(r => r.data),

  updateTeam: (tournamentId, teamId, name) =>
    api.patch(`${BASE}/tournaments/${tournamentId}/teams/${teamId}`, { name }).then(r => r.data),

  deleteTeam: (tournamentId, teamId) =>
    api.delete(`${BASE}/tournaments/${tournamentId}/teams/${teamId}`).then(r => r.data),

  // ── Team Players ─────────────────────────────────────────────────────────
  addPlayer: (tournamentId, teamId, player_id, slot) =>
    api.post(`${BASE}/tournaments/${tournamentId}/teams/${teamId}/players`, { player_id, slot }).then(r => r.data),

  removePlayer: (tournamentId, teamId, playerId) =>
    api.delete(`${BASE}/tournaments/${tournamentId}/teams/${teamId}/players/${playerId}`).then(r => r.data),

  // ── Fixtures ─────────────────────────────────────────────────────────────
  generateFixtures: (tournamentId) =>
    api.post(`${BASE}/tournaments/${tournamentId}/fixtures/generate`).then(r => r.data),

  deleteFixtures: (tournamentId) =>
    api.delete(`${BASE}/tournaments/${tournamentId}/fixtures`).then(r => r.data),

  listFixtures: (tournamentId) =>
    api.get(`${BASE}/tournaments/${tournamentId}/fixtures`).then(r => r.data),

  getFixture: (fixtureId) =>
    api.get(`${BASE}/fixtures/${fixtureId}`).then(r => r.data),

  saveResult: (fixtureId, matchups) =>
    api.patch(`${BASE}/fixtures/${fixtureId}/result`, { matchups }).then(r => r.data),

  resetFixture: (fixtureId) =>
    api.patch(`${BASE}/fixtures/${fixtureId}/reset`).then(r => r.data),

  setTiebreaker: (fixtureId, body) =>
    api.patch(`${BASE}/fixtures/${fixtureId}/tiebreaker`, body).then(r => r.data),

  // ── Group Knockout ───────────────────────────────────────────────────────
  drawGroups: (tournamentId, body) =>
    api.post(`${BASE}/tournaments/${tournamentId}/draw-groups`, body).then(r => r.data),

  generateGroupFixtures: (tournamentId) =>
    api.post(`${BASE}/tournaments/${tournamentId}/generate-group-fixtures`).then(r => r.data),

  getGroupStandings: (tournamentId) =>
    api.get(`${BASE}/tournaments/${tournamentId}/group-standings`).then(r => r.data),

  generateKnockout: (tournamentId, body) =>
    api.post(`${BASE}/tournaments/${tournamentId}/generate-knockout`, body).then(r => r.data),

  deleteKnockoutFixtures: (tournamentId) =>
    api.delete(`${BASE}/tournaments/${tournamentId}/fixtures/knockout`).then(r => r.data),

  listFixturesByStage: (tournamentId, stage) =>
    api.get(`${BASE}/tournaments/${tournamentId}/fixtures`, { params: { stage } }).then(r => r.data),

  // ── Stats ────────────────────────────────────────────────────────────────
  getStandings: (tournamentId) =>
    api.get(`${BASE}/tournaments/${tournamentId}/standings`).then(r => r.data),

  getTopScorers: (tournamentId) =>
    api.get(`${BASE}/tournaments/${tournamentId}/top-scorers`).then(r => r.data),
}