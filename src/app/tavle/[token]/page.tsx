import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TavlePublicDisplay } from "@/features/hms-tavle/components/tavle-public-display";
import { getGuestServiceStats } from "@/features/hms-tavle/lib/gjesteservice-stats";
import { getTavleLiveData } from "@/features/hms-tavle/lib/tavle-live-data";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ kiosk?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    select: { name: true, tenant: { select: { name: true } } },
  });

  if (!tavle) return { title: "HMS Tavle" };

  return {
    title: `${tavle.name} – Digital HMS Tavle`,
    description: `HMS-informasjon for ${tavle.tenant.name}`,
    robots: { index: false },
  };
}

export default async function PublicTavlePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { kiosk } = await searchParams;
  const tavle = await prisma.hmsTavle.findUnique({
    where: { publicToken: token },
    include: {
      sections: { where: { isVisible: true }, orderBy: { order: "asc" } },
      externalLinks: { orderBy: { order: "asc" } },
      subcontractorPortal: {
        select: {
          portalToken: true,
          allowAvvik: true,
          allowRuh: true,
          allowSja: true,
          allowPdfUpload: true,
        },
      },
      tenant: { select: { name: true } },
      project: {
        select: {
          name: true,
          location: true,
          constructionShaPlan: {
            select: { status: true, availableOnSite: true, updatedAt: true },
          },
          constructionPreNotification: { select: { status: true, sentAt: true } },
        },
      },
    },
  });

  if (!tavle) notFound();
  if (!tavle.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">Tavle ikke tilgjengelig</h1>
          <p className="text-muted-foreground mt-2">Denne tavlen er ikke offentlig aktivert.</p>
        </div>
      </div>
    );
  }

  const subscription = await prisma.hmsTavleSubscription.findUnique({
    where: { tenantId: tavle.tenantId },
  });

  if (!subscription || subscription.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">Abonnement utløpt</h1>
          <p className="text-muted-foreground mt-2">
            HMS Tavle-abonnementet er utløpt. Kontakt prosjektleder.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const checkins = await prisma.tavleCheckin.findMany({
    where: { tavleId: tavle.id, date: today },
    orderBy: { checkedInAt: "asc" },
    select: {
      id: true,
      name: true,
      employer: true,
      checkedInAt: true,
      checkedOutAt: true,
      date: true,
    },
  });

  const forceKiosk = kiosk === "1";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hmsnova.no";

  // Kun anonymiserte tall – aldri saksinnhold på offentlig tavle
  const harTillitspanel = tavle.sections.some((s) => s.type === "GJESTESERVICE_STATUS");
  const guestStats = harTillitspanel ? await getGuestServiceStats(tavle.id) : null;

  // Live HMS Nova-data er forbeholdt planer med full integrasjon
  const liveData =
    getPlanLimits(subscription.plan).hasLiveHmsNovaData
      ? await getTavleLiveData({
          tenantId: tavle.tenantId,
          projectId: tavle.projectId,
          sectionTypes: tavle.sections.map((s) => s.type),
        })
      : null;

  return (
    <TavlePublicDisplay
      tavle={JSON.parse(JSON.stringify(tavle))}
      checkins={JSON.parse(JSON.stringify(checkins))}
      plan={subscription.plan}
      publicToken={token}
      forceKiosk={forceKiosk || tavle.kioskMode}
      appUrl={appUrl}
      guestStats={guestStats}
      liveData={liveData}
    />
  );
}
