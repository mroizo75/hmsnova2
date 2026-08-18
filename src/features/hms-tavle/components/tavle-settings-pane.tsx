"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, CheckCircle2, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ActivateTavleAddonButton } from "./activate-addon-button";

interface TavleSettingsPaneProps {
  subscription: {
    plan: string;
    status: string;
    pricePerMonth: number;
    isAddon: boolean;
    endsAt: string;
    maxTavler: number;
  } | null;
  tavleCount: number;
  isAdmin: boolean;
}

export function TavleSettingsPane({
  subscription,
  tavleCount,
  isAdmin,
}: TavleSettingsPaneProps) {
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Kun admin kan administrere HMS Tavle-abonnement.
        </CardContent>
      </Card>
    );
  }

  if (subscription) {
    const isActive =
      subscription.status !== "EXPIRED" && subscription.status !== "CANCELLED";

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      TRIAL: { label: "Prøveperiode", variant: "secondary" },
      ACTIVE: { label: "Aktiv", variant: "default" },
      EXPIRING_SOON: { label: "Utløper snart", variant: "outline" },
      EXPIRED: { label: "Utløpt", variant: "destructive" },
      CANCELLED: { label: "Kansellert", variant: "destructive" },
    };

    const statusInfo = statusMap[subscription.status] ?? {
      label: subscription.status,
      variant: "secondary" as const,
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4 text-blue-600" />
              Digital HMS Tavle
            </CardTitle>
            <CardDescription>
              Ditt HMS Tavle-abonnement og status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-semibold">
                  {subscription.plan === "ADDON"
                    ? "HMS Nova Add-on"
                    : subscription.plan}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pris</p>
                <p className="font-semibold">
                  kr {subscription.pricePerMonth}/mnd
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tavler</p>
                <p className="font-semibold">
                  {tavleCount} av{" "}
                  {subscription.maxTavler >= 999
                    ? "ubegrenset"
                    : subscription.maxTavler}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? `Gyldig til ${new Date(subscription.endsAt).toLocaleDateString("nb-NO")}`
                  : "Abonnementet er ikke aktivt"}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/hms-tavle">
                  <Monitor className="mr-1.5 h-3.5 w-3.5" />
                  Gå til HMS Tavle
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-5 w-5 text-blue-600" />
            Digital HMS Tavle
          </CardTitle>
          <CardDescription>
            Aktiver Digital HMS Tavle som tillegg til ditt HMS Nova-abonnement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digital HMS Tavle gir deg en digital informasjonstavle for
            byggeplassen, hotellet eller arbeidsplassen. QR-tilgang,
            UE-portal, kiosk-modus og mer.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "QR-innsjekk for mannskap",
              "UE-portal for avvik og SJA",
              "Kiosk-modus på storskjerm",
              "Live data fra HMS Nova",
              "Værvarsling og beredskap",
              "Lovkrav-sjekkliste",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                {feature}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-lg">
                kr 290<span className="text-sm font-normal text-muted-foreground">/mnd</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Legges til eksisterende HMS Nova-abonnement
              </p>
            </div>
            <div className="flex gap-2">
              <ActivateTavleAddonButton />
              <Button variant="outline" size="default" asChild>
                <Link href="/digital-hms-tavle">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Les mer
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
