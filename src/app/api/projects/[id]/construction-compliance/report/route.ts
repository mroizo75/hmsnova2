import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import {
  buildConstructionComplianceValidation,
  evaluatePreNotificationRequirement,
} from "@/lib/construction-compliance-rules";
import { prisma } from "@/lib/db";
import { generateConstructionCompliancePdf } from "@/lib/construction-compliance-pdf";

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: session.user.id },
      select: { tenantId: true },
    });
    if (!userTenant) {
      return new NextResponse("No tenant access", { status: 403 });
    }

    const [project, tenant, shaPlan, preNotification, rosterEntries, rosterChecks] = await Promise.all([
      prisma.project.findFirst({
        where: { id, tenantId: userTenant.tenantId },
        select: { id: true, name: true, location: true, clientName: true },
      }),
      prisma.tenant.findUnique({
        where: { id: userTenant.tenantId },
        select: { name: true },
      }),
      prisma.constructionShaPlan.findUnique({
        where: { projectId: id },
      }),
      prisma.constructionPreNotification.findUnique({
        where: { projectId: id },
      }),
      prisma.constructionRosterEntry.findMany({
        where: { projectId: id, tenantId: userTenant.tenantId },
        orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      }),
      prisma.constructionRosterDailyCheck.findMany({
        where: { projectId: id, tenantId: userTenant.tenantId },
        include: {
          checkedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { checkedDate: "desc" },
      }),
    ]);

    if (!project) {
      return new NextResponse("Prosjekt ikke funnet", { status: 404 });
    }

    const latestCheck = rosterChecks[0];
    const todayKey = formatDateOnly(new Date());
    const latestCheckKey = latestCheck ? formatDateOnly(new Date(latestCheck.checkedDate)) : null;
    const hasActiveWorkers = rosterEntries.some((entry) => entry.isActive);
    const isDailyCheckMissing = hasActiveWorkers && latestCheckKey !== todayKey;
    const preNotificationRequirement = evaluatePreNotificationRequirement(preNotification);
    const complianceValidation = buildConstructionComplianceValidation(shaPlan, preNotification);

    const pdfBuffer = await generateConstructionCompliancePdf({
      tenantName: tenant?.name ?? "HMS Nova",
      project,
      shaPlan,
      preNotification,
      rosterEntries,
      rosterChecks,
      isDailyCheckMissing,
      preNotificationRequirement,
      complianceValidation,
    });

    const safeProjectName = project.name
      .replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, "")
      .replace(/\s+/g, "-");
    const filename = `Bygg-Anlegg-Compliance-${safeProjectName}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("[Construction Compliance PDF]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
