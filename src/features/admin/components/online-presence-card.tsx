"use client";

import { Circle, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import type { OnlinePresenceSnapshot } from "@/lib/presence";

function formatSeen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "nå";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min siden`;
}

export function OnlinePresenceCard({ initial }: { initial: OnlinePresenceSnapshot }) {
  const live = useOnlinePresence();
  const data = live ?? initial;
  const safe = data.safeToUpgrade;

  return (
    <Card className={cn(safe ? "border-green-200" : "border-amber-300")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Hvem er inne nå</span>
          <Badge
            variant="secondary"
            className={cn(
              safe ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            )}
          >
            {safe ? "Trygt å oppgradere" : "Vent med oppgradering"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Aktive de siste {data.windowMinutes} minuttene. Oppdateres automatisk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Kunder inne</p>
            <p className="text-2xl font-bold">{data.onlineCustomerCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Admin/support inne</p>
            <p className="text-2xl font-bold">{data.onlineStaffCount}</p>
          </div>
        </div>

        {data.users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen er inne i systemet akkurat nå.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.users.map((user) => (
              <li key={user.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Circle
                      className={cn(
                        "h-2 w-2 shrink-0 fill-current",
                        user.isStaff ? "text-blue-600" : "text-green-600"
                      )}
                    />
                    <span className="truncate">{user.name || user.email}</span>
                    {user.isStaff && (
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.companies.length > 0 ? user.companies.join(", ") : user.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSeen(user.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!safe && (
          <p className="text-sm text-amber-800">
            Vent til kundene er ferdige, slik at de ikke mister arbeidet under oppgradering.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
