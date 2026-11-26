"use client";

import { Circle, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import type { OnlinePresenceSnapshot, OnlinePresenceUser } from "@/lib/presence";

function formatSeen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "nå";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t siden`;
  return `${Math.floor(hours / 24)} d siden`;
}

function PresenceList({
  users,
  hiddenCount,
  emptyText,
}: {
  users: OnlinePresenceUser[];
  hiddenCount: number;
  emptyText: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border">
        {users.map((user) => (
          <li key={user.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                <Circle
                  className={cn(
                    "h-2 w-2 shrink-0 fill-current",
                    user.isStaff ? "text-blue-600" : "text-green-600",
                  )}
                />
                <span className="truncate">{user.name || user.email}</span>
                {user.isStaff && <Shield className="h-3.5 w-3.5 text-blue-600" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.companies.length > 0 ? user.companies.join(", ") : user.email}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatSeen(user.lastSeenAt)}</span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Viser {users.length} av {users.length + hiddenCount}.
        </p>
      )}
    </div>
  );
}

export function OnlinePresenceCard({ initial }: { initial: OnlinePresenceSnapshot }) {
  const live = useOnlinePresence();
  const data = live ?? initial;
  const safe = data.safeToUpgrade;
  const activeUsers = data.activeUsers ?? [];
  const idleUsers = data.idleUsers ?? [];
  const hiddenActiveCount = data.hiddenActiveCount ?? 0;
  const hiddenIdleCount = data.hiddenIdleCount ?? 0;
  const loggedInCustomerCount = data.loggedInCustomerCount ?? data.onlineCustomerCount;
  const loggedInStaffCount = data.loggedInStaffCount ?? data.onlineStaffCount;
  const loggedInWindowHours = data.loggedInWindowHours ?? 12;

  return (
    <Card className={cn(safe ? "border-green-200" : "border-amber-300")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Hvem er inne</span>
          <Badge
            variant="secondary"
            className={cn(safe ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}
          >
            {safe ? "Trygt å oppgradere" : "Vent med oppgradering"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Aktive har brukt systemet de siste {data.windowMinutes} minuttene. Innlogget er pålogget de
          siste {loggedInWindowHours} timene. Oppdateres automatisk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Aktive kunder</p>
            <p className="text-2xl font-bold">{data.onlineCustomerCount}</p>
            <p className="text-xs text-muted-foreground">{data.onlineStaffCount} admin/support</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Innloggede kunder</p>
            <p className="text-2xl font-bold">{loggedInCustomerCount}</p>
            <p className="text-xs text-muted-foreground">{loggedInStaffCount} admin/support</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Aktive nå</h3>
          <PresenceList
            users={activeUsers}
            hiddenCount={hiddenActiveCount}
            emptyText="Ingen bruker systemet akkurat nå."
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Innlogget, ikke aktive</h3>
          <PresenceList
            users={idleUsers}
            hiddenCount={hiddenIdleCount}
            emptyText="Ingen andre er innlogget."
          />
        </section>

        {!safe && (
          <p className="text-sm text-amber-800">
            Vent til de aktive kundene er ferdige, slik at de ikke mister arbeidet under oppgradering.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
