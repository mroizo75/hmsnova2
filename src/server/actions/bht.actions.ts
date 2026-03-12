"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AuditLog } from "@/lib/audit-log";
import { generateAIResponse } from "@/lib/ai";
import { hasTenantFeature } from "@/lib/tenant-features";

/**
 * Legg til ny BHT-kunde
 */
export async function addBhtClient(input: {
  tenantId: string;
  packageType: "BASIC" | "EXTENDED";
  contractStartDate: Date;
  contractEndDate?: Date;
  notes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Sjekk at tenant finnes og ikke allerede er BHT-kunde
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId },
      include: { bhtClient: true },
    });

    if (!tenant) {
      return { success: false, error: "Kunde ikke funnet" };
    }

    if (!hasTenantFeature(tenant.industry, "bht")) {
      return {
        success: false,
        error: "Kunden er ikke i helsebransje og kan ikke registreres som BHT-kunde.",
      };
    }

    if (tenant.bhtClient) {
      return { success: false, error: "Denne kunden er allerede BHT-kunde" };
    }

    // Opprett BHT-kunde
    const bhtClient = await prisma.bhtClient.create({
      data: {
        tenantId: input.tenantId,
        packageType: input.packageType,
        contractStartDate: input.contractStartDate,
        contractEndDate: input.contractEndDate,
        notes: input.notes,
        status: "ACTIVE",
      },
    });

    // Audit log
    await AuditLog.log(
      input.tenantId,
      user.id,
      "BHT_CLIENT_CREATED",
      "BhtClient",
      bhtClient.id,
      {
        packageType: input.packageType,
        contractStartDate: input.contractStartDate,
      }
    );

    revalidatePath("/admin/bht");
    return { success: true, clientId: bhtClient.id };
  } catch (error: any) {
    console.error("addBhtClient error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette BHT-kunde" };
  }
}

/**
 * Start årlig arbeidsmiljøkartlegging med AI
 */
