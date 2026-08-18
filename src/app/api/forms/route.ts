import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ forms: [] });
    }

    // Hent category fra query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const showAll = searchParams.get("view") === "all";

    // Bygg where-clause - hent både tenant-spesifikke og globale skjemaer
    const where: any = {
      OR: [
        { tenantId, isActive: true },
        { isGlobal: true, isActive: true },
      ],
    };

    // Filtrer på kategori hvis spesifisert
    if (category) {
      where.category = category;
    }

    const forms = await prisma.formTemplate.findMany({
      where,
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (showAll) {
      return NextResponse.json({ forms });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    const scopedForms = forms.filter((form) =>
      tenantCanUseGlobalFormTemplate(form, tenant?.industry ?? null, {
        allTemplatesView: showAll,
      })
    );

    return NextResponse.json({ forms: scopedForms });
  } catch (error: any) {
    console.error("Get forms error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
