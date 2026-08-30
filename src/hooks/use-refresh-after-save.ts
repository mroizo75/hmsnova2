"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

/** Tømmer listecache og laster siden på nytt, slik at det du nettopp lagret vises med en gang. */
export function useRefreshAfterSave() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(
    async (href?: string) => {
      await queryClient.invalidateQueries();
      if (href) {
        router.push(href);
      }
      router.refresh();
    },
    [queryClient, router],
  );
}
