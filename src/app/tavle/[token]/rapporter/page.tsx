import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UePortalClient } from "@/features/hms-tavle/components/ue-portal-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meld inn avvik – UE-portal",
  description: "Underentreprenør-portal for innsending av avvik, RUH og SJA",
  robots: { index: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UePortalPage({ params }: Props) {
  const { token } = await params;
  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    include: {
      subcontractorPortal: true,
      tenant: { select: { name: true } },
      project: { select: { name: true, location: true } },
    },
  });

  if (!tavle || !tavle.isPublic) notFound();

  const portal = tavle.subcontractorPortal;
  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">UE-portal ikke aktivert</h1>
          <p className="text-muted-foreground text-sm">
            Kontakt prosjektleder for å aktivere underentreprenør-portalen.
          </p>
        </div>
      </div>
    );
  }

  const subscription = await prisma.hmsTavleSubscription.findUnique({
    where: { tenantId: tavle.tenantId },
  });

  if (!subscription || subscription.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Tavle-abonnement utløpt</h1>
          <p className="text-muted-foreground text-sm">Kontakt prosjektleder.</p>
        </div>
      </div>
    );
  }

  return (
    <UePortalClient
      portalToken={portal.portalToken}
      brandColor={tavle.brandColor}
      logoUrl={tavle.logoUrl}
      tenantName={tavle.tenant.name}
      projectName={tavle.project?.name}
      projectLocation={tavle.project?.location}
      allowAvvik={portal.allowAvvik}
      allowRuh={portal.allowRuh}
      allowSja={portal.allowSja}
      allowPdfUpload={portal.allowPdfUpload}
      requireEmail={portal.requireEmail}
      publicToken={token}
    />
  );
}
