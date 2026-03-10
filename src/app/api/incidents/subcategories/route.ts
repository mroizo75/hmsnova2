import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { IncidentType } from "@prisma/client";

// GET /api/incidents/subcategories?type=ULYKKE
// Henter systemstandard + tenant-egne underkategorier for en gitt hendelsestype
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as IncidentType | null;

    if (!type) {
      return NextResponse.json({ error: "type er påkrevd" }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    // Hent systemstandard (tenantId = null) + tenant-egne for denne typen
    const options = await prisma.incidentSubcategoryOption.findMany({
      where: {
        incidentType: type,
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId: tenantId ?? undefined },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        industry: true,
        tenantId: true,
      },
    });

    return NextResponse.json({ options });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil" },
      { status: 500 }
    );
  }
}
