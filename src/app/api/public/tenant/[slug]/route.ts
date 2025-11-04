import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenant/[slug]
 * Hent grunnleggende tenant-info basert på slug (for varslingssystemet)
 * Returnerer kun offentlig info (navn, id) - ingen sensitiv data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: {
        slug,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Bedrift ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error("[Public Tenant GET] Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente bedriftsinformasjon" },
      { status: 500 }
    );
  }
}

