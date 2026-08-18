"use client";

import { WifiOff, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { cn } from "@/lib/utils";

export function OfflineSyncBanner({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing, syncQueue } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3",
        !isOnline
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-blue-200 bg-blue-50 text-blue-900",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4 shrink-0" />
        {!isOnline ? (
          <span>
            Du er offline.{" "}
            {pendingCount > 0 && `${pendingCount} registrering${pendingCount > 1 ? "er" : ""} venter.`}
          </span>
        ) : (
          <span>
            {pendingCount} registrering{pendingCount > 1 ? "er" : ""} venter på synkronisering.
          </span>
        )}
      </div>

      {pendingCount > 0 && isOnline && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => syncQueue()}
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          {isSyncing ? "Synkroniserer..." : "Synkroniser nå"}
        </Button>
      )}
    </div>
  );
}
