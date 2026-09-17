import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { FireDrillStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moduleOwnedDocumentsWhere } from "@/lib/document-module-scope";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const [tenant, documents, drills] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          hmsContactName: true,
          hmsContactPhone: true,
        },
      }),
      prisma.document.findMany({
        where: {
          tenantId,
          status: "APPROVED",
          ...moduleOwnedDocumentsWhere,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          nextReviewDate: true,
        },
      }),
      prisma.fireDrill.findMany({
        where: {
          tenantId,
          status: {
            in: [
              FireDrillStatus.PLANNED,
              FireDrillStatus.IN_PROGRESS,
              FireDrillStatus.COMPLETED,
              FireDrillStatus.EVALUATED,
            ],
          },
        },
        orderBy: { plannedDate: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          drillType: true,
          status: true,
          plannedDate: true,
          location: true,
          routineId: true,
        },
      }),
    ]);

    return NextResponse.json({
      contact: {
        tenantName: tenant?.name ?? null,
        hmsContactName: tenant?.hmsContactName ?? null,
        hmsContactPhone: tenant?.hmsContactPhone ?? null,
      },
      documents,
      drills,
    });
  } catch (error) {
    console.error("[Mobile BCM] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente beredskap" }, { status: 500 });
  }
}
