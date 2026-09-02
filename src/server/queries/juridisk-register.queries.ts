"use server";

import { getCurrentUser } from "@/lib/server-action";
import { getLegalReferencesForIndustry } from "@/server/actions/legal-reference.actions";
import {
  getRegulatoryStatus,
  ensureRegulatoryRequirementsSeeded,
  getRegulatoryRoutineSuggestions,
} from "@/server/actions/regulatory.actions";
import { getPublishedLawChangesForIndustry } from "@/server/actions/law-change.actions";

export async function fetchJuridiskRegisterData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const userTenant = user.tenants.at(0);
  if (!userTenant) return null;

  const tenant = userTenant.tenant;
  const industry = tenant.industry ?? null;

  const [references, _seeded] = await Promise.all([
    getLegalReferencesForIndustry(industry),
    ensureRegulatoryRequirementsSeeded(),
  ]);

  const [regulatoryStatus, routineSuggestions, lawChanges] = await Promise.all([
    getRegulatoryStatus(),
    getRegulatoryRoutineSuggestions().catch(() => []),
    getPublishedLawChangesForIndustry(industry),
  ]);

  return JSON.parse(JSON.stringify({
    regulatoryStatus,
    userRole: userTenant.role,
    routineSuggestions,
    lawChanges: lawChanges.map((change) => ({
      id: change.id,
      title: change.title,
      sourceUrl: change.sourceUrl,
      customerSummary: change.customerSummary,
      notifiedAt: change.notifiedAt?.toISOString() ?? null,
      source: change.source,
    })),
    manualReferences: references.map((ref: any) => ({
      id: ref.id,
      title: ref.title,
      description: ref.description,
      paragraphRef: ref.paragraphRef,
      sourceUrl: ref.sourceUrl,
      lastVerifiedAt: ref.lastVerifiedAt?.toISOString() ?? null,
    })),
  }));
}
