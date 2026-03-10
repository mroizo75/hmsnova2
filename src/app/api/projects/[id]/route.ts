import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    const { id } = await params;
    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    const existing = await prisma.project.findUnique({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });

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
        ...(validated.projectManagerId !== undefined && {
          projectManagerId: validated.projectManagerId,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    const { id } = await params;

    const existing = await prisma.project.findUnique({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 404 });

    // Fjern prosjektkobling fra relaterte modeller, ikke slett dem
    await prisma.$transaction([
      prisma.incident.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.sjaAnalysis.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.inspection.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.measure.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.project.delete({ where: { id, tenantId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
