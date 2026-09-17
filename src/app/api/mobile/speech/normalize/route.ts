import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { generateAIResponse } from "@/lib/ai";
import { prisma } from "@/lib/db";

const isTargetLang = (value: unknown): value is "nb" | "en" => {
  return value === "nb" || value === "en";
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { aiEnabled: true, speechToTextEnabled: true },
    });
    if (!tenant?.aiEnabled) {
      return NextResponse.json({ error: "Tale-til-tekst krever aktivert AI-tillegg" }, { status: 403 });
    }

    const body = (await request.json()) as {
      text?: string;
      sourceLang?: string;
      targetLang?: string;
    };

    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "Tekst mangler" }, { status: 400 });
    }

    const targetLang = isTargetLang(body.targetLang) ? body.targetLang : "nb";
    const sourceLang = typeof body.sourceLang === "string" && body.sourceLang.trim().length >= 2
      ? body.sourceLang.trim()
      : "und";
    const targetName = targetLang === "en" ? "English" : "Norwegian Bokmål";

    const prompt = `Rewrite the spoken field note into ${targetName} only.
Keep the meaning, facts and names. Do not add headings, quotes or extra commentary.
Source language code: ${sourceLang}
Spoken text:
${text}`;

    const rewritten = await generateAIResponse(prompt, "gpt-4o-mini", {
      tenantId: session.user.tenantId,
      cacheScope: `speech-normalize:${session.user.tenantId}`,
      rateLimitScope: `speech-normalize:${session.user.tenantId}`,
      budgetScope: session.user.tenantId,
      systemPrompt: `You convert spoken workplace notes into ${targetName}. Output only the rewritten text in ${targetName}. Keep facts, names and numbers. No quotes, headings or commentary.`,
    });

    return NextResponse.json({ text: rewritten.trim() || text }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kunne ikke tilpasse teksten";
    return NextResponse.json({ error: message, text: null }, { status: 200 });
  }
}
