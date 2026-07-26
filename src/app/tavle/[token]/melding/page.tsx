import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { GjestMeldingClient } from "@/features/hms-tavle/components/gjest-melding-client";
import {
  normalizeGuestLocale,
  parseGjesteserviceConfig,
} from "@/features/hms-tavle/lib/gjesteservice-config";
import { isSectionAllowed } from "@/features/hms-tavle/lib/tavle-plan-limits";

export const metadata: Metadata = {
  title: "Meld fra – HMS Tavle",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rom?: string; bord?: string; lang?: string }>;
}

export default async function GjestMeldingPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { rom, bord, lang } = await searchParams;

  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    include: {
      sections: { where: { type: "GJEST_SKJEMA" }, take: 1 },
      tenant: { select: { name: true } },
    },
  });

  if (!tavle || !tavle.isPublic) notFound();

  const subscription = await prisma.hmsTavleSubscription.findUnique({
    where: { tenantId: tavle.tenantId },
  });

  const skjemaSeksjon = tavle.sections[0];
  const erTilgjengelig =
    Boolean(skjemaSeksjon) &&
    Boolean(subscription) &&
    subscription!.status !== "EXPIRED" &&
    isSectionAllowed(subscription!.plan, "GJEST_SKJEMA");

  if (!erTilgjengelig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Skjemaet er ikke tilgjengelig</h1>
          <p className="text-muted-foreground text-sm">
            Kontakt resepsjonen direkte, så hjelper de deg videre.
          </p>
        </div>
      </div>
    );
  }

  const config = parseGjesteserviceConfig(skjemaSeksjon.config);
  const prefilledRoom = (rom ?? bord ?? "").slice(0, 50);

  return (
    <GjestMeldingClient
      publicToken={token}
      tenantName={tavle.tenant.name}
      tavleName={tavle.name}
      logoUrl={tavle.logoUrl}
      brandColor={tavle.brandColor}
      config={config}
      locale={normalizeGuestLocale(lang)}
      prefilledRoom={prefilledRoom}
    />
  );
}
