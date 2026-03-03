import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const training = await prisma.training.findUnique({
      where: { id, tenantId: session.user.tenantId },
      select: { proofDocKey: true },
    });

    if (!training) {
      return NextResponse.json({ error: "Opplæring ikke funnet" }, { status: 404 });
    }

    if (!training.proofDocKey) {
      return NextResponse.json({ error: "Ingen diplom lastet opp" }, { status: 404 });
    }

    const storage = getStorage();
    const url = await storage.getUrl(training.proofDocKey, 3600);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get certificate URL error:", error);
    return NextResponse.json({ error: "Kunne ikke hente diplom" }, { status: 500 });
  }
}
