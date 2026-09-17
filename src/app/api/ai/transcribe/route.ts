import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { AiDisabledError } from "@/lib/ai";
import { transcribeAudioForTenant, TranscriptionError } from "@/lib/ai-transcribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId || !session.user.id) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Ikke autorisert" },
        { status: 401 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Lydfil mangler" },
        { status: 400 }
      );
    }

    const text = await transcribeAudioForTenant({
      tenantId,
      audio: file,
      fileName: file.name || "speech.webm",
      mimeType: file.type || "audio/webm",
    });

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof AiDisabledError) {
      return NextResponse.json(
        { code: error.code, message: "Aktiver AI-tillegg for tale-til-tekst" },
        { status: 403 }
      );
    }
    if (error instanceof TranscriptionError) {
      const status = error.code === "TOO_LARGE" || error.code === "UNSUPPORTED_TYPE" ? 400 : 422;
      return NextResponse.json({ code: error.code, message: error.message }, { status });
    }
    const message = error instanceof Error ? error.message : "Kunne ikke transkribere tale";
    return NextResponse.json({ code: "TRANSCRIBE_FAILED", message }, { status: 500 });
  }
}
