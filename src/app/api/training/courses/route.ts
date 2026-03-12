import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Hent både globale og tenant-spesifikke kursmaler
    const courses = await prisma.courseTemplate.findMany({
      where: {
        OR: [
          { tenantId },
          { isGlobal: true },
        ],
      },
      orderBy: [
        { isGlobal: "desc" }, // Globale først
        { title: "asc" },
      ],
    });

    return NextResponse.json({ courses });
  } catch (error: any) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
