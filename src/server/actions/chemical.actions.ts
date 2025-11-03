"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateFileKey, getStorage } from "@/lib/storage";
import { AuditLog } from "@/lib/audit-log";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: user.tenants[0].tenantId };
}

// ============================================================================
// CHEMICALS (Stoffkartotek)
// ============================================================================

export async function getChemicals(tenantId: string) {
  try {
    const { user } = await getSessionContext();

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

export async function createChemical(input: any, sdsFile?: File) {
  try {
    const { user, tenantId } = await getSessionContext();

    let sdsKey: string | undefined;

    // Last opp sikkerhetsdatablad hvis det finnes
    if (sdsFile) {
      const storage = getStorage();
      sdsKey = generateFileKey(tenantId, "chemicals/sds", sdsFile.name);
      await storage.upload(sdsKey, sdsFile);
    }

    // Beregn neste revisjonsdato (1 år frem hvis ikke oppgitt)
    const nextReviewDate = input.nextReviewDate
      ? new Date(input.nextReviewDate)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const chemical = await prisma.chemical.create({
      data: {
        tenantId,
        productName: input.productName,
        supplier: input.supplier,
        casNumber: input.casNumber,
        hazardClass: input.hazardClass,
        hazardStatements: input.hazardStatements,
        warningPictograms: input.warningPictograms,
        requiredPPE: input.requiredPPE,
        sdsKey,
        sdsVersion: input.sdsVersion,
        sdsDate: input.sdsDate ? new Date(input.sdsDate) : undefined,
        nextReviewDate,
        location: input.location,
        quantity: input.quantity ? parseFloat(input.quantity) : undefined,
        unit: input.unit,
        status: input.status || "ACTIVE",
        notes: input.notes,
      },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_CREATED", "Chemical", chemical.id, {
      productName: chemical.productName,
    });

    revalidatePath("/dashboard/chemicals");
    return { success: true, data: chemical };
  } catch (error: any) {
    console.error("Create chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette kjemikalie" };
  }
}

export async function updateChemical(chemicalId: string, input: any, sdsFile?: File) {
  try {
    const { user, tenantId } = await getSessionContext();

    const existingChemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
    });

    if (!existingChemical) {
      return { success: false, error: "Kjemikalie ikke funnet" };
    }

    let sdsKey = existingChemical.sdsKey;

    // Last opp nytt sikkerhetsdatablad hvis det finnes
    if (sdsFile) {
      const storage = getStorage();
      
      // Slett gammelt datablad hvis det finnes
      if (sdsKey) {
        try {
          await storage.delete(sdsKey);
        } catch (error) {
          console.error("Failed to delete old SDS:", error);
        }
      }
      
      sdsKey = generateFileKey(tenantId, "chemicals/sds", sdsFile.name);
      await storage.upload(sdsKey, sdsFile);
    }

    const chemical = await prisma.chemical.update({
      where: { id: chemicalId },
      data: {
        productName: input.productName,
        supplier: input.supplier,
        casNumber: input.casNumber,
        hazardClass: input.hazardClass,
        hazardStatements: input.hazardStatements,
        warningPictograms: input.warningPictograms,
        requiredPPE: input.requiredPPE,
        ...(sdsFile && { sdsKey }),
        sdsVersion: input.sdsVersion,
        sdsDate: input.sdsDate ? new Date(input.sdsDate) : undefined,
        nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : undefined,
        location: input.location,
        quantity: input.quantity ? parseFloat(input.quantity) : undefined,
        unit: input.unit,
        status: input.status,
        notes: input.notes,
        updatedAt: new Date(),
      },
    });

    await AuditLog.log(tenantId, user.id, "CHEMICAL_UPDATED", "Chemical", chemical.id, {
      productName: chemical.productName,
    });

    revalidatePath("/dashboard/chemicals");
    revalidatePath(`/dashboard/chemicals/${chemical.id}`);
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
    return { success: true };
  } catch (error: any) {
    console.error("Verify chemical error:", error);
    return { success: false, error: error.message || "Kunne ikke verifisere kjemikalie" };
  }
}

// Statistikk
export async function getChemicalStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    const chemicals = await prisma.chemical.findMany({
      where: { tenantId },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get chemical stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

