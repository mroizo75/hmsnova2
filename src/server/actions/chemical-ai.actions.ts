"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getStorage } from "@/lib/storage";
import { AuditLog } from "@/lib/audit-log";
import { 
  searchSubstanceByCAS, 
  calculateHazardLevel, 
  isCMRSubstance,
  calculateSubstitutionPriority,
  suggestAlternatives
} from "@/lib/echa-api";
import { parseSDSFile } from "@/lib/sds-parser";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: tenantContext.tenantId };
}

/**
 * AI-parsing av SDS fra PDF
 * Bruker OpenAI til å ekstrahere strukturert data
 */
export async function parseSDSFromFile(sdsKey: string, chemicalId?: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Hent fil fra storage
    const storage = getStorage();
    const fileUrl = await storage.getUrl(sdsKey);
    
    // Last ned filen
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return { success: false, error: "Kunne ikke laste ned SDS-fil" };
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Parse SDS med AI (Adobe + OpenAI)
    const extractedData = await parseSDSFile(fileBuffer);

    // Hvis chemicalId er oppgitt, oppdater kjemikaliet automatisk
    if (chemicalId && extractedData.confidence && extractedData.confidence > 0.7) {
      const updateData: any = {};

      // Enkle felt
      if (extractedData.productName) updateData.productName = extractedData.productName;
      if (extractedData.supplier) updateData.supplier = extractedData.supplier;
      if (extractedData.casNumber) updateData.casNumber = extractedData.casNumber;

      // H-setninger (hvis streng, bruk direkte - hvis array, join)
      if (extractedData.hazardStatements) {
        const hStatements = typeof extractedData.hazardStatements === 'string' 
          ? extractedData.hazardStatements
          : extractedData.hazardStatements.join(', ');
        updateData.hazardStatements = hStatements;
      }

      // Faremerker (AI returnerer allerede riktige filnavn)
      if (extractedData.warningPictograms && extractedData.warningPictograms.length > 0) {
        updateData.warningPictograms = JSON.stringify(extractedData.warningPictograms);
      }

      // PPE (AI returnerer allerede riktige filnavn)
      if (extractedData.requiredPPE && extractedData.requiredPPE.length > 0) {
        updateData.requiredPPE = JSON.stringify(extractedData.requiredPPE);
      }

      // Sjekk for isocyanater
      if (extractedData.containsIsocyanates !== undefined) {
        updateData.containsIsocyanates = extractedData.containsIsocyanates;
      }

      updateData.aiExtractedData = JSON.stringify(extractedData);

      await prisma.chemical.update({
        where: { id: chemicalId, tenantId },
        data: updateData,
      });

      await AuditLog.log(tenantId, user.id, "CHEMICAL_AI_PARSED", "Chemical", chemicalId, {
        confidence: extractedData.confidence,
        extractedFields: Object.keys(updateData),
      });

      revalidatePath(`/dashboard/chemicals/${chemicalId}`);
    }

    return { success: true, data: extractedData };
  } catch (error: any) {
    console.error("Parse SDS error:", error);
    return { success: false, error: error.message || "Kunne ikke parse SDS" };
  }
}

/**
 * Synkroniser med ECHA for oppdatert faredata
 */
