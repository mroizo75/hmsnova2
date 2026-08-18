"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  listPending,
  remove,
  count as countPending,
  offlinePayloadToFormData,
  type OfflineQueueEntry,
  type OfflineEntryType,
} from "@/lib/offline-queue";
import { useToast } from "@/hooks/use-toast";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

interface UseOfflineQueueOptions {
  typeFilter?: OfflineEntryType;
}

interface SyncResult {
  success: number;
  failed: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptWithRetry(
  fn: () => Promise<Response>,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fn();
      if (response.ok || response.status < 500) return response;
      if (attempt < retries) {
        await wait(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) throw error;
      await wait(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  throw new Error("Exhausted retries");
}

export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const { typeFilter } = options;
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      if (typeFilter) {
        const all = await listPending();
        setPendingCount(all.filter((e) => e.type === typeFilter).length);
      } else {
        const n = await countPending();
        setPendingCount(n);
      }
    } catch {
      setPendingCount(0);
    }
  }, [typeFilter]);

  useEffect(() => {
    refreshCount();

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncLock.current) {
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const syncQueue = useCallback(async (): Promise<SyncResult> => {
    if (syncLock.current) return { success: 0, failed: 0 };
    syncLock.current = true;
    setIsSyncing(true);

    const result: SyncResult = { success: 0, failed: 0 };

    try {
      const entries = await listPending();
      const filtered = typeFilter
        ? entries.filter((e) => e.type === typeFilter)
        : entries;

      for (const entry of filtered) {
        try {
          if (entry.type === "inspection_finding") {
            await syncInspectionFinding(entry);
          } else {
            await syncFormDataEntry(entry);
          }
          await remove(entry.id);
          result.success++;
        } catch {
          result.failed++;
        }
      }

      if (result.success > 0) {
        toast({
          title: `${result.success} registrering${result.success > 1 ? "er" : ""} synkronisert`,
          description: "Offline-køen er sendt til serveren.",
          className: "bg-green-50 border-green-200",
        });
      }

      if (result.failed > 0) {
        toast({
          title: `${result.failed} registrering${result.failed > 1 ? "er" : ""} feilet`,
          description: "Prøver igjen automatisk neste gang du er online.",
          variant: "destructive",
        });
      }
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
      await refreshCount();
    }

    return result;
  }, [typeFilter, toast, refreshCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncQueue,
    refreshCount,
  };
}

async function syncFormDataEntry(entry: OfflineQueueEntry): Promise<void> {
  const formData = offlinePayloadToFormData(entry);
  const response = await attemptWithRetry(() =>
    fetch(entry.endpoint, { method: "POST", body: formData }),
  );
  if (!response.ok) {
    throw new Error(`Server responded ${response.status}`);
  }
}

async function syncInspectionFinding(entry: OfflineQueueEntry): Promise<void> {
  const existingKeys = Array.isArray(entry.payload.imageKeys)
    ? (entry.payload.imageKeys as string[])
    : [];
  const newImageKeys: string[] = [];

  for (const file of entry.files) {
    const uploadForm = new FormData();
    uploadForm.append("file", new File([file.blob], file.name, { type: file.type }));
    uploadForm.append("inspectionId", entry.meta?.inspectionId ?? "");

    const uploadRes = await attemptWithRetry(() =>
      fetch(entry.meta?.uploadEndpoint ?? "/api/inspections/upload", {
        method: "POST",
        body: uploadForm,
      }),
    );

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      newImageKeys.push(uploadData.data.key);
    }
  }

  const findingPayload = {
    ...entry.payload,
    imageKeys: [...existingKeys, ...newImageKeys],
  };

  const response = await attemptWithRetry(() =>
    fetch(entry.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(findingPayload),
    }),
  );

  if (!response.ok) {
    throw new Error(`Server responded ${response.status}`);
  }
}
