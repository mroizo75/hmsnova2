import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const switchTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID er påkrevd"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId } = switchTenantSchema.parse(body);

    // Verifiser at brukeren har tilgang til denne tenanten
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId,
        },
      },
      include: {
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!userTenant) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bedriften" },
        { status: 403 }
      );
    }

    // Sjekk at tenanten er aktiv
    if (userTenant.tenant.status === "CANCELLED" || userTenant.tenant.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Denne bedriften er ikke aktiv" },
        { status: 403 }
      );
    }

    // Oppdater brukerens siste valgte tenant
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastTenantId: tenantId },
    });

    // Session vil bli oppdatert ved neste request via proxy (tidligere middleware)
    return NextResponse.json({ success: true, tenantId });
  } catch (error) {
    console.error("Switch tenant error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ugyldig input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Kunne ikke bytte bedrift" },
      { status: 500 }
    );
  }
}
