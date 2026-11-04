import { NextResponse } from "next/server";
import { buildEmergencyRosterWorkbook } from "@/features/personnel/lib/emergency-roster";
import { fetchEmergencyRoster } from "@/server/queries/personnel.queries";

export async function GET() {
  const roster = await fetchEmergencyRoster();
  if (!roster) {
    return NextResponse.json({ error: "Du har ikke tilgang til beredskapsfilen" }, { status: 403 });
  }

  const workbook = await buildEmergencyRosterWorkbook(roster);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Beredskapsfil.xlsx"',
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