export async function syncWithECHA(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    if (!chemical.casNumber) {
      return { success: false, error: "CAS-nummer mangler" };
    }

    // Søk i ECHA
    const echaData = await searchSubstanceByCAS(chemical.casNumber);

    if (!echaData) {
      return { success: false, error: "Ingen data funnet i ECHA" };
    }

    // Oppdater kjemikalie med ECHA-data
    const hStatements = chemical.hazardStatements 
      ? (typeof chemical.hazardStatements === 'string' ? JSON.parse(chemical.hazardStatements) : [])
      : [];

    const hazardLevel = calculateHazardLevel(hStatements);
    const isCMR = isCMRSubstance(hStatements);
    const substitutionPriority = calculateSubstitutionPriority(
      isCMR,
      echaData.isSVHC,
      hazardLevel
    );

    const updatedChemical = await prisma.chemical.update({
      where: { id: chemicalId },
      data: {
        ecNumber: echaData.ecNumber,
        isCMR,
        isSVHC: echaData.isSVHC,
        reachStatus: echaData.reachStatus,
        hazardLevel,
        substitutionPriority,
        lastEchaSync: new Date(),
      },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_ECHA_SYNCED", "Chemical", chemicalId, {
      echaData: {
        isCMR,
        isSVHC: echaData.isSVHC,
        hazardLevel,
      },
    });

    revalidatePath(`/dashboard/chemicals/${chemicalId}`);
    revalidatePath("/dashboard/chemicals");

    return { success: true, data: updatedChemical };
  } catch (error: any) {
    console.error("ECHA sync error:", error);
    return { success: false, error: error.message || "Kunne ikke synkronisere med ECHA" };
  }
}

/**
 * Finn substitusjonsalternativer
 */
export async function findSubstitutionAlternatives(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    if (!chemical.casNumber) {
      return { success: false, error: "CAS-nummer mangler" };
    }

    // Finn alternativer
    const alternatives = await suggestAlternatives(
      chemical.casNumber,
      chemical.productName,
      chemical.hazardClass || undefined
    );

    // Oppdater kjemikalie med forslag
    if (alternatives.length > 0) {
      await prisma.chemical.update({
        where: { id: chemicalId },
        data: {
          autoSuggestedAlternatives: JSON.stringify(alternatives),
        },
      });

      revalidatePath(`/dashboard/chemicals/${chemicalId}`);
    }

    return { success: true, data: alternatives };
  } catch (error: any) {
    console.error("Find alternatives error:", error);
    return { success: false, error: error.message || "Kunne ikke finne alternativer" };
  }
}

/**
 * Batch-synkroniser alle kjemikalier med CAS-nummer
 */
export async function batchSyncWithECHA(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const chemicals = await prisma.chemical.findMany({
      where: { 
        tenantId,
        casNumber: { not: null },
        status: "ACTIVE",
      },
    });

    let synced = 0;
    let failed = 0;

    for (const chemical of chemicals) {
      try {
        const result = await syncWithECHA(chemical.id);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`Failed to sync ${chemical.id}:`, error);
      }

      // Vent litt mellom kall for å unngå rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { 
      success: true, 
      data: { 
        total: chemicals.length, 
        synced, 
        failed 
      } 
    };
  } catch (error: any) {
    console.error("Batch ECHA sync error:", error);
    return { success: false, error: error.message || "Kunne ikke synkronisere" };
  }
}

/**
 * Finn alle kjemikalier som trenger oppmerksomhet
 */
export async function findChemicalsNeedingAttention(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const now = new Date();
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const chemicals = await prisma.chemical.findMany({
      where: { 
        tenantId,
        status: "ACTIVE",
      },
    });

    const needingAttention = {
      outdatedSDS: chemicals.filter(c => 
        c.sdsDate && new Date(c.sdsDate) < threeYearsAgo
      ),
      missingSDS: chemicals.filter(c => !c.sdsKey),
      cmrSubstances: chemicals.filter(c => c.isCMR),
      svhcSubstances: chemicals.filter(c => c.isSVHC),
      highSubstitutionPriority: chemicals.filter(c => c.substitutionPriority === "HIGH"),
      reviewDueSoon: chemicals.filter(c => 
        c.nextReviewDate && 
        new Date(c.nextReviewDate) <= thirtyDaysFromNow &&
        new Date(c.nextReviewDate) > now
      ),
      reviewOverdue: chemicals.filter(c => 
        c.nextReviewDate && new Date(c.nextReviewDate) < now
      ),
    };

    return { success: true, data: needingAttention };
  } catch (error: any) {
    console.error("Find chemicals needing attention error:", error);
    return { success: false, error: error.message || "Kunne ikke hente kjemikalier" };
  }
}
