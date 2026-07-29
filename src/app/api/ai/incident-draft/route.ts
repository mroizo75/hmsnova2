import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { generateAiIncidentCaseDraft } from "@/server/actions/ai-assistant.actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await generateAiIncidentCaseDraft({
      mode: body.mode === "RUH" ? "RUH" : "INCIDENT",
      type: typeof body.type === "string" ? body.type : "",
      title: typeof body.title === "string" ? body.title : "",
      description: typeof body.description === "string" ? body.description : "",
      severity:
        typeof body.severity === "number" && Number.isFinite(body.severity)
          ? body.severity
          : null,
      incidentContext: typeof body.incidentContext === "string" ? body.incidentContext : undefined,
      availableIncidentTypes: Array.isArray(body.availableIncidentTypes)
        ? body.availableIncidentTypes.filter((item: unknown): item is string => typeof item === "string")
        : undefined,
      availableRuhCategories: Array.isArray(body.availableRuhCategories)
        ? body.availableRuhCategories.filter((item: unknown): item is string => typeof item === "string")
        : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Kunne ikke generere AI-forslag" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil ved AI-forslag" },
      { status: 500 }
    );
  }
}
