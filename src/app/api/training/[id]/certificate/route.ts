import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { parseProofDocKeys } from "@/features/training/lib/proof-doc-keys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const keys = parseProofDocKeys(training.proofDocKey);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Ingen diplom lastet opp" }, { status: 404 });
    }

    const storage = getStorage();

    // Hent index fra query for spesifikt dokument, ellers returnér alle
    const { searchParams } = new URL(request.url);
    const indexParam = searchParams.get("index");

    if (indexParam !== null) {
      const idx = parseInt(indexParam, 10);
      if (idx < 0 || idx >= keys.length) {
        return NextResponse.json({ error: "Ugyldig dokument-indeks" }, { status: 400 });
      }
      const url = await storage.getUrl(keys[idx], 3600);
      return NextResponse.json({ url });
    }

    // Returnér alle URLs
    const urls = await Promise.all(keys.map((key) => storage.getUrl(key, 3600)));
    if (urls.length === 1) {
      return NextResponse.json({ url: urls[0] });
    }
    return NextResponse.json({ urls, url: urls[0] });
  } catch (error) {
    console.error("Get certificate URL error:", error);
    return NextResponse.json({ error: "Kunne ikke hente diplom" }, { status: 500 });
  }
}
