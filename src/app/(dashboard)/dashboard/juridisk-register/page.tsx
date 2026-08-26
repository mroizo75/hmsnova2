import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { getLegalReferencesForIndustry } from "@/server/actions/legal-reference.actions";
import {
  getRegulatoryStatus,
  ensureRegulatoryRequirementsSeeded,
} from "@/server/actions/regulatory.actions";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { JuridiskRegisterClient } from "./client";

export default async function JuridiskRegisterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til virksomhet</div>;
  }

  const tenant = userTenant.tenant;
  const industry = tenant.industry ?? null;

  const [references, _seeded] = await Promise.all([
    getLegalReferencesForIndustry(industry),
    ensureRegulatoryRequirementsSeeded(),
  ]);

  const regulatoryStatus = await getRegulatoryStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Juridisk register</h1>
          <p className="text-muted-foreground">
            Gjeldende lover og forskrifter for din virksomhet
          </p>
        </div>
        <PageHelpDialog content={helpContent.legalRegister} />
      </div>

      <JuridiskRegisterClient
        regulatoryStatus={regulatoryStatus}
        userRole={userTenant.role}
        manualReferences={references.map((ref) => ({
          id: ref.id,
          title: ref.title,
          description: ref.description,
          paragraphRef: ref.paragraphRef,
          sourceUrl: ref.sourceUrl,
          lastVerifiedAt: ref.lastVerifiedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