export async function startBhtAssessment(input: {
  bhtClientId: string;
  year: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Hent BHT-kunde med tenant-data
    const bhtClient = await prisma.bhtClient.findUnique({
      where: { id: input.bhtClientId },
      include: {
        tenant: {
          include: {
            incidents: {
              where: {
                createdAt: {
                  gte: new Date(input.year - 1, 0, 1),
                },
              },
              take: 50,
            },
            risks: {
              take: 50,
            },
          },
        },
      },
    });

    if (!bhtClient) {
      return { success: false, error: "BHT-kunde ikke funnet" };
    }

    // Sjekk om kartlegging allerede eksisterer
    const existing = await prisma.bhtAssessment.findUnique({
      where: {
        bhtClientId_year: {
          bhtClientId: input.bhtClientId,
          year: input.year,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Kartlegging for dette året eksisterer allerede" };
    }

    // Generer AI-analyse
    const prompt = `Du er en erfaren HMS-rådgiver som skal gjøre en arbeidsmiljøkartlegging for en bedrift.

Bedriftsinformasjon:
- Navn: ${bhtClient.tenant.name}
- Bransje: ${bhtClient.tenant.industry || "Ikke spesifisert"}
- Antall ansatte: ${bhtClient.tenant.employeeCount || "Ikke spesifisert"}

Registrerte avvik siste år: ${bhtClient.tenant.incidents.length} stk
${bhtClient.tenant.incidents.slice(0, 10).map(i => `- ${i.title}: ${i.description?.substring(0, 100) || ""}`).join("\n")}

Registrerte risikoer: ${bhtClient.tenant.risks.length} stk
${bhtClient.tenant.risks.slice(0, 10).map(r => `- ${r.title}: Sannsynlighet ${r.likelihood}/5, Konsekvens ${r.consequence}/5`).join("\n")}

Basert på dette, generer:
1. En liste over typiske arbeidsmiljørisikoer for denne bransjen og bedriften (maks 10)
2. Mulige avvik/problemer som bør undersøkes nærmere (maks 5)
3. Anbefalte forebyggende tiltak (maks 5)

Svar i JSON-format:
{
  "suggestedRisks": [{"risk": "beskrivelse", "severity": "LOW|MEDIUM|HIGH", "category": "kategori"}],
  "suggestedIssues": [{"issue": "beskrivelse", "priority": "LOW|MEDIUM|HIGH"}],
  "suggestedActions": [{"action": "beskrivelse", "timeline": "kort/mellomlang/lang sikt"}]
}`;

    let aiResult = null;
    try {
      const aiResponse = await generateAIResponse(prompt, "gpt-4o-mini");
      // Parse JSON fra AI-responsen
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("AI analysis error:", aiError);
      // Fortsett uten AI-analyse
    }

    // Opprett kartlegging
    const assessment = await prisma.bhtAssessment.create({
      data: {
        bhtClientId: input.bhtClientId,
        year: input.year,
        status: aiResult ? "AI_ANALYZED" : "DRAFT",
        aiSuggestedRisks: aiResult?.suggestedRisks ? JSON.stringify(aiResult.suggestedRisks) : null,
        aiSuggestedIssues: aiResult?.suggestedIssues ? JSON.stringify(aiResult.suggestedIssues) : null,
        aiSuggestedActions: aiResult?.suggestedActions ? JSON.stringify(aiResult.suggestedActions) : null,
        aiGeneratedAt: aiResult ? new Date() : null,
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, assessmentId: assessment.id };
  } catch (error: any) {
    console.error("startBhtAssessment error:", error);
    return { success: false, error: error.message || "Kunne ikke starte kartlegging" };
  }
}

/**
 * Registrer BHT-rådgivning
 */
export async function addBhtConsultation(input: {
  bhtClientId: string;
  consultationType: "ON_REQUEST" | "ASSESSMENT_RELATED" | "OPERATIONAL_CHANGE" | "FOLLOW_UP";
  topic: string;
  description: string;
  recommendation: string;
  method: "DIGITAL_MEETING" | "PHONE" | "WRITTEN" | "IN_PERSON";
  durationMinutes?: number;
  isWithinScope?: boolean;
  outOfScopeNotes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const consultation = await prisma.bhtConsultation.create({
      data: {
        bhtClientId: input.bhtClientId,
        consultationType: input.consultationType,
        topic: input.topic,
        description: input.description,
        recommendation: input.recommendation,
        method: input.method,
        durationMinutes: input.durationMinutes,
        isWithinScope: input.isWithinScope ?? true,
        outOfScopeNotes: input.outOfScopeNotes,
        conductedBy: user.id,
        conductedAt: new Date(),
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, consultationId: consultation.id };
  } catch (error: any) {
    console.error("addBhtConsultation error:", error);
    return { success: false, error: error.message || "Kunne ikke registrere rådgivning" };
  }
}

/**
 * Start AMO-møte for år
 */
export async function startBhtAmoMeeting(input: {
  bhtClientId: string;
  year: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Hent BHT-kunde med data
    const bhtClient = await prisma.bhtClient.findUnique({
      where: { id: input.bhtClientId },
      include: {
        tenant: {
          include: {
            incidents: {
              where: {
                createdAt: { gte: new Date(input.year - 1, 0, 1) },
              },
              take: 20,
            },
            risks: { take: 20 },
          },
        },
      },
    });

    if (!bhtClient) {
      return { success: false, error: "BHT-kunde ikke funnet" };
    }

    // Generer AI-forslag til agenda
    const prompt = `Du er en erfaren HMS-rådgiver som skal forberede et AMO-møte (arbeidsmiljøutvalg/organ).

Bedrift: ${bhtClient.tenant.name}
Bransje: ${bhtClient.tenant.industry || "Ikke spesifisert"}

Avvik siste år: ${bhtClient.tenant.incidents.length} stk
${bhtClient.tenant.incidents.slice(0, 5).map(i => `- ${i.title}`).join("\n")}

Risikoer: ${bhtClient.tenant.risks.length} stk
${bhtClient.tenant.risks.slice(0, 5).map(r => `- ${r.title}`).join("\n")}

Foreslå 5-7 agendapunkter for AMO-møtet som fokuserer på arbeidsmiljø (ikke personalsaker).
Svar i JSON-format:
{
  "suggestedAgenda": [{"topic": "tema", "description": "kort beskrivelse", "priority": "HIGH|MEDIUM|LOW"}]
}`;

    let aiResult = null;
    try {
      const aiResponse = await generateAIResponse(prompt, "gpt-4o-mini");
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("AI error:", aiError);
    }

    const amoMeeting = await prisma.bhtAmoMeeting.create({
      data: {
        bhtClientId: input.bhtClientId,
        year: input.year,
        status: "PLANNED",
        preparedIssues: JSON.stringify(bhtClient.tenant.incidents.slice(0, 10)),
        preparedRisks: JSON.stringify(bhtClient.tenant.risks.slice(0, 10)),
        aiSuggestedAgenda: aiResult?.suggestedAgenda ? JSON.stringify(aiResult.suggestedAgenda) : null,
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, meetingId: amoMeeting.id };
  } catch (error: any) {
    console.error("startBhtAmoMeeting error:", error);
    return { success: false, error: error.message || "Kunne ikke starte AMO-møte" };
  }
}

/**
 * Start BHT-vernerunde for år
 */
export async function startBhtInspection(input: {
  bhtClientId: string;
  year: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const bhtClient = await prisma.bhtClient.findUnique({
      where: { id: input.bhtClientId },
      include: {
        tenant: true,
        inspections: {
          orderBy: { year: "desc" },
          take: 1,
        },
      },
    });

    if (!bhtClient) {
      return { success: false, error: "BHT-kunde ikke funnet" };
    }

    // Generer AI-sjekkliste
    const prompt = `Du er en erfaren HMS-rådgiver som skal lage en sjekkliste for vernerunde.

Bedrift: ${bhtClient.tenant.name}
Bransje: ${bhtClient.tenant.industry || "Ikke spesifisert"}
Antall ansatte: ${bhtClient.tenant.employeeCount || "Ikke spesifisert"}

Lag en sjekkliste med 10-15 punkter som er relevante for denne bransjen.
Svar i JSON-format:
{
  "checklist": [{"item": "sjekkpunkt", "category": "kategori (ergonomi/sikkerhet/psykososialt/etc)", "description": "utdypende beskrivelse"}]
}`;

    let aiResult = null;
    try {
      const aiResponse = await generateAIResponse(prompt, "gpt-4o-mini");
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("AI error:", aiError);
    }

    const inspection = await prisma.bhtInspection.create({
      data: {
        bhtClientId: input.bhtClientId,
        year: input.year,
        status: "PLANNED",
        basedOnIndustry: bhtClient.tenant.industry,
        aiGeneratedChecklist: aiResult?.checklist ? JSON.stringify(aiResult.checklist) : null,
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, inspectionId: inspection.id };
  } catch (error: any) {
    console.error("startBhtInspection error:", error);
    return { success: false, error: error.message || "Kunne ikke starte vernerunde" };
  }
}

/**
 * Start eksponeringsvurdering
 */
export async function startBhtExposureAssessment(input: {
  bhtClientId: string;
  year: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const bhtClient = await prisma.bhtClient.findUnique({
      where: { id: input.bhtClientId },
      include: {
        tenant: {
          include: {
            chemicals: { take: 50 },
          },
        },
      },
    });

    if (!bhtClient) {
      return { success: false, error: "BHT-kunde ikke funnet" };
    }

    // Generer AI-vurdering
    const prompt = `Du er en erfaren yrkeshygieniker som skal vurdere eksponering.

Bedrift: ${bhtClient.tenant.name}
Bransje: ${bhtClient.tenant.industry || "Ikke spesifisert"}
Antall ansatte: ${bhtClient.tenant.employeeCount || "Ikke spesifisert"}

Kjemikalier i stoffkartotek: ${bhtClient.tenant.chemicals.length} stk
${bhtClient.tenant.chemicals.slice(0, 10).map(c => `- ${c.productName}`).join("\n")}

Vurder mulig eksponering og risikonivå basert på bransje og tilgjengelig informasjon.
Svar i JSON-format:
{
  "exposureAnalysis": [{"type": "eksponserigstype (kjemisk/fysisk/biologisk/ergonomisk/psykososial)", "description": "beskrivelse", "riskLevel": "LOW|MEDIUM|HIGH", "recommendation": "anbefaling"}],
  "overallRiskLevel": "LOW|MEDIUM|HIGH",
  "needsFurtherAssessment": true/false,
  "furtherAssessmentReason": "begrunnelse hvis ja"
}`;

    let aiResult = null;
    try {
      const aiResponse = await generateAIResponse(prompt, "gpt-4o-mini");
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("AI error:", aiError);
    }

    const exposure = await prisma.bhtExposureAssessment.create({
      data: {
        bhtClientId: input.bhtClientId,
        year: input.year,
        status: aiResult ? "AI_ANALYZED" : "DRAFT",
        chemicalInventory: JSON.stringify(bhtClient.tenant.chemicals.slice(0, 20)),
        aiExposureAnalysis: aiResult?.exposureAnalysis ? JSON.stringify(aiResult.exposureAnalysis) : null,
        aiRiskLevel: aiResult?.overallRiskLevel,
        aiGeneratedAt: aiResult ? new Date() : null,
        furtherActionNeeded: aiResult?.needsFurtherAssessment ?? false,
        furtherActionNotes: aiResult?.furtherAssessmentReason,
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, exposureId: exposure.id };
  } catch (error: any) {
    console.error("startBhtExposureAssessment error:", error);
    return { success: false, error: error.message || "Kunne ikke starte eksponeringsvurdering" };
  }
}

/**
 * Generer årsrapport med AI
 */
export async function generateBhtAnnualReport(input: {
  bhtClientId: string;
  year: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Hent all data for året
    const bhtClient = await prisma.bhtClient.findUnique({
      where: { id: input.bhtClientId },
      include: {
        tenant: true,
        assessments: { where: { year: input.year } },
        consultations: {
          where: {
            conductedAt: {
              gte: new Date(input.year, 0, 1),
              lt: new Date(input.year + 1, 0, 1),
            },
          },
        },
        amoMeetings: { where: { year: input.year } },
        inspections: { where: { year: input.year } },
        exposureAssessments: { where: { year: input.year } },
      },
    });

    if (!bhtClient) {
      return { success: false, error: "BHT-kunde ikke funnet" };
    }

    const assessment = bhtClient.assessments[0];
    const amoMeeting = bhtClient.amoMeetings[0];
    const inspection = bhtClient.inspections[0];
    const exposure = bhtClient.exposureAssessments[0];

    // Generer AI-rapport
    const prompt = `Du er en erfaren HMS-rådgiver som skal lage en BHT-årsrapport.

Bedrift: ${bhtClient.tenant.name}
Bransje: ${bhtClient.tenant.industry || "Ikke spesifisert"}
År: ${input.year}

Aktiviteter gjennomført:
- Kartlegging: ${assessment?.status === "COMPLETED" ? "Fullført" : "Ikke fullført"}
- Rådgivninger: ${bhtClient.consultations.length} stk
- AMO-møte: ${amoMeeting?.status === "COMPLETED" ? "Gjennomført" : "Ikke gjennomført"}
- Vernerunde: ${inspection?.status === "COMPLETED" ? "Gjennomført" : "Ikke gjennomført"}
- Eksponeringsvurdering: ${exposure?.status === "COMPLETED" ? "Fullført" : "Ikke fullført"}

${assessment?.aiSuggestedRisks ? `Identifiserte risikoer: ${assessment.aiSuggestedRisks}` : ""}
${exposure?.aiExposureAnalysis ? `Eksponeringsvurdering: ${exposure.aiExposureAnalysis}` : ""}

Lag en profesjonell årsrapport med:
1. Sammendrag av aktiviteter
2. Hovedfunn og risikoområder
3. Anbefalte tiltak for neste år
4. Plan for neste år

Svar i JSON-format:
{
  "summary": "sammenfattende tekst",
  "mainFindings": ["funn 1", "funn 2"],
  "suggestedActions": [{"action": "tiltak", "priority": "HIGH|MEDIUM|LOW", "timeline": "Q1/Q2/Q3/Q4"}],
  "nextYearPlan": [{"activity": "aktivitet", "quarter": "Q1/Q2/Q3/Q4", "responsible": "BHT/Kunde"}]
}`;

    let aiResult = null;
    try {
      const aiResponse = await generateAIResponse(prompt, "gpt-4o-mini");
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("AI error:", aiError);
    }

    // Kvalitetssjekk
    const checkAssessment = assessment?.status === "COMPLETED";
    const checkConsultations = bhtClient.consultations.length > 0;
    const checkAmoOrInspection = 
      amoMeeting?.status === "COMPLETED" || inspection?.status === "COMPLETED";
    const checkExposure = exposure?.status === "COMPLETED";

    const report = await prisma.bhtAnnualReport.create({
      data: {
        bhtClientId: input.bhtClientId,
        year: input.year,
        status: "AI_GENERATED",
        assessmentSummary: assessment ? `Kartlegging gjennomført. Status: ${assessment.status}` : null,
        consultationsSummary: `${bhtClient.consultations.length} rådgivninger gjennomført`,
        amoOrInspectionSummary: amoMeeting 
          ? `AMO-møte gjennomført. Status: ${amoMeeting.status}`
          : inspection 
            ? `Vernerunde gjennomført. Status: ${inspection.status}`
            : null,
        exposureSummary: exposure ? `Eksponeringsvurdering. Status: ${exposure.status}` : null,
        aiDraftReport: aiResult?.summary,
        aiSuggestedActions: aiResult?.suggestedActions ? JSON.stringify(aiResult.suggestedActions) : null,
        aiNextYearPlan: aiResult?.nextYearPlan ? JSON.stringify(aiResult.nextYearPlan) : null,
        aiGeneratedAt: aiResult ? new Date() : null,
        checkAssessmentDone: checkAssessment,
        checkConsultationsDone: checkConsultations,
        checkAmoOrInspectionDone: checkAmoOrInspection,
        checkExposureDone: checkExposure,
      },
    });

    revalidatePath(`/admin/bht/${input.bhtClientId}`);
    return { success: true, reportId: report.id };
  } catch (error: any) {
    console.error("generateBhtAnnualReport error:", error);
    return { success: false, error: error.message || "Kunne ikke generere årsrapport" };
  }
}

/**
 * Oppdater kartlegging-status
 */
export async function updateBhtAssessmentStatus(input: {
  assessmentId: string;
  status: "BHT_REVIEWED" | "COMPLETED";
  bhtComments?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    await prisma.bhtAssessment.update({
      where: { id: input.assessmentId },
      data: {
        status: input.status,
        bhtComments: input.bhtComments,
        bhtReviewedBy: user.id,
        bhtReviewedAt: new Date(),
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("updateBhtAssessmentStatus error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send kartlegging til kunde
 */
export async function sendAssessmentToCustomer(input: { assessmentId: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    await prisma.bhtAssessment.update({
      where: { id: input.assessmentId },
      data: {
        status: "SENT_TO_CUSTOMER",
        sentToCustomerAt: new Date(),
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("sendAssessmentToCustomer error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fullfør kartlegging
 */
export async function completeBhtAssessment(input: { assessmentId: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    await prisma.bhtAssessment.update({
      where: { id: input.assessmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("completeBhtAssessment error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Oppdater AMO-møte
 */
export async function updateBhtAmoMeeting(input: {
  meetingId: string;
  meetingDate?: Date;
  participants?: string;
  agenda?: string;
  minutes?: string;
  decisions?: string;
  status?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    await prisma.bhtAmoMeeting.update({
      where: { id: input.meetingId },
      data: {
        meetingDate: input.meetingDate,
        participants: input.participants,
        agenda: input.agenda,
        minutes: input.minutes,
        decisions: input.decisions,
        status: input.status as any,
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("updateBhtAmoMeeting error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Oppdater vernerunde
 */
export async function updateBhtInspection(input: {
  inspectionId: string;
  inspectionDate?: Date;
  participants?: string;
  findings?: string;
  improvements?: string;
  status?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    await prisma.bhtInspection.update({
      where: { id: input.inspectionId },
      data: {
        inspectionDate: input.inspectionDate,
        participants: input.participants,
        findings: input.findings,
        improvements: input.improvements,
        status: input.status as any,
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("updateBhtInspection error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Oppdater eksponeringsvurdering
 */
export async function updateBhtExposureAssessment(input: {
  exposureId: string;
  conclusion?: "SUFFICIENT" | "NEEDS_FOLLOWUP";
  assessmentNotes?: string;
  furtherActionNotes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    await prisma.bhtExposureAssessment.update({
      where: { id: input.exposureId },
      data: {
        conclusion: input.conclusion,
        assessmentNotes: input.assessmentNotes,
        furtherActionNotes: input.furtherActionNotes,
        furtherActionNeeded: input.conclusion === "NEEDS_FOLLOWUP",
        bhtReviewedBy: user?.id,
        bhtReviewedAt: new Date(),
        status: "BHT_REVIEWED",
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("updateBhtExposureAssessment error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fullfør eksponeringsvurdering
 */
export async function completeBhtExposure(input: { exposureId: string }) {
  try {
    await prisma.bhtExposureAssessment.update({
      where: { id: input.exposureId },
      data: {
        status: "COMPLETED",
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("completeBhtExposure error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Oppdater årsrapport
 */
export async function updateBhtAnnualReport(input: {
  reportId: string;
  bhtAdjustments?: string;
  status?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    await prisma.bhtAnnualReport.update({
      where: { id: input.reportId },
      data: {
        bhtAdjustments: input.bhtAdjustments,
        bhtReviewedBy: user?.id,
        bhtReviewedAt: new Date(),
        status: input.status as any,
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("updateBhtAnnualReport error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Marker ledelsens gjennomgang
 */
export async function markManagementReview(input: { reportId: string }) {
  try {
    await prisma.bhtAnnualReport.update({
      where: { id: input.reportId },
      data: {
        managementReviewedAt: new Date(),
        status: "COMPLETED",
        checkReportDone: true,
      },
    });

    revalidatePath("/admin/bht");
    return { success: true };
  } catch (error: any) {
    console.error("markManagementReview error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Bekreft at BHT har gjennomgått bedriftens tiltak
 */
export async function confirmMeasuresReviewed(input: {
  reportId: string;
  recommendation?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Oppdater årsrapport med tiltak-bekreftelse
    const report = await prisma.bhtAnnualReport.update({
      where: { id: input.reportId },
      data: {
        checkActionsDone: true,
        // Legg til anbefaling i bhtAdjustments hvis det finnes
        bhtAdjustments: input.recommendation
          ? `Tiltak-anbefaling fra BHT:\n${input.recommendation}`
          : undefined,
      },
      include: {
        bhtClient: {
          select: { id: true },
        },
      },
    });

    revalidatePath(`/admin/bht/${report.bhtClient.id}`);
    return { success: true };
  } catch (error: any) {
    console.error("confirmMeasuresReviewed error:", error);
    return { success: false, error: error.message };
  }
}

