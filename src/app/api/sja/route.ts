import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { createSjaAnalysis, getSjaAnalyses } from "@/server/actions/sja.actions";

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

    const result = await getSjaAnalyses(tenantId);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Kunne ikke hente SJA" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil ved henting av SJA" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await createSjaAnalysis(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Kunne ikke opprette SJA" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil ved opprettelse av SJA" },
      { status: 500 }
    );
  }
}
