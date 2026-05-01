"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toggleBransjekursAvtale, syncTenantToBransjekurs } from "@/server/actions/tenant.actions";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface KursavtaleCardProps {
  tenantId: string;
  tenantName: string;
  bransjekursEnabled: boolean;
  bransjekursActivatedAt: Date | null;
  bransjekursLastSyncAt: Date | null;
  userCount: number;
}

export function KursavtaleCard({
  tenantId,
  tenantName,
  bransjekursEnabled,
  bransjekursActivatedAt,
  bransjekursLastSyncAt,
  userCount,
}: KursavtaleCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleToggle(enable: boolean) {
    setIsToggling(true);
    const result = await toggleBransjekursAvtale(tenantId, enable);

    if (result.success) {
      toast({
        title: enable ? "✅ Kursavtale aktivert" : "Kursavtale deaktivert",
        description: enable
          ? `${tenantName} har nå kursavtale og kan synkes til Bransjekurs.no`
          : "Kursavtalen er fjernet for denne bedriften",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Noe gikk galt",
      });
    }

    setIsToggling(false);
  }

  async function handleSync() {
    setIsSyncing(true);
    const result = await syncTenantToBransjekurs(tenantId);

    if (result.success && result.data) {
      const { created, updated, synced } = result.data;
      toast({
        title: `✅ ${synced} bruker${synced !== 1 ? "e" : ""} synket`,
        description: `${created} nye · ${updated} oppdatert`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Synk feilet",
        description: result.error || "Kunne ikke synke brukere til Bransjekurs.no",
      });
    }

    setIsSyncing(false);
  }

  return (
    <Card className={bransjekursEnabled ? "border-green-500/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Bransjekurs.no
        </CardTitle>
        <CardDescription>
          Kursavtale via HMS Nova – gir tilgang til synk av brukere til Bransjekurs.no
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Avtalestatus</span>
          <Badge variant={bransjekursEnabled ? "default" : "secondary"}>
            {bransjekursEnabled ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aktiv avtale
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Ingen avtale
              </>
            )}
          </Badge>
        </div>

        {bransjekursEnabled && bransjekursActivatedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aktivert</span>
            <span className="text-sm font-medium">
              {format(new Date(bransjekursActivatedAt), "d. MMM yyyy", { locale: nb })}
            </span>
          </div>
        )}

        {/* Synk-seksjon — kun synlig når avtale er aktiv */}
        {bransjekursEnabled && (
          <>
            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Brukere å synke
              </span>
              <span className="text-sm font-medium">{userCount}</span>
            </div>

            {bransjekursLastSyncAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sist synket</span>
                <span className="text-sm font-medium" title={format(new Date(bransjekursLastSyncAt), "d. MMM yyyy HH:mm", { locale: nb })}>
                  {formatDistanceToNow(new Date(bransjekursLastSyncAt), {
                    addSuffix: true,
                    locale: nb,
                  })}
                </span>
              </div>
            )}

            <Button
              className="w-full"
              variant="outline"
              disabled={isSyncing || userCount === 0}
              onClick={handleSync}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synker...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synk {userCount} bruker{userCount !== 1 ? "e" : ""} til Bransjekurs.no
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Synken er trygg å kjøre flere ganger — eksisterende brukere oppdateres, nye opprettes.
            </p>

            <Separator />
          </>
        )}

        {/* Aktiver / deaktiver-knapp */}
        {bransjekursEnabled ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={isToggling}
            onClick={() => handleToggle(false)}
          >
            {isToggling && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Deaktiver kursavtale
          </Button>
        ) : (
          <>
            <Button
              className="w-full"
              disabled={isToggling}
              onClick={() => handleToggle(true)}
            >
              {isToggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aktiver kursavtale
            </Button>
            <p className="text-xs text-muted-foreground">
              Kun bedrifter med aktiv kursavtale kan synkes til Bransjekurs.no. Private brukere
              uten avtale får ikke tilgang via denne integrasjonen.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
