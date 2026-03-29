"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { AuditLog } from "@/lib/audit-log";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: tenantContext.tenantId, userId: user.id };
}

// ============================================================================
// Link Chemical to Risk
// ============================================================================

export async function linkChemicalToRisk(data: {
  riskId: string;
  chemicalId: string;
  exposure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ppRequired: boolean;
  note?: string;
}) {
  try {
    const { tenantId, userId } = await getSessionContext();

    // Verifiser at både risk og chemical tilhører tenanten
    const risk = await prisma.risk.findUnique({
      where: { id: data.riskId },
    });

    const chemical = await prisma.chemical.findUnique({
      where: { id: data.chemicalId },
    });

    if (!risk || risk.tenantId !== tenantId) {
      return { success: false, error: "Risiko ikke funnet" };
    }

    if (!chemical || chemical.tenantId !== tenantId) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    // Opprett kobling
    const link = await prisma.riskChemicalLink.create({
      data: {
        tenantId,
        riskId: data.riskId,
        chemicalId: data.chemicalId,
        exposure: data.exposure,
        ppRequired: data.ppRequired,
        note: data.note,
      },
      include: {
        chemical: true,
        risk: true,
      },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_CHEMICAL_LINKED",
      "Risk",
      risk.id,
      {
        chemicalId: chemical.id,
        chemicalName: chemical.productName,
        exposure: data.exposure,
      }
    );

    revalidatePath(`/dashboard/risks/${data.riskId}`);
    revalidatePath(`/dashboard/chemicals/${data.chemicalId}`);

    return { success: true, data: link };
  } catch (error: any) {
    console.error("Link chemical to risk error:", error);
    return { success: false, error: error.message || "Kunne ikke koble kjemikalie til risiko" };
  }
}

export async function unlinkChemicalFromRisk(linkId: string) {
  try {
    const { tenantId, userId } = await getSessionContext();

    const link = await prisma.riskChemicalLink.findUnique({
      where: { id: linkId },
      include: {
        risk: true,
        chemical: true,
      },
    });

    if (!link || link.tenantId !== tenantId) {
      return { success: false, error: "Kobling ikke funnet" };
    }

    await prisma.riskChemicalLink.delete({
      where: { id: linkId },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_CHEMICAL_UNLINKED",
      "Risk",
      link.riskId,
      {
        chemicalId: link.chemicalId,
        chemicalName: link.chemical.productName,
      }
    );

    revalidatePath(`/dashboard/risks/${link.riskId}`);
    revalidatePath(`/dashboard/chemicals/${link.chemicalId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Unlink chemical from risk error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne kobling" };
  }
}

export async function updateChemicalRiskLink(linkId: string, data: {
  exposure?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ppRequired?: boolean;
  note?: string;
}) {
  try {
    const { tenantId, userId } = await getSessionContext();

    const link = await prisma.riskChemicalLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.tenantId !== tenantId) {
      return { success: false, error: "Kobling ikke funnet" };
    }

    const updated = await prisma.riskChemicalLink.update({
      where: { id: linkId },
      data: {
        exposure: data.exposure,
        ppRequired: data.ppRequired,
        note: data.note,
      },
      include: {
        chemical: true,
        risk: true,
      },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_CHEMICAL_LINK_UPDATED",
      "Risk",
      link.riskId,
      {
        chemicalId: link.chemicalId,
        changes: data,
      }
    );

    revalidatePath(`/dashboard/risks/${link.riskId}`);
    revalidatePath(`/dashboard/chemicals/${link.chemicalId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Update chemical risk link error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere kobling" };
  }
}

export async function getChemicalRiskLinks(riskId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const links = await prisma.riskChemicalLink.findMany({
      where: {
        riskId,
        tenantId,
      },
      include: {
        chemical: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: links };
  } catch (error: any) {
    console.error("Get chemical risk links error:", error);
    return { success: false, error: error.message || "Kunne ikke hente koblinger" };
  }
}

export async function getRiskLinksForChemical(chemicalId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const links = await prisma.riskChemicalLink.findMany({
      where: {
        chemicalId,
        tenantId,
      },
      include: {
        risk: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: links };
  } catch (error: any) {
    console.error("Get risk links for chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke hente koblinger" };
  }
}

// ============================================================================
// Auto-suggest Risk for Chemical
// ============================================================================

export async function suggestRiskForChemical(chemicalId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findUnique({
      where: { id: chemicalId },
    });

    if (!chemical || chemical.tenantId !== tenantId) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    // Generer risiko-forslag basert på kjemikaliedata
    const suggestions = [];

    // CMR-stoffer
    if (chemical.isCMR) {
      suggestions.push({
        title: `Eksponering for CMR-stoff: ${chemical.productName}`,
        context: "Kjemikalie klassifisert som kreftfremkallende, mutagent eller reproduksjonstoksisk",
        category: "HEALTH" as const,
        likelihood: 3,
        consequence: 5,
        exposure: "CRITICAL" as const,
        suggestedControls: [
          "Substitusjonsvurdering (erstatt hvis mulig)",
          "Lukket system / punktavsug",
          "Åndedrettsvern med rette filtertype",
          "Obligatorisk helsekontroll",
          "Begrens antall eksponerte",
        ],
        trainingRequired: ["cmr-handling", "respiratory-protection"],
      });
    }

    // Diisocyanater
    if (chemical.containsIsocyanates) {
      suggestions.push({
        title: `Håndtering av diisocyanater: ${chemical.productName}`,
        context: "EU REACH Annex XVII - Obligatorisk opplæring for håndtering av diisocyanater",
        category: "HEALTH" as const,
        likelihood: 4,
        consequence: 4,
        exposure: "HIGH" as const,
        suggestedControls: [
          "Obligatorisk diisocyanat-opplæring (EU-krav)",
          "Åndedrettsvern under påføring",
          "Ventilert arbeidsområde",
          "Hudvern (hansker, verneklær)",
          "Helseundersøkelse",
        ],
        trainingRequired: ["diisocyanate-handling", "respiratory-protection"],
      });
    }

    // SVHC (Substance of Very High Concern)
    if (chemical.isSVHC) {
      suggestions.push({
        title: `SVHC-stoff: ${chemical.productName}`,
        context: "Stoff med særlig farlig egenskap (SVHC) - krever ekstra tiltak",
        category: "ENVIRONMENTAL" as const,
        likelihood: 3,
        consequence: 4,
        exposure: "HIGH" as const,
        suggestedControls: [
          "Vurder substitusjon",
          "Minimereksponering",
          "Kontrollert lagring",
          "Sporbarhet og dokumentasjon",
          "Regelmessig overvåking",
        ],
        trainingRequired: ["hazardous-substances"],
      });
    }

    // Høyt farenivå (hazardLevel 4-5)
    if (chemical.hazardLevel && chemical.hazardLevel >= 4) {
      suggestions.push({
        title: `Høyrisiko kjemikalie: ${chemical.productName}`,
        context: `Kjemikalie med høyt farenivå (${chemical.hazardLevel}/5)`,
        category: "SAFETY" as const,
        likelihood: 3,
        consequence: 4,
        exposure: chemical.hazardLevel === 5 ? "CRITICAL" as const : "HIGH" as const,
        suggestedControls: [
          "Sikkerhetsdatablad lett tilgjengelig",
          "Nødprosedyrer på plass",
          "Verneutstyr tilgjengelig",
          "Begrenset tilgang",
          "Regelmessig vernerunde",
        ],
        trainingRequired: ["hazardous-substances", "emergency-procedures"],
      });
    }

    return { success: true, data: suggestions };
  } catch (error: any) {
    console.error("Suggest risk for chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke generere forslag" };
  }
}
