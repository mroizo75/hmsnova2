import { redirect, notFound } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { TavleAdminClient } from "@/features/hms-tavle/components/tavle-admin-client";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TavleAdminPage({ params, searchParams }: Props) {
  const auth = await getAuthContext();
  if (!auth.permissions.canViewHmsTavle) redirect("/dashboard");

  const { id } = await params;
  const { tab } = await searchParams;

  const [tavle, subscription] = await Promise.all([
    prisma.hmsTavle.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        sections: { orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: {
          include: {
            submissions: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        },
        project: {
          include: {
            constructionShaPlan: {
              select: { id: true, status: true, updatedAt: true, availableOnSite: true },
            },
            constructionPreNotification: {
              select: { id: true, status: true, sentAt: true },
            },
            constructionRosterEntries: {
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
        },
        checkins: {
          where: { date: new Date().toISOString().slice(0, 10) },
          orderBy: { checkedInAt: "asc" },
        },
        guestSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    }),
    prisma.hmsTavleSubscription.findUnique({ where: { tenantId: auth.tenantId } }),
  ]);

  if (!tavle) notFound();
  if (!subscription) redirect("/dashboard/hms-tavle");

  // Hent inkludert statistikk for HMS Nova-kunder
  const tenantInfo = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { isTavleOnly: true },
  });

  let hmsStats = null;
  if (!tenantInfo?.isTavleOnly && tavle.projectId) {
    const [openIncidents, openActions] = await Promise.all([
      prisma.incident.count({
        where: {
          tenantId: auth.tenantId,
          projectId: tavle.projectId,
          status: { not: "CLOSED" },
        },
      }),
      prisma.measure.count({
        where: {
          tenantId: auth.tenantId,
          status: { not: "DONE" },
        },
      }),
    ]);
    hmsStats = { openIncidents, openActions };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hmsnova.no";

  return (
    <TavleAdminClient
      tavle={JSON.parse(JSON.stringify(tavle))}
      subscription={JSON.parse(JSON.stringify(subscription))}
      hmsStats={hmsStats}
      canManage={auth.permissions.canManageHmsTavle}
      canReview={auth.permissions.canReviewSubmissions}
      isAddon={subscription.isAddon}
      appUrl={appUrl}
      defaultTab={tab}
    />
  );
}
