import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchQueues,
  fetchQueue,
  fetchSubmissions,
  fetchQuestions,
  uploadQueueData,
} from "@/lib/firestore";
import type { QueueInput } from "@/types/queue";

export function useQueues() {
  return useQuery({
    queryKey: ["queues"],
    queryFn: fetchQueues,
  });
}

export function useQueue(queueId: string) {
  return useQuery({
    queryKey: ["queues", queueId],
    queryFn: () => fetchQueue(queueId),
    enabled: !!queueId,
  });
}

export function useSubmissions(queueId: string) {
  return useQuery({
    queryKey: ["queues", queueId, "submissions"],
    queryFn: () => fetchSubmissions(queueId),
    enabled: !!queueId,
  });
}

export function useQuestions(queueId: string, submissionId: string) {
  return useQuery({
    queryKey: ["queues", queueId, "submissions", submissionId, "questions"],
    queryFn: () => fetchQuestions(queueId, submissionId),
    enabled: !!queueId && !!submissionId,
  });
}

export function useUploadData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queues: QueueInput[]) => uploadQueueData(queues),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
  });
}
