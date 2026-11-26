import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { getAuthContext } from "@/lib/server-authorization";
import { buildAdvisorContext } from "@/features/hms-ai/lib/advisor-context";
import { AiDisabledError, generateAIResponse } from "@/lib/ai";
import {
  HMS_OFF_TOPIC_REFUSAL,
  parseHmsVerdict,
  resolveAdvisorPreflight,
  shouldLoadAdvisorContext,
} from "@/lib/hms-ai-policy";

const advisorBodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.unknown().optional(),
});

const CLASSIFIER_TASK =
  "Du klassifiserer om en melding gjelder HMS-arbeid i Norge. Svar bare HMS eller IKKE. Ingen forklaring og ingen bedriftsdata.";

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof advisorBodySchema>;
  try {
    body = advisorBodySchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof ZodError
      ? error.issues.map((issue) => issue.message).join(". ")
      : "Ugyldig melding";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const preflight = resolveAdvisorPreflight(body.message, body.history);
  if (preflight.outcome === "refuse") {
    return NextResponse.json({ reply: preflight.reply });
  }

  try {
    let modelAllows = preflight.outcome === "answer";
    if (!modelAllows) {
      const verdict = await generateAIResponse(
        `Klassifiser brukermeldingen. Svar med ett ord: HMS eller IKKE.\n\nBrukermelding:\n${preflight.message}`,
        "gpt-4o-mini",
        {
          tenantId: auth.tenantId,
          systemPrompt: CLASSIFIER_TASK,
          cacheScope: "hms-topic-classifier",
          rateLimitScope: `tenant:${auth.tenantId}`,
          budgetScope: `tenant:${auth.tenantId}`,
          includesTenantContext: false,
        },
      );
      modelAllows = parseHmsVerdict(verdict);
    }

    if (!shouldLoadAdvisorContext(preflight, modelAllows)) {
      return NextResponse.json({ reply: HMS_OFF_TOPIC_REFUSAL });
    }

    const context = await buildAdvisorContext(auth.tenantId);
    const reply = await generateAIResponse(
      `Du hjelper den innloggede virksomheten med HMS-spørsmål og oppgaver. Bruk bare statusen under. Opprett ingen poster.

${context}

Spørsmål:
${preflight.message}`,
      "gpt-4o-mini",
      {
        tenantId: auth.tenantId,
        cacheScope: `advisor:${auth.tenantId}`,
        rateLimitScope: `tenant:${auth.tenantId}`,
        budgetScope: `tenant:${auth.tenantId}`,
        includesTenantContext: true,
        history: preflight.history,
        ragQuery: preflight.message,
      },
    );

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof AiDisabledError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Kunne ikke generere svar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
