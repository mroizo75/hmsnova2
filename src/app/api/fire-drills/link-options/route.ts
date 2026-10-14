import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const [riskAssessments, emergencyPlans] = await Promise.all([
    prisma.riskAssessment.findMany({
      where: { tenantId },
      select: { id: true, title: true, assessmentYear: true },
      orderBy: { assessmentYear: "desc" },
      take: 30,
    }),
    prisma.document.findMany({
      where: {
        tenantId,
        status: { not: "ARCHIVED" },
        OR: [
          { kind: "PLAN" },
          { title: { contains: "beredskap" } },
          { title: { contains: "Beredskap" } },
        ],
      },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  return NextResponse.json({
    riskAssessments: riskAssessments.map((item) => ({
      id: item.id,
      title: `${item.title} (${item.assessmentYear})`,
    })),
    emergencyPlans,
  });
}
