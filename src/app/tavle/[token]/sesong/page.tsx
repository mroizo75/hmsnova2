/**
 * Sesongarbeider HMS-intro – offentlig side tilgjengelig via QR-kode
 *
 * 5 skjermbilder på 4 språk (norsk, engelsk, polsk, tysk) + signatur.
 * Koblet til HMS Tavle via publicToken.
 *
 * Hjemmel: AML § 3-2 (opplæring), IK-HMS § 5 nr. 4 (opplæringsplan)
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SesongOnboardingClient } from "./sesong-onboarding-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    select: { tenant: { select: { name: true } } },
  });
  return {
    title: `HMS-intro for sesongansatte – ${tavle?.tenant.name ?? "HMS Nova"}`,
    robots: { index: false },
  };
}

export default async function SesongIntroPage({ params }: Props) {
  const { token } = await params;

  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      name: true,
      isPublic: true,
      bransje: true,
      manualContacts: true,
      tenant: {
        select: {
          name: true,
          hmsContactName: true,
          hmsContactPhone: true,
          hmsContactEmail: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!tavle || !tavle.isPublic) {
    notFound();
  }

  const contacts = (tavle.manualContacts as { name: string; role: string; phone?: string }[] | null) ?? [];
  const hmsContact = contacts.find((c) =>
    c.role?.toLowerCase().includes("hms") || c.role?.toLowerCase().includes("verneombud")
  ) ?? null;

  return (
    <SesongOnboardingClient
      tavleId={tavle.id}
      tavleNavn={tavle.name}
      tenantNavn={tavle.tenant.name}
      tenantLogoUrl={tavle.tenant.logoUrl}
      bransje={tavle.bransje ?? "GENERELL"}
      hmsContactName={hmsContact?.name ?? tavle.tenant.hmsContactName ?? null}
      hmsContactPhone={hmsContact?.phone ?? tavle.tenant.hmsContactPhone ?? null}
      evacuationPoint={null}
    />
  );
}
