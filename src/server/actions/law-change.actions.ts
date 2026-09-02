"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scanLawChanges } from "@/server/jobs/law-change-monitor";
import { tenantIsAffected } from "@/lib/law-change-match";
import { notifyUsersByRoles } from "@/server/actions/notification.actions";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Ikke autentisert");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true, isSupport: true },
  });
  if (!user?.isSuperAdmin && !user?.isSupport) {
    throw new Error("Kun superadmin har tilgang");
  }
  return user;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function listLawChangesAdmin() {
  try {
    await requireSuperAdmin();
    const [changes, lastScan, detectedCount] = await Promise.all([
      prisma.lawChange.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.lawChangeScan.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      prisma.lawChange.count({ where: { status: "DETECTED" } }),
    ]);
    return {
      success: true as const,
      data: JSON.parse(JSON.stringify({ changes, lastScan, detectedCount })),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ukjent feil",
    };
  }
}

export async function runLawChangeScanNow() {
  try {
    await requireSuperAdmin();
    const result = await scanLawChanges();
    revalidatePath("/admin/lovendringer");
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kunne ikke skanne",
    };
  }
}

export async function dismissLawChange(id: string) {
  try {
    await requireSuperAdmin();
    await prisma.lawChange.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
    revalidatePath("/admin/lovendringer");
    revalidatePath("/dashboard/juridisk-register");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kunne ikke avvise",
    };
  }
}

export async function publishLawChange(input: {
  id: string;
  customerSummary: string;
  affectedIndustries: string[];
}) {
  try {
    const admin = await requireSuperAdmin();
    const summary = input.customerSummary.trim();
    if (summary.length < 20) {
      return { success: false as const, error: "Skriv en kort forklaring til bedriftene (minst 20 tegn)" };
    }

    const industries =
      input.affectedIndustries.length > 0 ? input.affectedIndustries : ["all"];

    const change = await prisma.lawChange.findUnique({ where: { id: input.id } });
    if (!change) return { success: false as const, error: "Endringen ble ikke funnet" };
    if (change.status === "PUBLISHED") {
      return { success: false as const, error: "Endringen er allerede publisert" };
    }

    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, industry: true },
    });

    const affected = tenants.filter((tenant) =>
      tenantIsAffected(tenant.industry, industries)
    );

    for (const tenant of affected) {
      await notifyUsersByRoles(tenant.id, [Role.ADMIN, Role.HMS], {
        type: "LAW_CHANGE_ALERT",
        title: "Regelverksendring som kan gjelde dere",
        message: `${change.title}. ${summary}`,
        link: "/dashboard/juridisk-register",
      });
    }

    await prisma.lawChange.update({
      where: { id: input.id },
      data: {
        status: "PUBLISHED",
        customerSummary: summary,
        affectedIndustries: industries,
        notifiedAt: new Date(),
        notifiedById: admin.id,
        notifiedTenantCount: affected.length,
      },
    });

    revalidatePath("/admin/lovendringer");
    revalidatePath("/dashboard/juridisk-register");
    return { success: true as const, notified: affected.length };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kunne ikke publisere",
    };
  }
}

export async function getPublishedLawChangesForIndustry(industry: string | null) {
  const published = await prisma.lawChange.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { notifiedAt: "desc" },
    take: 20,
  });

  return published.filter((change) =>
    tenantIsAffected(industry, asStringArray(change.affectedIndustries))
  );
}
