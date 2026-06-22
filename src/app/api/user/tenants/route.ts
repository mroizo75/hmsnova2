import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantFeaturesForIndustry } from "@/lib/tenant-features";
import { parseModuleVisibilityConfig } from "@/lib/module-visibility";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                employeeCount: true,
                industry: true,
                moduleVisibilityConfig: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    const tenants = user.tenants.map((ut) => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      slug: ut.tenant.slug,
      status: ut.tenant.status,
      role: ut.role,
      employeeCount: ut.tenant.employeeCount,
      industry: ut.tenant.industry,
      features: getTenantFeaturesForIndustry(ut.tenant.industry),
      moduleVisibilityConfig: parseModuleVisibilityConfig(ut.tenant.moduleVisibilityConfig),
    }));

    return NextResponse.json({
      tenants,
      hasMultipleTenants: tenants.length > 1,
      lastTenantId: user.lastTenantId,
    });
  } catch (error) {
    console.error("Get tenants error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente bedrifter" },
      { status: 500 }
    );
  }
}
