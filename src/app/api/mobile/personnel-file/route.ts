import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { fetchMyPersonnelFolder } from "@/server/queries/personnel.queries";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const folder = await fetchMyPersonnelFolder();
    if (!folder) {
      return NextResponse.json({ error: "Ingen tilgang til personalmappe" }, { status: 403 });
    }

    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Personnel] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente personalmappe" }, { status: 500 });
  }
}
