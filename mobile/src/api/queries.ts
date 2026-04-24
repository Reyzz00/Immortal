import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { api } from "@/api/client";
import type {
  CheckInPrompt,
  CheckInQuestion,
  Experiment,
  Insight,
  Recommendation,
  TrendSeries,
  UserState,
} from "@/types";

export const qk = {
  state: ["user", "state"] as const,
  recs: ["recommendations", "today"] as const,
  insights: ["insights", "feed"] as const,
  checkin: ["checkin", "prompt"] as const,
  experiments: ["experiments"] as const,
  trend: (metric: string, days: number) => ["trend", metric, days] as const,
};

export function useUserState(opts?: Partial<UseQueryOptions<UserState>>) {
  return useQuery<UserState>({
    queryKey: qk.state,
    queryFn: () => api<UserState>("/user/state"),
    ...opts,
  });
}

export function useRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: qk.recs,
    queryFn: () => api<Recommendation[]>("/recommendations/today"),
  });
}

export function useInsights() {
  return useQuery<Insight[]>({
    queryKey: qk.insights,
    queryFn: () => api<Insight[]>("/insights/feed"),
  });
}

export function useCheckInPrompt() {
  return useQuery<CheckInPrompt>({
    queryKey: qk.checkin,
    queryFn: () => api<CheckInPrompt>("/checkin/prompt"),
    staleTime: 0,
  });
}

export function useExperiments() {
  return useQuery<Experiment[]>({
    queryKey: qk.experiments,
    queryFn: () => api<Experiment[]>("/experiments"),
  });
}

export function useTrend(metric: string, days = 30) {
  return useQuery<TrendSeries>({
    queryKey: qk.trend(metric, days),
    queryFn: () => api<TrendSeries>(`/trends/${metric}?days=${days}`),
  });
}

export function useRecommendationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "ignore" }) =>
      api<Recommendation>(`/recommendations/${id}/${action}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recs }),
  });
}

export function useSubmitCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      answers: Record<string, unknown>;
      questions_asked: CheckInQuestion[];
    }) =>
      api<{ status: string; inferred: Record<string, unknown> }>(`/checkin/submit`, {
        method: "POST",
        body: JSON.stringify({ user_id: 1, ...payload }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.checkin });
      qc.invalidateQueries({ queryKey: qk.insights });
    },
  });
}

export function useStartExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      hypothesis: string;
      outcome_metric: string;
      duration_days: number;
    }) =>
      api<Experiment>("/experiments/start", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, ...payload }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.experiments }),
  });
}
