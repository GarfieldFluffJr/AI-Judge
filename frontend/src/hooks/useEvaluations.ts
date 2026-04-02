import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvaluations } from "@/lib/firestore";
import {
  runBatchEvaluation,
  type BatchResult,
} from "@/lib/evaluationRunner";
import type { EvaluationFilters, EvaluationStats } from "@/types/evaluation";
import type { Judge } from "@/types/judge";

export function useEvaluations(filters: EvaluationFilters = {}) {
  return useQuery({
    queryKey: ["evaluations", filters],
    queryFn: () => fetchEvaluations(filters),
  });
}

export function useEvaluationStats(filters: EvaluationFilters = {}): {
  data: EvaluationStats | undefined;
  isLoading: boolean;
} {
  const { data: evaluations, isLoading } = useEvaluations(filters);

  const stats: EvaluationStats | undefined = evaluations
    ? {
        total: evaluations.length,
        pass: evaluations.filter((e) => e.verdict === "pass").length,
        fail: evaluations.filter((e) => e.verdict === "fail").length,
        inconclusive: evaluations.filter((e) => e.verdict === "inconclusive")
          .length,
        passRate:
          evaluations.length > 0
            ? Math.round(
                (evaluations.filter((e) => e.verdict === "pass").length /
                  evaluations.length) *
                  100
              )
            : 0,
      }
    : undefined;

  return { data: stats, isLoading };
}

export function useRunBatchEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      queueId: string;
      queueName: string;
      judges: Judge[];
      onProgress?: (completed: number, total: number) => void;
    }): Promise<BatchResult> => {
      return runBatchEvaluation(
        params.queueId,
        params.queueName,
        params.judges,
        params.onProgress
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}
