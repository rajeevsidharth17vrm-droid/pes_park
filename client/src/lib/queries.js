import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teamsApi, playersApi, recordsApi, fixturesApi, tradesApi } from "./api"

export const QK = {
  teams:    ["teams"],
  team:     (id)     => ["teams", id],
  players:  (params) => ["players", params ?? {}],
  player:   (id)     => ["players", id],
  records:  ["records"],
  fixtures: (params) => ["fixtures", params ?? {}],
  recent:   ["fixtures", "recent"],
  trades:   (params) => ["trades", params ?? {}],
}

export const useTeams = () =>
  useQuery({ queryKey: QK.teams, queryFn: teamsApi.list })

export const useTeam = (id) =>
  useQuery({ queryKey: QK.team(id), queryFn: () => teamsApi.get(id), enabled: !!id })

export const usePlayers = (params) =>
  useQuery({ queryKey: QK.players(params), queryFn: () => playersApi.list(params) })

export const useMyPlayers = (teamId) =>
  useQuery({
    queryKey: QK.players({ teamId }),
    queryFn:  () => playersApi.list({ teamId }),
    enabled:  !!teamId,
  })

export const usePlayer = (id) =>
  useQuery({ queryKey: QK.player(id), queryFn: () => playersApi.get(id), enabled: !!id })

export const useUpdatePlayer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => playersApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export const useRecords = () =>
  useQuery({ queryKey: QK.records, queryFn: recordsApi.list })

export const useLogRecord = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.records })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export const useDeleteRecord = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.records })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export const useFixtures = (params) =>
  useQuery({ queryKey: QK.fixtures(params), queryFn: () => fixturesApi.list(params) })

export const useRecentFixtures = () =>
  useQuery({ queryKey: QK.recent, queryFn: fixturesApi.recent })

export const useCreateFixture = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fixturesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixtures"] }),
  })
}

export const useSaveFixtureResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, homeScore, awayScore }) =>
      fixturesApi.saveResult(id, homeScore, awayScore),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixtures"] })
      qc.invalidateQueries({ queryKey: QK.teams })
    },
  })
}

export const useTrades = (params) =>
  useQuery({ queryKey: QK.trades(params), queryFn: () => tradesApi.list(params) })

export const useRequestTrade = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playerId, toTeamId }) => tradesApi.request(playerId, toTeamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  })
}

export const useReviewTrade = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }) => tradesApi.review(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] })
      qc.invalidateQueries({ queryKey: ["players"] })
      qc.invalidateQueries({ queryKey: QK.teams })
    },
  })
}

export const useCancelTrade = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradesApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  })
}
export const useCreateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.teams }),
  })
}

export const useCreatePlayer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: playersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
      qc.invalidateQueries({ queryKey: QK.teams })
    },
  })
}

export const useDeletePlayer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => playersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
      qc.invalidateQueries({ queryKey: QK.teams })
    },
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => teamsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.teams })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export const useUpdateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => teamsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.teams }),
  })
}