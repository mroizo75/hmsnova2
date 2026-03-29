import { NextRequest, NextResponse } from "next/server";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getRosterRetentionUntil } from "@/lib/construction-compliance-rules";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  projectManagerId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getRequiredTenantContext();
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        projectManager: { select: { id: true, name: true, email: true } },
        incidents: {
          orderBy: { occurredAt: "desc" },
          select: {
            id: true, avviksnummer: true, title: true, type: true,
            severity: true, status: true, occurredAt: true,
            isFatal: true, isLostTimeIncident: true, lostWorkdays: true,
            isRestrictedWork: true, medicalAttentionRequired: true,
          },
        },
        sjaAnalyses: {
          orderBy: { plannedDate: "desc" },
          select: {
            id: true, sjaNummer: true, title: true, status: true,
            plannedDate: true, workLocation: true,
          },
        },
        inspections: {
          orderBy: { scheduledDate: "desc" },
          select: {
            id: true, title: true, type: true, status: true,
            scheduledDate: true, location: true,
          },
        },
        measures: {
          orderBy: { dueAt: "asc" },
          select: {
            id: true, title: true, status: true, dueAt: true,
            category: true,
          },
        },
        timeEntries: {
          select: { hours: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getRequiredTenantContext();
    const { id } = await params;
    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    const existing = await prisma.project.findUnique({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });
    let validatedProjectManagerId: string | null | undefined = undefined;
    if (validated.projectManagerId !== undefined) {
      if (validated.projectManagerId === null) {
        validatedProjectManagerId = null;
      } else {
        const manager = await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId: validated.projectManagerId,
              tenantId,
            },
          },
          select: { userId: true },
        });
        if (!manager) {
          return NextResponse.json({ error: "Prosjektleder finnes ikke i tenant" }, { status: 400 });
        }
        validatedProjectManagerId = manager.userId;
      }
    }

    const project = await prisma.project.update({
      where: { id, tenantId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.code !== undefined && { code: validated.code }),
        ...(validated.orderNumber !== undefined && { orderNumber: validated.orderNumber }),
        ...(validated.clientName !== undefined && { clientName: validated.clientName }),
        ...(validated.location !== undefined && { location: validated.location }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.startDate !== undefined && {
          startDate: validated.startDate ? new Date(validated.startDate) : null,
        }),
        ...(validated.endDate !== undefined && {
          endDate: validated.endDate ? new Date(validated.endDate) : null,
        }),
        ...(validatedProjectManagerId !== undefined && {
          projectManagerId: validatedProjectManagerId,
        }),
      },
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getRequiredTenantContext();
    const { id } = await params;

    const existing = await prisma.project.findUnique({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });

    const rosterSummary = await prisma.constructionRosterEntry.aggregate({
      where: { projectId: id, tenantId },
      _count: { _all: true },
      _max: { endedAtSiteDate: true },
    });
    const activeRosterCount = await prisma.constructionRosterEntry.count({
      where: { projectId: id, tenantId, isActive: true },
    });

    if ((rosterSummary._count._all ?? 0) > 0) {
      if (activeRosterCount > 0) {
        return NextResponse.json(
          {
            error:
              "Prosjekt kan ikke slettes mens oversiktslisten har aktive arbeidstakere. Avslutt linjene først.",
          },
          { status: 400 }
        );
      }

      const workFinishedAt = existing.endDate ?? rosterSummary._max.endedAtSiteDate;
      if (!workFinishedAt) {
        return NextResponse.json(
          {
            error:
              "Prosjekt med oversiktsliste må ha sluttdato før sletting. Dette kreves for 6 måneders oppbevaring av oversiktsliste.",
          },
          { status: 400 }
        );
      }

      const retentionUntil = getRosterRetentionUntil(workFinishedAt);
      if (new Date() < retentionUntil) {
        return NextResponse.json(
          {
            error: `Prosjekt kan ikke slettes før oppbevaringsfrist er utløpt (${retentionUntil.toLocaleDateString("nb-NO")}).`,
          },
          { status: 400 }
        );
      }
    }

    const projectAttachments = await prisma.attachment.findMany({
      where: {
        tenantId,
        objectType: "PROJECT",
        objectId: id,
      },
      select: {
        id: true,
        fileKey: true,
      },
    });

    const storage = getStorage();
    const deleteResults = await Promise.allSettled(
      projectAttachments.map((attachment) => storage.delete(attachment.fileKey))
    );
    const failedDeletes = deleteResults.filter((result) => result.status === "rejected");
    if (failedDeletes.length > 0) {
      return NextResponse.json(
        {
          error:
            "Kunne ikke slette alle prosjektvedlegg fra cloud-lagring. Prosjektet ble ikke slettet.",
        },
        { status: 500 }
      );
    }

    // Fjern prosjektkobling fra relaterte modeller, slett prosjektvedlegg og til slutt prosjektet
    await prisma.$transaction([
      prisma.incident.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.sjaAnalysis.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.inspection.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.measure.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.attachment.deleteMany({
        where: {
          tenantId,
          objectType: "PROJECT",
          objectId: id,
        },
      }),
      prisma.project.delete({ where: { id, tenantId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
