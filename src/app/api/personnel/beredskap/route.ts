import { NextResponse } from "next/server";
import { generateDocumentPdf } from "@/lib/pdf-brand";
import { buildEmergencyRoster } from "@/features/personnel/lib/emergency-roster";
import { fetchEmergencyRoster } from "@/server/queries/personnel.queries";

export async function GET() {
  const roster = await fetchEmergencyRoster();
  if (!roster) {
    return NextResponse.json({ error: "Du har ikke tilgang til beredskapsfilen" }, { status: 403 });
  }

  const pdfBuffer = await generateDocumentPdf({
    ...buildEmergencyRoster(roster),
    generatedAt: new Date(),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Beredskapsfil.pdf"',
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
