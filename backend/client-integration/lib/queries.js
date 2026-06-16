/**
 * lib/queries.js
 *
 * TanStack Query hooks that replace all mockData imports.
 * Usage: swap `import { teams } from "../data/mockData"` for
 *        `const { data: teams = [] } = useTeams()`
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  teamsApi, playersApi, recordsApi, fixturesApi, tradesApi,
} from "./api.js"

// ─── Query key constants (prevents typos) ────────────────────────────────────
export const QK = {
  teams:    ["teams"],
  team:     (id) => ["teams", id],
  players:  (params) => ["players", params ?? {}],
  player:   (id) => ["players", id],
  records:  ["records"],
  fixtures: (params) => ["fixtures", params ?? {}],
  recent:   ["fixtures", "recent"],
  trades:   (params) => ["trades", params ?? {}],
}

// ─── Teams ───────────────────────────────────────────────────────────────────
/** League standings — replaces `teams` from mockData */
export function useTeams() {
  return useQuery({ queryKey: QK.teams, queryFn: teamsApi.list })
}

/** Single team with roster — replaces `myTeamPlayers` for a given team */
export function useTeam(id) {
  return useQuery({
    queryKey: QK.team(id),
    queryFn:  () => teamsApi.get(id),
    enabled:  !!id,
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => teamsApi.update(id, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK.teams }),
  })
}

// ─── Players ─────────────────────────────────────────────────────────────────
/** All players (league-wide) — replaces `players` and `allPlayersAdmin` */
export function usePlayers(params) {
  return useQuery({
    queryKey: QK.players(params),
    queryFn:  () => playersApi.list(params),
  })
}

/** My team's players — replaces `myTeamPlayers` */
export function useMyPlayers(teamId) {
  return useQuery({
    queryKey: QK.players({ teamId }),
    queryFn:  () => playersApi.list({ teamId }),
    enabled:  !!teamId,
  })
}

/** Full player profile with record + match history */
export function usePlayer(id) {
  return useQuery({
    queryKey: QK.player(id),
    queryFn:  () => playersApi.get(id),
    enabled:  !!id,
  })
}

/** Admin: update grade / BDR delta */
export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => playersApi.update(id, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.players() })
      qc.invalidateQueries({ queryKey: QK.player(data.id) })
    },
  })
}

// ─── Match records ────────────────────────────────────────────────────────────
/** All match records — replaces `allMatchRecords` */
export function useRecords() {
  return useQuery({ queryKey: QK.records, queryFn: recordsApi.list })
}

/** Log a new match result */
export function useLogRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      // Invalidate records list, player profiles (MV changed), and standings
      qc.invalidateQueries({ queryKey: QK.records })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.records })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
/** All fixtures (or filtered) — replaces `allFixtures` */
export function useFixtures(params) {
  return useQuery({
    queryKey: QK.fixtures(params),
    queryFn:  () => fixturesApi.list(params),
  })
}

/** Recent 5 completed — replaces `recentFixtures` */
export function useRecentFixtures() {
  return useQuery({ queryKey: QK.recent, queryFn: fixturesApi.recent })
}

export function useSaveFixtureResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, homeScore, awayScore }) => fixturesApi.saveResult(id, homeScore, awayScore),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixtures"] })
      qc.invalidateQueries({ queryKey: QK.teams })    // standings changed
    },
  })
}

export function useCreateFixture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fixturesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixtures"] }),
  })
}

// ─── Trades ──────────────────────────────────────────────────────────────────
/** Trade list for current user — replaces `tradeRequests` and `pendingTradesAdmin` */
export function useTrades(params) {
  return useQuery({
    queryKey: QK.trades(params),
    queryFn:  () => tradesApi.list(params),
  })
}

export function useRequestTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playerId, toTeamId }) => tradesApi.request(playerId, toTeamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  })
}

export function useReviewTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }) => tradesApi.review(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] })
      qc.invalidateQueries({ queryKey: ["players"] }) // player may have moved teams
      qc.invalidateQueries({ queryKey: QK.teams })
    },
  })
}

export function useCancelTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradesApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  })
}
