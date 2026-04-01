import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchJudges,
  createJudge,
  updateJudge,
  deleteJudge,
} from "@/lib/firestore";
import type { JudgeFormData } from "@/types/judge";

export function useJudges() {
  return useQuery({
    queryKey: ["judges"],
    queryFn: fetchJudges,
  });
}

export function useCreateJudge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JudgeFormData) => createJudge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges"] });
    },
  });
}

export function useUpdateJudge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JudgeFormData> }) =>
      updateJudge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges"] });
    },
  });
}

export function useDeleteJudge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJudge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges"] });
    },
  });
}
