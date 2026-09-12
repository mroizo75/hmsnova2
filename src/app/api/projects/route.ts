import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { enqueueAccountingJob } from "@/lib/accounting/sync";

const createProjectSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  code: z.string().optional(),
  orderNumber: z.string().optional(),
  clientName: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("PLANNING"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  jobKind: z.enum(["SERVICE", "HMS"]).optional(),
  parentId: z.string().optional(),
  contactExternalId: z.string().optional(),
  customerExternalId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Ingen tenant" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const projects = await prisma.project.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        projectManager: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            incidents: true,
            sjaAnalyses: true,
            inspections: true,
            measures: true,
            timeEntries: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Ingen tenant" }, { status: 400 });

    const body = await request.json();
    const validated = createProjectSchema.parse(body);
    let validatedProjectManagerId: string | null = null;
    if (validated.projectManagerId) {
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountingProvider: true },
    });
    const accountingOn = tenant?.accountingProvider === "TRIPLETEX";

    let clientName = validated.clientName || null;
    let externalCustomerId: string | null = null;
    if (accountingOn && validated.customerExternalId) {
      const customer = await prisma.accountingCustomer.findUnique({
        where: {
          tenantId_externalId: { tenantId, externalId: validated.customerExternalId },
        },
      });
      if (!customer) {
        return NextResponse.json({ error: "Kunde ikke funnet i Tripletex-cache" }, { status: 400 });
      }
      clientName = customer.name;
      externalCustomerId = customer.externalId;
    } else if (accountingOn && !validated.customerExternalId && !validated.parentId) {
      // Kunde er valgfri (krav 5) — intern Tripletex-prosjekt uten kunde
    }

    const project = await prisma.project.create({
      data: {
        tenantId,
        name: validated.name,
        code: validated.code || null,
        orderNumber: validated.orderNumber || null,
        clientName,
        location: validated.location || null,
        description: validated.description || null,
        status: validated.status,
        startDate: validated.startDate ? new Date(validated.startDate) : null,
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        projectManagerId: validatedProjectManagerId,
        createdById: session.user.id,
        jobKind: validated.jobKind ?? "HMS",
        billingStatus: "OPEN",
        externalCustomerId,
        parentId: validated.parentId || null,
        contactExternalId: validated.contactExternalId || null,
      },
    });

    if (accountingOn) {
      await enqueueAccountingJob({
        tenantId,
        entityType: "Project",
        entityId: project.id,
        action: "CREATE_PROJECT",
        payload: { customerExternalId: externalCustomerId },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "PROJECT_CREATED",
        resource: `Project:${project.id}`,
        metadata: JSON.stringify({ name: project.name }),
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
