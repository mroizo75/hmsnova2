import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchInspectionDetail } from "@/server/queries/inspection.queries";
import { InspectionDetailContent } from "@/features/inspections/components/inspection-detail-content";

export const dynamic = "force-dynamic";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("dashboardInspectionDetailPage");
  const locale = await getLocale();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role ?? "ANSATT");

  const initialData = await fetchInspectionDetail(id);

  if (!initialData) {
    return <div>{t("notFound")}</div>;
  }

  return (
    <InspectionDetailContent
      initialData={initialData}
      inspectionId={id}
      locale={locale}
      canDeleteInspections={permissions.canDeleteInspections}
    />
  );
}
