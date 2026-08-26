"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { generateFileKey, getStorage } from "@/lib/storage";
import { AuditLog } from "@/lib/audit-log";
import { 
  searchSubstanceByCAS, 
  calculateHazardLevel, 
  isCMRSubstance,
  calculateSubstitutionPriority,
  suggestAlternatives
} from "@/lib/echa-api";
import { parseSDSFile, mapPictogramsToFiles, suggestPPE } from "@/lib/sds-parser";
import { checkAndUpdateSDSOnCreate } from "./chemical-auto-update.actions";

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

// ============================================================================
// CHEMICALS (Stoffkartotek)
// ============================================================================

export async function getChemicals(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const chemicals = await prisma.chemical.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: chemicals };
  } catch (error: any) {
    console.error("Get chemicals error:", error);
    return { success: false, error: error.message || "Kunne ikke hente kjemikalier" };
  }
}

export async function getChemical(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findUnique({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    return { success: true, data: chemical };
  } catch (error: any) {
    console.error("Get chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke hente kjemikalie" };
  }
}

export async function createChemical(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Beregn neste revisjonsdato (3 år frem hvis ikke oppgitt)
    const nextReviewDate = input.nextReviewDate
      ? new Date(input.nextReviewDate)
      : new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);

    // Berik data med ECHA hvis CAS-nummer er oppgitt
    let echaData = null;
    let hazardLevel = null;
    let isCMR = false;
    let substitutionPriority = null;

    if (input.casNumber) {
      echaData = await searchSubstanceByCAS(input.casNumber);
      
      // Parse H-setninger hvis de er oppgitt
      const hStatements = input.hazardStatements 
        ? (typeof input.hazardStatements === 'string' ? [input.hazardStatements] : input.hazardStatements)
        : [];
      
      hazardLevel = calculateHazardLevel(hStatements);
      isCMR = isCMRSubstance(hStatements);
      substitutionPriority = calculateSubstitutionPriority(
        isCMR, 
        echaData?.isSVHC || false, 
        hazardLevel
      );
    }

    const chemical = await prisma.chemical.create({
      data: {
        tenantId,
        productName: input.productName,
        supplier: input.supplier,
        casNumber: input.casNumber,
        hazardClass: input.hazardClass,
        hazardStatements: input.hazardStatements,
        precautionaryStatements: input.precautionaryStatements,
        warningPictograms: input.warningPictograms,
        requiredPPE: input.requiredPPE,
        containsIsocyanates: input.containsIsocyanates || false,
        sdsKey: input.sdsKey,
        sdsVersion: input.sdsVersion,
        sdsDate: input.sdsDate ? new Date(input.sdsDate) : undefined,
        nextReviewDate,
        location: input.location,
        quantity: input.quantity ? parseFloat(input.quantity) : undefined,
        unit: input.unit,
        status: input.status || "ACTIVE",
        notes: input.notes,

        // ECHA-berikede felter – manuell override tar prioritet
        ecNumber: echaData?.ecNumber,
        isCMR: input.isCMR === true ? true : isCMR,
        isSVHC: input.isSVHC === true ? true : (echaData?.isSVHC || false),
        reachStatus: echaData?.reachStatus,
        hazardLevel,
        substitutionPriority,
        lastEchaSync: echaData ? new Date() : undefined,
      },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_CREATED", "Chemical", chemical.id, {
      productName: chemical.productName,
      isCMR,
      hazardLevel,
    });

    // ✨ AUTOMATISK SJEKK FOR NYESTE VERSJON
    // Kjøres i bakgrunnen etter opprettelse
    if (chemical.supplier && chemical.casNumber) {
      checkAndUpdateSDSOnCreate(chemical.id, tenantId)
        .then((result) => {
          if (result.wasUpdated) {
            console.log(`✅ ${chemical.productName}: Automatisk oppdatert til ${result.newVersion}`);
          } else {
            console.log(`✅ ${chemical.productName}: Nyeste versjon allerede lastet opp`);
          }
        })
        .catch((err) => {
          console.warn(`⚠️ Kunne ikke sjekke versjon for ${chemical.productName}:`, err);
        });
    }

    revalidatePath("/dashboard/chemicals");
    triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemical.id });
    return { success: true, data: chemical };
  } catch (error: any) {
    console.error("Create chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette kjemikalie" };
  }
}

