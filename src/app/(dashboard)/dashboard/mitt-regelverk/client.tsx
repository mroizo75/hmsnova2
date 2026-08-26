"use client";

import { useState } from "react";
import { RegulatoryWizard } from "@/features/regulatory/components/regulatory-wizard";
import { ComplianceDashboard } from "@/features/regulatory/components/compliance-dashboard";

type RegulatoryStatus = {
  hasProfile: boolean;
  tenant: {
    name: string | null;
    orgNumber: string | null;
    naceCode: string | null;
    naceDescription: string | null;
    industry: string | null;
  } | null;
  requirements: Array<{
    id: string;
    title: string;
    description: string;
    legalBasis: string;
    sourceUrl: string | null;
    hmsNovaFeature: string | null;
    hmsNovaRoute: string | null;
    severity: string;
    status: "COMPLIANT" | "PARTIAL" | "MISSING";
  }>;
  compliancePercentage: number;
  activityProfile: {
    answers: Record<string, boolean>;
    activeActivities: string[];
    completedAt: Date | null;
  } | null;
};

type Props = {
  initialStatus: RegulatoryStatus;
};

export function MittRegelverkClient({ initialStatus }: Props) {
  const [showWizard, setShowWizard] = useState(!initialStatus.hasProfile);

  if (showWizard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mitt Regelverk</h1>
          <p className="text-muted-foreground">
            Kartlegg hvilke lovkrav som gjelder din virksomhet
          </p>
        </div>
        <RegulatoryWizard tenant={initialStatus.tenant} />
      </div>
    );
  }

  return (
    <ComplianceDashboard
      tenant={initialStatus.tenant}
      requirements={initialStatus.requirements}
      compliancePercentage={initialStatus.compliancePercentage}
      onEditProfile={() => setShowWizard(true)}
    />
  );
}
