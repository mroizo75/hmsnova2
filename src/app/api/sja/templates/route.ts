import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getSjaTemplates } from "@/server/actions/sja.actions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }

    const result = await getSjaTemplates(tenantId);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Kunne ikke hente SJA-maler" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil ved henting av SJA-maler" },
      { status: 500 }
    );
  }
}
