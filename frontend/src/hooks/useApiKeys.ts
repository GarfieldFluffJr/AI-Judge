import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApiKeys, saveApiKey } from "@/lib/firestore";
import type { Provider } from "@/types/api-keys";

export function useApiKeys() {
  return useQuery({
    queryKey: ["apiKeys"],
    queryFn: fetchApiKeys,
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: Provider; key: string }) =>
      saveApiKey(provider, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });
}