export async function updateChemical(chemicalId: string, input: any) {
  try {
    const { user, tenantId } = await getSessionContext();

    const existingChemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!existingChemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    // Slett gammelt datablad hvis nytt er lastet opp
    if (input.sdsKey && existingChemical.sdsKey && input.sdsKey !== existingChemical.sdsKey) {
      try {
        const storage = getStorage();
        await storage.delete(existingChemical.sdsKey);
      } catch (error) {
        console.error("Failed to delete old SDS:", error);
      }
    }

    const updateData: any = {
      productName: input.productName,
      supplier: input.supplier,
      casNumber: input.casNumber,
      hazardClass: input.hazardClass,
      hazardStatements: input.hazardStatements,
      precautionaryStatements: input.precautionaryStatements,
      warningPictograms: input.warningPictograms,
      requiredPPE: input.requiredPPE,
      containsIsocyanates: input.containsIsocyanates ?? false,
      isCMR: input.isCMR ?? false,
      isSVHC: input.isSVHC ?? false,
      sdsVersion: input.sdsVersion,
      sdsDate: input.sdsDate ? new Date(input.sdsDate) : undefined,
      nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : undefined,
      location: input.location,
      quantity: input.quantity ? parseFloat(input.quantity) : undefined,
      unit: input.unit,
      status: input.status,
      notes: input.notes,
      updatedAt: new Date(),
    };

    // Oppdater sdsKey kun hvis ny er sendt
    if (input.sdsKey) {
      updateData.sdsKey = input.sdsKey;
    }

    const chemical = await prisma.chemical.update({
      where: { id: chemicalId },
      data: updateData,
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_UPDATED", "Chemical", chemical.id, {
      productName: chemical.productName,
    });

    revalidatePath("/dashboard/chemicals");
    revalidatePath(`/dashboard/chemicals/${chemical.id}`);
    triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemical.id });
    return { success: true, data: chemical };
  } catch (error: any) {
    console.error("Update chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere kjemikalie" };
  }
}

export async function deleteChemical(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    // Slett sikkerhetsdatablad hvis det finnes
    if (chemical.sdsKey) {
      try {
        const storage = getStorage();
        await storage.delete(chemical.sdsKey);
      } catch (error) {
        console.error("Failed to delete SDS:", error);
      }
    }

    await prisma.chemical.delete({
      where: { id: chemicalId },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_DELETED", "Chemical", chemicalId, {
      productName: chemical.productName,
    });

    revalidatePath("/dashboard/chemicals");
    triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemicalId });
    return { success: true };
  } catch (error: any) {
    console.error("Delete chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke slette kjemikalie" };
  }
}

// Last ned sikkerhetsdatablad
export async function downloadSDS(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical || !chemical.sdsKey) {
      return { success: false, error: "Sikkerhetsdatablad ikke funnet" };
    }

    const storage = getStorage();
    const url = await storage.getUrl(chemical.sdsKey);

    return { success: true, data: { url } };
  } catch (error: any) {
    console.error("Download SDS error:", error);
    return { success: false, error: error.message || "Kunne ikke laste ned datablad" };
  }
}

// Verifiser kjemikalie (brukes i revisjoner)
export async function verifyChemical(chemicalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!chemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    await prisma.chemical.update({
      where: { id: chemicalId },
      data: {
        lastVerifiedAt: new Date(),
        lastVerifiedBy: user.id,
      },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_VERIFIED", "Chemical", chemicalId, {
      productName: chemical.productName,
    });

    revalidatePath("/dashboard/chemicals");
    revalidatePath(`/dashboard/chemicals/${chemical.id}`);
    triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemicalId });
    return { success: true };
  } catch (error: any) {
    console.error("Verify chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke verifisere kjemikalie" };
  }
}

