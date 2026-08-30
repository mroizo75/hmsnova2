"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";

/** Serverdata fra RSC overstyrer stale cache når siden refreshes etter lagring. */
export function useServerQuery<T>({
  queryKey,
  queryFn,
  initialData,
  refetchInterval,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  initialData: T;
  refetchInterval?: number | false;
}): UseQueryResult<T> {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueryData(queryKey, initialData);
  }, [queryClient, initialData]);

  return useQuery({
    queryKey,
    queryFn,
    initialData,
    refetchInterval,
  });
}
