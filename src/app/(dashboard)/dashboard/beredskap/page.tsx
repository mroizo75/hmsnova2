import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { normalizeIndustryKey } from "@/lib/dashboard-nav-filter";
import { fetchBeredskapReiselivData } from "@/server/queries/settings.queries";
import { BeredskapReiselivContent } from "@/features/beredskap-reiseliv/components/beredskap-reiseliv-content";

export const metadata = { title: "Beredskap | HMS Nova" };

const REISELIV_INDUSTRIES = new Set(["hospitality", "aktivitet"]);

export default async function BeredskapPage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) redirect("/dashboard");

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { industry: true },
  });
  const industry = normalizeIndustryKey(tenant?.industry);
  const isReiseliv = industry ? REISELIV_INDUSTRIES.has(industry) : false;

  const initialData = await fetchBeredskapReiselivData();

  return (
    <BeredskapReiselivContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateIncidents}
      isReiseliv={isReiseliv}
    />
  );
}