// Statistikk
export async function getChemicalStats(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const chemicals = await prisma.chemical.findMany({
      where: { tenantId },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);

    const stats = {
      total: chemicals.length,
      active: chemicals.filter((c) => c.status === "ACTIVE").length,
      phasedOut: chemicals.filter((c) => c.status === "PHASED_OUT").length,
      archived: chemicals.filter((c) => c.status === "ARCHIVED").length,
      missingSDS: chemicals.filter((c) => !c.sdsKey).length,
      needsReview: chemicals.filter(
        (c) => c.nextReviewDate && new Date(c.nextReviewDate) <= thirtyDaysFromNow
      ).length,
      overdue: chemicals.filter(
        (c) => c.nextReviewDate && new Date(c.nextReviewDate) < now
      ).length,
      cmrSubstances: chemicals.filter((c) => c.isCMR).length,
      svhcSubstances: chemicals.filter((c) => c.isSVHC).length,
      highSubstitutionPriority: chemicals.filter((c) => c.substitutionPriority === "HIGH").length,
      outdatedSDS: chemicals.filter(
        (c) => c.sdsDate && new Date(c.sdsDate) < threeYearsAgo
      ).length,
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get chemical stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

// AI-parsing av SDS fra PDF
export async function parseSDSFromFile(sdsKey: string, chemicalId?: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Hent fil fra storage
    const storage = getStorage();
    const fileUrl = await storage.getUrl(sdsKey);

    // Last ned filen
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return { success: false, error: "Kunne ikke laste ned fil" };
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Parse SDS med AI
    const extractedData = await parseSDSFile(fileBuffer);

    // Hvis chemicalId er oppgitt, oppdater kjemikaliet automatisk
    if (chemicalId && extractedData.confidence && extractedData.confidence > 0.7) {
      const updateData: any = {};

      if (extractedData.hazardStatements) {
        updateData.hazardStatements = JSON.stringify(extractedData.hazardStatements);
        
        // Beregn farenivå og CMR-status
        updateData.hazardLevel = calculateHazardLevel(extractedData.hazardStatements);
        updateData.isCMR = isCMRSubstance(extractedData.hazardStatements);
      }

      if (extractedData.precautionaryStatements) {
        updateData.precautionaryStatements = JSON.stringify(extractedData.precautionaryStatements);
      }

      if (extractedData.pictograms) {
        updateData.warningPictograms = JSON.stringify(mapPictogramsToFiles(extractedData.pictograms));
      }

      if (extractedData.hazardStatements) {
        const ppe = suggestPPE(extractedData.hazardStatements);
        updateData.requiredPPE = JSON.stringify(ppe);
      }

      if (extractedData.casNumbers && extractedData.casNumbers.length > 0) {
        updateData.casNumber = extractedData.casNumbers[0];
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
      triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemicalId });
    }

    return { success: true, data: extractedData };
  } catch (error: any) {
    console.error("Parse SDS error:", error);
    return { success: false, error: error.message || "Kunne ikke parse SDS" };
  }
}

// Synkroniser med ECHA for oppdatert faredata
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
      ? JSON.parse(chemical.hazardStatements as string)
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
    triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemicalId });

    return { success: true, data: updatedChemical };
  } catch (error: any) {
    console.error("ECHA sync error:", error);
    return { success: false, error: error.message || "Kunne ikke synkronisere med ECHA" };
  }
}

// Finn substitusjonsalternativer
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
      triggerRealtimeEvent(tenantId, "chemical-updated", { id: chemicalId });
    }

    return { success: true, data: alternatives };
  } catch (error: any) {
    console.error("Find alternatives error:", error);
    return { success: false, error: error.message || "Kunne ikke finne alternativer" };
  }
}

// Batch-synkroniser alle kjemikalier med CAS-nummer
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
