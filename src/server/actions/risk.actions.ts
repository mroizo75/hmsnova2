"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createRiskSchema, updateRiskSchema } from "@/features/risks/schemas/risk.schema";

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

// Hent alle risikoer for en tenant
export async function getRisks(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const risks = await prisma.risk.findMany({
      where: { tenantId },
      include: {
        measures: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { score: "desc" },
        { createdAt: "desc" },
      ],
    });
    
    return { success: true, data: risks };
  } catch (error: any) {
    console.error("Get risks error:", error);
    return { success: false, error: error.message || "Kunne ikke hente risikoer" };
  }
}

// Hent en spesifikk risiko
export async function getRisk(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const risk = await prisma.risk.findUnique({
      where: { id, tenantId },
      include: {
        measures: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Get risk error:", error);
    return { success: false, error: error.message || "Kunne ikke hente risiko" };
  }
}

// Opprett ny risiko
export async function createRisk(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createRiskSchema.parse({ ...input, tenantId });
    
    const score = validated.likelihood * validated.consequence;
    
    const risk = await prisma.risk.create({
      data: {
        tenantId: validated.tenantId,
        title: validated.title,
        context: validated.context,
        likelihood: validated.likelihood,
        consequence: validated.consequence,
        score,
        ownerId: validated.ownerId,
        status: validated.status,
      },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_CREATED",
        resource: `Risk:${risk.id}`,
        metadata: JSON.stringify({ title: risk.title, score }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Create risk error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette risiko" };
  }
}

// Oppdater risiko
export async function updateRisk(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateRiskSchema.parse(input);
    
    const existingRisk = await prisma.risk.findUnique({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingRisk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    // Beregn ny score hvis likelihood eller consequence endres
    const likelihood = validated.likelihood ?? existingRisk.likelihood;
    const consequence = validated.consequence ?? existingRisk.consequence;
    const score = likelihood * consequence;
    
    const risk = await prisma.risk.update({
      where: { id: validated.id, tenantId },
      data: {
        ...validated,
        score,
        updatedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_UPDATED",
        resource: `Risk:${risk.id}`,
        metadata: JSON.stringify({ title: risk.title, score }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/${risk.id}`);
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Update risk error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere risiko" };
  }
}

// Slett risiko
export async function deleteRisk(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const risk = await prisma.risk.findUnique({
      where: { id, tenantId },
    });
    
    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    await prisma.risk.delete({
      where: { id, tenantId },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_DELETED",
        resource: `Risk:${id}`,
        metadata: JSON.stringify({ title: risk.title }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    return { success: true };
  } catch (error: any) {
    console.error("Delete risk error:", error);
    return { success: false, error: error.message || "Kunne ikke slette risiko" };
  }
}

// Få statistikk over risikoer
export async function getRiskStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const risks = await prisma.risk.findMany({
      where: { tenantId },
    });
    
    const stats = {
      total: risks.length,
      critical: risks.filter(r => r.score >= 20).length,
      high: risks.filter(r => r.score >= 12 && r.score < 20).length,
      medium: risks.filter(r => r.score >= 6 && r.score < 12).length,
      low: risks.filter(r => r.score < 6).length,
      open: risks.filter(r => r.status === "OPEN").length,
      mitigating: risks.filter(r => r.status === "MITIGATING").length,
      accepted: risks.filter(r => r.status === "ACCEPTED").length,
      closed: risks.filter(r => r.status === "CLOSED").length,
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get risk stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

