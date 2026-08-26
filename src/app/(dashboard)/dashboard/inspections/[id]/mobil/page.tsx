import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { fetchInspectionMobile } from "@/server/queries/inspection.queries";
import { InspectionMobileContent } from "@/features/inspections/components/inspection-mobile-content";

export default async function InspectionMobilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("dashboardInspectionMobilePage");
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    return notFound();
  }

  const initialData = await fetchInspectionMobile(id);

  if (!initialData) {
    return notFound();
  }

  return <InspectionMobileContent initialData={initialData} inspectionId={id} />;
}
