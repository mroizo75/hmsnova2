import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AiDisabledError, generateAIResponse } from "@/lib/ai";
import { FIRE_DRILL_TYPE_LABELS, type FireDrillType } from "@/features/fire-drills/schemas/fire-drill.schema";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  drillType: z.enum(["EVACUATION", "FIRE_SUPPRESSION", "ALARM_TEST", "FULL_SCALE"]),
  location: z.string().optional(),
  isAnnounced: z.boolean().optional(),
});

const draftSchema = z.object({
  title: z.string().min(3),
  objectives: z.string().min(10),
  scenario: z.string().min(10),
  riskAssessment: z.string().min(10),
  routineId: z.string().nullable(),
  riskAssessmentId: z.string().nullable(),
  emergencyPlanDocumentId: z.string().nullable(),
});

function parseDraft(raw: string) {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  return draftSchema.parse(JSON.parse(trimmed));
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = requestSchema.parse(await request.json());

    const [riskAssessments, risks, routines, plans] = await Promise.all([
      prisma.riskAssessment.findMany({
        where: { tenantId },
        select: { id: true, title: true, assessmentYear: true },
        orderBy: { assessmentYear: "desc" },
        take: 8,
      }),
      prisma.risk.findMany({
        where: {
          tenantId,
          OR: [
            { category: { in: ["SAFETY", "PHYSICAL"] } },
            { title: { contains: "brann" } },
            { title: { contains: "Brann" } },
          ],
        },
        select: { title: true, description: true, existingControls: true, score: true },
        orderBy: { score: "desc" },
        take: 8,
      }),
      prisma.routine.findMany({
        where: { tenantId, status: "ACTIVE" },
        select: { id: true, title: true, category: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.document.findMany({
        where: {
          tenantId,
          status: { not: "ARCHIVED" },
          OR: [
            { kind: "PLAN" },
            { title: { contains: "beredskap" } },
            { title: { contains: "Beredskap" } },
          ],
        },
        select: { id: true, title: true, kind: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const prompt = `Lag et utkast til brannøvelse for en norsk virksomhet.
Type: ${FIRE_DRILL_TYPE_LABELS[body.drillType as FireDrillType]}
Varslet: ${body.isAnnounced === false ? "nei" : "ja"}
Sted: ${body.location?.trim() || "ikke oppgitt"}

Risikovurderinger:
${riskAssessments.map((item) => `- ${item.id}: ${item.title} (${item.assessmentYear})`).join("\n") || "- ingen"}

Relevante risikoer:
${risks.map((item) => `- ${item.title} (score ${item.score}): ${item.description ?? ""} Kontroller: ${item.existingControls ?? ""}`).join("\n") || "- ingen"}

Rutiner:
${routines.map((item) => `- ${item.id}: ${item.title}`).join("\n") || "- ingen"}

Beredskapsplaner og plan-dokumenter:
${plans.map((item) => `- ${item.id}: ${item.title}`).join("\n") || "- ingen"}

Svar kun med JSON:
{"title":"","objectives":"","scenario":"","riskAssessment":"","routineId":null,"riskAssessmentId":null,"emergencyPlanDocumentId":null}

objectives, scenario og riskAssessment skal være minst to setninger på norsk.
Knytt routineId, riskAssessmentId og emergencyPlanDocumentId bare til id-er fra listene over. Bruk null når ingen passer.
Ikke finn på lovkrav om at alle virksomheter må ha brannøvelse. Øvelsen skal være tilpasset risikoen som finnes.
Forskrift om brannforebygging § 12: målet skal dekke evakuering, kunnskap og informasjon.`;

    const raw = await generateAIResponse(prompt, "gpt-4o-mini", {
      tenantId,
      systemPrompt:
        "Du skriver utkast til brannøvelser i HMS Nova. Svar kun med gyldig JSON på norsk. Ikke legg til personer, fødselsnummer eller gjestenavn.",
    });
    const draft = parseDraft(raw);
    const routineIds = new Set(routines.map((item) => item.id));
    const assessmentIds = new Set(riskAssessments.map((item) => item.id));
    const planIds = new Set(plans.map((item) => item.id));

    return NextResponse.json({
      title: draft.title,
      objectives: draft.objectives,
      scenario: draft.scenario,
      riskAssessment: draft.riskAssessment,
      routineId: draft.routineId && routineIds.has(draft.routineId) ? draft.routineId : null,
      riskAssessmentId:
        draft.riskAssessmentId && assessmentIds.has(draft.riskAssessmentId) ? draft.riskAssessmentId : null,
      emergencyPlanDocumentId:
        draft.emergencyPlanDocumentId && planIds.has(draft.emergencyPlanDocumentId)
          ? draft.emergencyPlanDocumentId
          : null,
    });
  } catch (error) {
    if (error instanceof AiDisabledError) {
      return NextResponse.json({ error: "AI er ikke aktivert for virksomheten." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "AI-svaret kunne ikke brukes. Prøv igjen." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Kunne ikke lage utkast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
