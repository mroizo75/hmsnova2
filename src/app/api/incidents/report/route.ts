import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { AuditLog } from "@/lib/audit-log";
import { getStorage, generateFileKey } from "@/lib/storage";
import { createNotification } from "@/server/actions/notification.actions";
import { dispatchNewIncidentNotifications } from "@/lib/incident-notification-routing.server";
import { normalizeProjectReference } from "@/lib/incident-project-reference";
import { resolveIncidentProjectId } from "@/lib/incident-project-reference.server";
import {
  parseModuleVisibilityConfig,
  getNotifyRolesForModule,
} from "@/lib/module-visibility";
import { IncidentType } from "@prisma/client";

const allowedEmployeeIncidentTypes: IncidentType[] = [
  "ULYKKE",
  "NESTEN",
  "FARLIG_SITUASJON",
  "YRKESSYKDOM",
  "AVVIK",
  "HMS",
  "MILJO",
  "KVALITET",
  "CUSTOMER",
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Hent data fra FormData
    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const type = (formData.get("type") as string | null)?.trim() ?? "";
    // Alvorlighetsgrad er valgfri: null betyr at leder vurderer den ved behandling
    const severityStr = (formData.get("severity") as string | null)?.trim() || null;
    const severity = severityStr ? parseInt(severityStr, 10) : null;
    const location = (formData.get("location") as string | null)?.trim() ?? "";
    const reportedBy = session.user.id;
    const occurredAtRaw = (formData.get("occurredAt") as string | null)?.trim() ?? "";
    const date = formData.get("date") as string;
    const injuryType = formData.get("injuryType") as string | null;
    const medicalAttention = formData.get("medicalAttentionRequired") as string | null;
    const lostTime = formData.get("lostTimeMinutes") as string | null;
    const involvedPersons = formData.get("involvedPersons") as string | null;
    const witnessName = formData.get("witnessName") as string | null;
    const customerName = formData.get("customerName") as string | null;
    const customerEmail = formData.get("customerEmail") as string | null;
    const customerPhone = formData.get("customerPhone") as string | null;
    const customerTicketId = formData.get("customerTicketId") as string | null;
    const responseDeadlineRaw = (formData.get("responseDeadline") as string | null)?.trim() || null;
    const customerSatisfactionRaw =
      (formData.get("customerSatisfaction") as string | null)?.trim() || null;
    const incidentContext = formData.get("incidentContext") as string | null;
    const contextDetails = (formData.get("contextDetails") as string | null)?.trim() || null;
    const rawSubcategoryKeys = formData.get("subcategoryKeys") as string | null;
    const projectId = (formData.get("projectId") as string | null) || null;
    const projectReference = normalizeProjectReference(formData.get("projectReference"));
    const subcategoryKeys =
      rawSubcategoryKeys && rawSubcategoryKeys.trim().startsWith("[")
        ? rawSubcategoryKeys
        : null;
    const enrichedDescription = contextDetails
      ? `${description}\n\nKontekstnotat: ${contextDetails}`
      : description;
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date(date);
    const responseDeadline = responseDeadlineRaw ? new Date(responseDeadlineRaw) : null;
    const customerSatisfaction = customerSatisfactionRaw
      ? parseInt(customerSatisfactionRaw, 10)
      : null;

    if (!title || !description || !location || !type) {
      return NextResponse.json({ error: "Mangler påkrevde felt." }, { status: 400 });
    }
    if (severity !== null && (!Number.isFinite(severity) || severity < 1 || severity > 5)) {
      return NextResponse.json({ error: "Ugyldig alvorlighetsgrad." }, { status: 400 });
    }
    if (Number.isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: "Ugyldig tidspunkt for hendelsen." }, { status: 400 });
    }
    if (responseDeadline && Number.isNaN(responseDeadline.getTime())) {
      return NextResponse.json({ error: "Ugyldig svarfrist." }, { status: 400 });
    }
    if (
      customerSatisfaction !== null &&
      (!Number.isFinite(customerSatisfaction) || customerSatisfaction < 1 || customerSatisfaction > 5)
    ) {
      return NextResponse.json({ error: "Ugyldig kundetilfredshet." }, { status: 400 });
    }

    if (!allowedEmployeeIncidentTypes.includes(type as IncidentType)) {
      return NextResponse.json(
        { error: "Ugyldig hendelsestype for ansatt-rapportering." },
        { status: 400 }
      );
    }

    const avviksnummer = await generateSequenceNumber(
      tenantId,
      "AVVIK",
      occurredAt.getFullYear()
    );
    let validatedProjectId: string | null = null;
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Prosjekt ikke funnet" }, { status: 400 });
      }
      validatedProjectId = project.id;
    } else if (projectReference) {
      // Skrev melderen inn et nummer som finnes som prosjektkode eller ordrenummer,
      // kobles avviket slik at prosjektleder blir varslet
      validatedProjectId = await resolveIncidentProjectId({
        tenantId,
        projectId: null,
        projectReference,
      });
    }

    // Opprett avvik
    const incident = await prisma.incident.create({
      data: {
        tenantId,
        avviksnummer,
        title,
        description: enrichedDescription,
        type: type as any, // Prisma vil validere enum
        severity,
        location,
        occurredAt,
        reportedBy,
        status: "OPEN",
        stage: "REPORTED",
        witnessName,
        injuryType,
        medicalAttentionRequired: medicalAttention === "yes",
        lostTimeMinutes: lostTime ? parseInt(lostTime, 10) : undefined,
        immediateAction: null,
        suggestedActions: null,
        involvedPersons,
        contributingFactors: incidentContext || undefined,
        subcategoryKeys,
        projectId: validatedProjectId,
        projectReference,
        customerName,
        customerEmail,
        customerPhone,
        customerTicketId,
        responseDeadline,
        customerSatisfaction,
      },
    });

    // Håndter bildeopplasting
    const images = formData.getAll("images") as File[];
    const storage = getStorage();

    for (const image of images) {
      if (image && image.size > 0) {
        // Last opp bilde til storage
        const fileKey = generateFileKey(tenantId, "incidents", image.name);
        await storage.upload(fileKey, image);

        // Opprett Attachment-record
        await prisma.attachment.create({
          data: {
            tenantId,
            incidentId: incident.id,
            fileKey,
            name: image.name,
            mime: image.type,
            size: image.size,
          },
        });
      }
    }

    // Fire-and-forget: audit + notifikasjoner skal ikke blokkere brukeren
    const userId = session.user.id;
    void (async () => {
      try {
        await AuditLog.log(tenantId, userId, "INCIDENT_REPORTED", "Incident", incident.id, {
          title,
          type,
          severity,
          imageCount: images.filter((img) => img && img.size > 0).length,
        });
        await createNotification({
          tenantId,
          userId,
          type: "NEW_INCIDENT",
          title: "Avvik mottatt",
          message: `Takk for rapporten! Ditt avvik "${title}" er registrert og vil bli behandlet av HMS-ansvarlig.`,
          link: `/ansatt/avvik`,
        });
        const visConfig = parseModuleVisibilityConfig(
          (
            await prisma.tenant.findUnique({
              where: { id: tenantId },
              select: { moduleVisibilityConfig: true },
            })
          )?.moduleVisibilityConfig
        );
        await dispatchNewIncidentNotifications({
          tenantId,
          reporterId: userId,
          projectId: validatedProjectId,
          fallbackRoles: getNotifyRolesForModule(visConfig, "incidents", ["HMS"]),
          incidentId: incident.id,
          title,
          typeLabel: type,
        });
      } catch (bgError) {
        console.error("Background notification error:", bgError);
      }
    })();

    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error: any) {
    console.error("Report incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

