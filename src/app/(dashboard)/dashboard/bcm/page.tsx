import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BcmHelpDialog } from "@/components/bcm/bcm-help-dialog";
import { getAuthContext } from "@/lib/server-authorization";
import { normalizeIndustryKey } from "@/lib/dashboard-nav-filter";
import { fetchBcmData } from "@/server/queries/bcm.queries";
import { fetchBeredskapReiselivData } from "@/server/queries/settings.queries";
import { bcmNewAuditHref } from "@/lib/bcm-audit";
import { BcmContent } from "@/features/bcm/components/bcm-content";

const REISELIV_INDUSTRIES = new Set(["hospitality", "aktivitet"]);

export default async function BcmPage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) {
    redirect("/dashboard");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { industry: true },
  });
  const industry = normalizeIndustryKey(tenant?.industry);
  const isReiseliv = industry ? REISELIV_INDUSTRIES.has(industry) : false;

  const [initialData, operational] = await Promise.all([
    fetchBcmData(),
    fetchBeredskapReiselivData(),
  ]);
  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold">Beredskap</h1>
            <p className="text-muted-foreground">
              AML § 3-2 og IK-HMS § 5: evakuering og hendelser. ISO 22301: planer, krisehåndbok og øvelser.
            </p>
          </div>
          <BcmHelpDialog />
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={bcmNewAuditHref()}>Registrer øvelse/test</Link>
          </Button>
        </div>
      </div>

      <BcmContent
        initialData={initialData}
        operational={operational}
        canEdit={auth.permissions.canCreateIncidents}
        isReiseliv={isReiseliv}
      />
    </div>
  );
}
