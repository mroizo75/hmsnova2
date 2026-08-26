"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Plus,
  QrCode,
  Users,
  Eye,
  Settings,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import type { HmsTavleSubscriptionStatus } from "@prisma/client";
import { ActivateTavleAddonButton } from "@/features/hms-tavle/components/activate-addon-button";
import { fetchHmsTavleList } from "@/server/queries/hms-tavle.queries";

type HmsTavleListData = NonNullable<Awaited<ReturnType<typeof fetchHmsTavleList>>>;

interface HmsTavleListContentProps {
  initialData: HmsTavleListData;
  canManage: boolean;
}

function statusBadge(status: HmsTavleSubscriptionStatus) {
  const map: Record<HmsTavleSubscriptionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    TRIAL: { label: "Prøveperiode", variant: "secondary" },
    ACTIVE: { label: "Aktiv", variant: "default" },
    EXPIRING_SOON: { label: "Utløper snart", variant: "outline" },
    EXPIRED: { label: "Utløpt", variant: "destructive" },
    CANCELLED: { label: "Kansellert", variant: "destructive" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function HmsTavleListContent({ initialData, canManage }: HmsTavleListContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchHmsTavleList(),
    initialData,
  });

  if (!data) return null;

  const { tavler, subscription, todayCheckins } = data;

  const hasActiveSub =
    subscription && subscription.status !== "EXPIRED" && subscription.status !== "CANCELLED";

  return (
    <>
      {subscription ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Abonnement</p>
                  <p className="font-semibold">{PLAN_LABELS[subscription.plan]}</p>
                </div>
                {statusBadge(subscription.status)}
                {subscription.isAddon && (
                  <Badge variant="outline" className="text-xs">
                    HMS Nova tillegg
                  </Badge>
                )}
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{tavler.length}</span> tavle(r)
                </span>
                <span>
                  <span className="font-medium text-foreground">{todayCheckins}</span> innsjekk i dag
                </span>
                <span>
                  Utløper{" "}
                  <span className="font-medium text-foreground">
                    {new Date(subscription.endsAt).toLocaleDateString("nb-NO")}
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Ingen HMS Tavle-abonnement</h3>
              <p className="text-muted-foreground mt-1">
                Aktiver Digital HMS Tavle som tillegg til ditt eksisterende HMS Nova-abonnement,
                eller registrer deg for kun tavle-tilgang.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              {canManage && <ActivateTavleAddonButton />}
              <Button variant="outline" asChild>
                <Link href="/tavle-registrering">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Kun tavle-abonnement
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasActiveSub && (
        <>
          {tavler.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center space-y-4">
                <Monitor className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Ingen tavler opprettet ennå</h3>
                  <p className="text-muted-foreground text-sm">
                    Opprett din første digitale HMS-tavle for et prosjekt eller byggeplass.
                  </p>
                </div>
                {canManage && (
                  <Button asChild>
                    <Link href="/dashboard/hms-tavle/ny">
                      <Plus className="h-4 w-4 mr-2" />
                      Opprett første tavle
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tavler.map((tavle: any) => (
                <Card key={tavle.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tavle.brandColor ?? "#2563eb" }}
                        />
                        <CardTitle className="text-base">{tavle.name}</CardTitle>
                      </div>
                      <Badge variant={tavle.isPublic ? "default" : "secondary"} className="text-xs">
                        {tavle.isPublic ? "Offentlig" : "Privat"}
                      </Badge>
                    </div>
                    {tavle.project && (
                      <p className="text-xs text-muted-foreground">
                        Prosjekt: {tavle.project.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Monitor className="h-3.5 w-3.5" />
                        {tavle.sections.filter((s: any) => s.isVisible).length} seksjoner
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {tavle._count.checkins} innsjekk
                      </span>
                      {tavle.subcontractorPortal && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          UE-portal
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/hms-tavle/${tavle.id}`}>
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Administrer
                        </Link>
                      </Button>
                      {tavle.isPublic && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/tavle/${tavle.publicToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Vis tavle
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/hms-tavle/${tavle.id}?tab=qr`}>
                          <QrCode className="h-3.5 w-3.5 mr-1" />
                          QR-kode
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!subscription && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Monitor,
              title: "Enkel – kr 390/mnd",
              desc: "Kontaktinfo, SHA-lenke, dokumenthub. Perfekt for enkle prosjekter.",
            },
            {
              icon: QrCode,
              title: "Standard – kr 590/mnd",
              desc: "Alle seksjoner, UE-portal for innsending uten konto, QR-innsjekk.",
            },
            {
              icon: CheckCircle2,
              title: "Avansert – kr 790/mnd",
              desc: "Kiosk-modus, AI-innsikt, lovkrav-sjekkliste, ubegrenset antall tavler.",
            },
          ].map((plan) => (
            <Card key={plan.title}>
              <CardContent className="p-5 space-y-2">
                <plan.icon className="h-8 w-8 text-blue-600" />
                <p className="font-semibold">{plan.title}</p>
                <p className="text-sm text-muted-foreground">{plan.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
