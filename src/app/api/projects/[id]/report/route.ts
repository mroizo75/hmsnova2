import { NextRequest, NextResponse } from "next/server";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/db";
import { generateProjectReport } from "@/lib/project-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getRequiredTenantContext();

    const { id } = await params;

    const [project, tenant, attachments] = await Promise.all([
      prisma.project.findUnique({
        where: { id, tenantId },
        include: {
          createdBy: { select: { name: true, email: true } },
          projectManager: { select: { name: true, email: true } },
          incidents: {
            orderBy: { occurredAt: "desc" },
            select: {
              avviksnummer: true, title: true, type: true, severity: true,
              status: true, occurredAt: true, isFatal: true,
              isLostTimeIncident: true, lostWorkdays: true,
              isRestrictedWork: true, medicalAttentionRequired: true,
            },
          },
          sjaAnalyses: {
            orderBy: { plannedDate: "desc" },
            select: {
              sjaNummer: true, title: true, status: true,
              plannedDate: true, workLocation: true,
              responsibleName: true,
              participants: true,
              additionalConditions: true,
              weatherConditions: true,
              conclusion: true,
              hazards: {
                orderBy: { sortOrder: "asc" },
                select: {
                  activity: true,
                  hazard: true,
                  measures: true,
                  riskLevel: true,
                },
              },
            },
          },
          inspections: {
            orderBy: { scheduledDate: "desc" },
            select: { title: true, type: true, status: true, scheduledDate: true, location: true },
          },
          measures: {
            orderBy: { dueAt: "asc" },
            select: { title: true, status: true, dueAt: true, category: true },
          },
          timeEntries: { select: { hours: true } },
        },
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.attachment.findMany({
        where: {
          tenantId,
          objectType: "PROJECT",
          objectId: id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          name: true,
          mime: true,
          size: true,
          createdAt: true,
        },
      }),
    ]);

    if (!project) return new NextResponse("Prosjekt ikke funnet", { status: 404 });

    const manHours = project.timeEntries.reduce((s, e) => s + e.hours, 0);

    const pdfBuffer = await generateProjectReport({
      project,
      incidents: project.incidents,
      sjaAnalyses: project.sjaAnalyses,
      inspections: project.inspections,
      measures: project.measures,
      attachments,
      manHours,
      tenantName: tenant?.name ?? "HMS Nova",
    });

    const filename = `HMS-Rapport-${project.name.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, "").replace(/\s+/g, "-")}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    console.error("[Project Report]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
