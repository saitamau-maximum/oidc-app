import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeResponse } from "../../schema/api/session.ts";
import { api } from "../lib/api.ts";

const meQueryKey = ["me"] as const;

export function useSession() {
  const queryClient = useQueryClient();
  // OIDC のコード交換・ID トークン検証はサーバーで行い、Cookie で照会する。
  const meQuery = useQuery({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => api<MeResponse>("/api/me", { signal }),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      // ログアウト前のリクエストがユーザー情報を復元しないようにする。
      await queryClient.cancelQueries({ queryKey: meQueryKey });
      queryClient.setQueryData<MeResponse>(meQueryKey, (previous) =>
        previous ? { ...previous, user: null } : undefined,
      );
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });

  function reload() {
    logoutMutation.reset();
    return meQuery.refetch();
  }

  return {
    user: meQuery.data?.user ?? null,
    configured: meQuery.data?.loginConfigured ?? false,
    loading: !meQuery.isFetched,
    ready: meQuery.isSuccess,
    busy: meQuery.isFetching || logoutMutation.isPending,
    error: (logoutMutation.error ?? meQuery.error)?.message ?? "",
    reload,
    logout: () => logoutMutation.mutate(),
  };
}

export type SessionState = ReturnType<typeof useSession>;
