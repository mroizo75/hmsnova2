import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { convertDocumentToPDF } from "@/lib/adobe-pdf";
import { loadDocumentFile } from "@/lib/document-file";

const DOCX_MIMES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

/**
 * Server dokument for visning i nettleser (PDF).
 * - PDF: streamer originalen med Content-Disposition: inline.
 * - DOCX: konverterer til PDF via Adobe (cacher i storage), streamer PDF med inline.
 */
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

    const tenantId = session.user.tenantId;

    const document = await prisma.document.findUnique({
      where: {
        id,
        tenantId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokument ikke funnet" }, { status: 404 });
    }

    const storage = getStorage();
    let pdfBuffer: Buffer;

    if (document.mime === "application/pdf") {
      const buffer = await loadDocumentFile(document);
      if (!buffer) {
        return NextResponse.json(
          { error: "Dokumentfilen finnes ikke i lagring. Last opp filen på nytt." },
          { status: 404 }
        );
      }
      pdfBuffer = buffer;
    } else if (DOCX_MIMES.includes(document.mime)) {
      const cacheKey = `${tenantId}/documents/pdf/${id}.pdf`;
      let cached = await storage.get(cacheKey);

      if (cached) {
        pdfBuffer = cached;
      } else {
        const docBuffer = await loadDocumentFile(document);
        if (!docBuffer) {
          return NextResponse.json(
            { error: "Dokumentfilen finnes ikke i lagring. Last opp filen på nytt." },
            { status: 404 }
          );
        }

        try {
          pdfBuffer = await convertDocumentToPDF(docBuffer, document.mime);
        } catch (err) {
          console.error(
            "Adobe DOCX->PDF conversion error:",
            err instanceof Error ? err.message : "ukjent feil"
          );
          return NextResponse.json(
            { error: "Kunne ikke konvertere dokument til PDF. Sjekk at Adobe PDF Services er konfigurert." },
            { status: 502 }
          );
        }

        await storage.upload(cacheKey, pdfBuffer, {
          "Content-Type": "application/pdf",
        });
      }
    } else {
      return NextResponse.json(
        { error: "Dette formatet kan ikke vises i nettleser. Last ned filen." },
        { status: 400 }
      );
    }

    const filename = document.title.replace(/[^a-zA-Z0-9æøåÆØÅ._\s-]/g, "_") + ".pdf";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(
      "Feil ved visning av dokument:",
      error instanceof Error ? error.message : "ukjent feil"
    );
    return NextResponse.json(
      { error: "Kunne ikke vise dokument" },
      { status: 500 }
    );
  }
}
