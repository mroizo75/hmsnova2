import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchIncidentDetail } from "@/server/queries/incident-detail.queries";
import { IncidentDetailContent } from "@/features/incidents/components/incident-detail-content";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("dashboardIncidentDetailPage");
  const locale = await getLocale();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }

  const initialData = await fetchIncidentDetail(id);

  if (!initialData) {
    return <div>{t("errors.notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <IncidentDetailContent
        initialData={initialData}
        incidentId={id}
        userId={user.id}
        locale={locale}
      />
    </div>
  );
}
