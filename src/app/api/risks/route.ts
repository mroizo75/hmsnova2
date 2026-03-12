import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { CreateRiskSchema } from "@/lib/validations/schemas";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "User not associated with tenant" }, { status: 403 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const bodyData = await request.json();

    // SIKKERHET: Valider og sanitér all input med Zod
    let validatedData;
    try {
      validatedData = CreateRiskSchema.parse(bodyData);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: "Ugyldig input", 
            details: error.issues.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            }))
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const {
      title,
      context,
      category,
      likelihood,
      consequence,
      score,
      chemicalId,
      exposure,
      suggestedControls,
      trainingRequired,
    } = validatedData;

    // Opprett risiko
    const risk = await prisma.risk.create({
      data: {
        tenantId,
        title,
        context,
        category,
        likelihood,
        consequence,
        score,
        ownerId: user.id,
        status: "OPEN",
      },
    });

    // Koble kjemikalie hvis angitt
    if (chemicalId && exposure) {
      await prisma.riskChemicalLink.create({
        data: {
          tenantId,
          riskId: risk.id,
          chemicalId,
          exposure,
          ppRequired: exposure === "HIGH" || exposure === "CRITICAL",
        },
      });
    }

    // Legg til foreslåtte tiltak som measures
    if (suggestedControls && Array.isArray(suggestedControls)) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 dager frem

      for (const control of suggestedControls) {
        await prisma.measure.create({
          data: {
            title: control,
            description: `Sikkerhetstiltak for risiko: ${title}`,
            status: "PENDING",
            dueAt: dueDate,
            tenant: {
              connect: { id: tenantId },
            },
            responsible: {
              connect: { id: user.id },
            },
            risk: {
              connect: { id: risk.id },
            },
          },
        });
      }
    }

    // Legg til opplæringskrav hvis angitt
    if (trainingRequired && Array.isArray(trainingRequired)) {
      for (const courseKey of trainingRequired) {
        try {
          await prisma.riskTrainingRequirement.create({
            data: {
              tenantId,
              riskId: risk.id,
              courseKey,
              isMandatory: true,
              reason: "Automatisk foreslått basert på kjemikaliedata",
            },
          });
        } catch (error) {
          // Ignorer hvis kurset ikke finnes eller allerede er lagt til
          console.error(`Failed to add training requirement: ${courseKey}`, error);
        }
      }
    }

    await AuditLog.log(
      tenantId,
      user.id,
      "RISK_CREATED",
      "Risk",
      risk.id,
      {
        title,
        category,
        score,
        fromChemical: !!chemicalId,
      }
    );

    return NextResponse.json({ risk }, { status: 201 });
  } catch (error: any) {
    console.error("Create risk error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create risk" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "User not associated with tenant" }, { status: 403 });
    }

    const risks = await prisma.risk.findMany({
      where: { tenantId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        measures: true,
        chemicalLinks: {
          include: {
            chemical: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ risks });
  } catch (error: any) {
    console.error("Get risks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch risks" },
      { status: 500 }
    );
  }
}
