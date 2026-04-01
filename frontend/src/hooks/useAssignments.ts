import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAssignments,
  createAssignment,
  removeAssignment,
} from "@/lib/firestore";

export function useAssignments(queueId: string) {
  return useQuery({
    queryKey: ["assignments", queueId],
    queryFn: () => fetchAssignments(queueId),
    enabled: !!queueId,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      judgeId: string;
      judgeName: string;
      queueId: string;
      questionId: string | null;
      submissionId: string | null;
    }) => createAssignment(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.queueId],
      });
    },
  });
}

export function useRemoveAssignment(queueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", queueId],
      });
    },
  });
}
