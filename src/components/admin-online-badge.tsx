"use client";

import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlinePresence } from "@/hooks/use-online-presence";

export function AdminOnlineBadge() {
  const data = useOnlinePresence();
  if (!data) return null;

  const count = data.onlineCustomerCount;
  const safe = data.safeToUpgrade;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
        safe
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      )}
      title={
        safe
          ? "Ingen kunder er inne. Trygt å oppgradere."
          : `${count} kunde${count === 1 ? "" : "r"} er inne. Vent med oppgradering.`
      }
    >
      <Circle className={cn("h-2 w-2 fill-current", safe ? "text-green-600" : "text-amber-600")} />
      <span className="font-medium">
        {count} inne nå
      </span>
    </div>
  );
}
