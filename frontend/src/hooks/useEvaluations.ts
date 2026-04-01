import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvaluations } from "@/lib/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { EvaluationFilters, EvaluationStats } from "@/types/evaluation";

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
    mutationFn: async (params: { queueId: string; judgeId?: string }) => {
      const callable = httpsCallable<
        { queueId: string; judgeId?: string },
        { total: number; succeeded: number; failed: number; evaluationIds: string[] }
      >(functions, "runBatchEvaluation");
      const result = await callable(params);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}
