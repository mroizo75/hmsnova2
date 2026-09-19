import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadDocumentFile } from "@/lib/document-file";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokument ikke funnet" }, { status: 404 });
    }

    const buffer = await loadDocumentFile(document);
    if (!buffer) {
      return NextResponse.json(
        { error: "Dokumentfilen finnes ikke i lagring. Last opp filen på nytt." },
        { status: 404 }
      );
    }

    const ext = document.mime === "application/pdf" ? ".pdf" : "";
    const filename = document.title.replace(/[^a-zA-Z0-9æøåÆØÅ._\s-]/g, "_") + ext;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": document.mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(
      "Feil ved nedlasting av dokument:",
      error instanceof Error ? error.message : "ukjent feil"
    );
    return NextResponse.json(
      { error: "Kunne ikke laste ned dokument" },
      { status: 500 }
    );
  }
}
