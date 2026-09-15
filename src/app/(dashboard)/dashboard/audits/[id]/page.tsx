import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchAuditDetail } from "@/server/queries/audit.queries";
import { AuditDetailContent } from "@/features/audits/components/audit-detail-content";
import { bcmAuditHref, isBcmReturnContext } from "@/lib/bcm-audit";

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const t = await getTranslations("dashboardAuditDetailPage");
  const locale = await getLocale();
  const { id } = await params;
  const { from } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!currentUser || currentUser.tenants.length === 0) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const selectedMembership = currentUser.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const initialData = await fetchAuditDetail(id);

  if (!initialData) {
    return <div>{t("notFound")}</div>;
  }

  if (isBcmReturnContext(from, initialData.audit)) {
    redirect(bcmAuditHref(id));
  }

  return <AuditDetailContent initialData={initialData} auditId={id} locale={locale} from={from} />;
}
