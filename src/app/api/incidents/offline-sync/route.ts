import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createIncident } from "@/server/actions/incident.actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const result = await createIncident({
      ...payload,
      reportedBy: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Kunne ikke synkronisere avvik" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Intern feil ved synkronisering" },
      { status: 500 },
    );
  }
}

