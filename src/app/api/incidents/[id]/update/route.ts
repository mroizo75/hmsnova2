import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IncidentStage, IncidentStatus, IncidentType } from "@prisma/client";
import { createNotification, notifyUsersByRoles } from "@/server/actions/notification.actions";
import { normalizeProjectReference } from "@/lib/incident-project-reference";

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function parseNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseNullableText(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim() || null;
}

function parseIncidentType(value: unknown): IncidentType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  const validTypes = new Set<IncidentType>([
    "ULYKKE",
    "NESTEN",
    "FARLIG_SITUASJON",
    "YRKESSYKDOM",
    "AVVIK",
    "MILJO",
    "KVALITET",
    "CUSTOMER",
    "HMS",
    "SKADE",
  ]);

  return validTypes.has(normalized as IncidentType)
    ? (normalized as IncidentType)
    : undefined;
}

function parseProjectId(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen virksomhetstilgang." }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;
    const responsibleId =
      typeof body.responsibleId === "string" && body.responsibleId.trim().length > 0
        ? body.responsibleId.trim()
        : null;
    // Alvorlighetsgrad kan settes tilbake til «ikke vurdert» ved å sende null
    const severity = parseNullableNumber(body.severity);
    if (severity !== null && severity !== undefined && (severity < 1 || severity > 5)) {
      return NextResponse.json({ error: "Ugyldig alvorlighetsgrad." }, { status: 400 });
    }
    const type = parseIncidentType(body.type);
    const projectId = parseProjectId(body.projectId);
    const projectReference =
      body.projectReference === undefined
        ? undefined
        : normalizeProjectReference(body.projectReference);
    const subcategoryKeys = Array.isArray(body.subcategoryKeys)
      ? body.subcategoryKeys.filter((value: unknown): value is string => typeof value === "string")
      : undefined;
    if (body.type !== undefined && type === undefined) {
      return NextResponse.json({ error: "Ugyldig hendelsestype." }, { status: 400 });
    }
    if (body.projectId !== undefined && projectId === undefined) {
      return NextResponse.json({ error: "Ugyldig prosjekt." }, { status: 400 });
    }
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId, tenantId: session.user.tenantId! },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Prosjektet finnes ikke i denne virksomheten." }, { status: 400 });
      }
    }
    if (responsibleId) {
      const membership = await prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId: responsibleId, tenantId } },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Ansvarlig finnes ikke i denne virksomheten." },
          { status: 400 }
        );
      }
    }
    const source = typeof body.source === "string" && ["INTERNAL", "EXTERNAL"].includes(body.source)
      ? body.source
      : undefined;
    const medicalAttentionRequired = parseBoolean(body.medicalAttentionRequired);
    const isFatal = parseBoolean(body.isFatal);
    const isLostTimeIncident = parseBoolean(body.isLostTimeIncident);
    const isRestrictedWork = parseBoolean(body.isRestrictedWork);
    const lostWorkdays = parseNullableNumber(body.lostWorkdays);
    const isFirstAidCase = parseBoolean(body.isFirstAidCase);
    const isProductionStop = parseBoolean(body.isProductionStop);
    const productionStopHours = parseNullableNumber(body.productionStopHours);
    const isPropertyDamage = parseBoolean(body.isPropertyDamage);
    const estimatedDamageCost = parseNullableNumber(body.estimatedDamageCost);
    const isEnvironmentalRelease = parseBoolean(body.isEnvironmentalRelease);
    const environmentalDescription =
      typeof body.environmentalDescription === "string"
        ? body.environmentalDescription.trim() || null
        : undefined;
    // Personinvolvering og skadeomfang er som regel ukjent ved melding og
    // registreres under behandlingen (AML § 5-1)
    const involvedPersons = parseNullableText(body.involvedPersons);
    const injuryType = parseNullableText(body.injuryType);
    const injuryDescription = parseNullableText(body.injuryDescription);
    const suggestedActions = parseNullableText(body.suggestedActions);

    const requiresHseCompletion = status && status !== "OPEN";
    if (requiresHseCompletion) {
      if (
        medicalAttentionRequired === undefined ||
        isFatal === undefined ||
        isLostTimeIncident === undefined ||
        isRestrictedWork === undefined
      ) {
        return NextResponse.json(
          { error: "Alle HSE-felter ma fylles ut ved behandling av avvik." },
          { status: 400 }
        );
      }
      if (isLostTimeIncident && (lostWorkdays === null || lostWorkdays === undefined)) {
        return NextResponse.json(
          { error: "Fravaersdager ma fylles ut naar fravaersskade er valgt." },
          { status: 400 }
        );
      }
    }

    const stageMap: Record<IncidentStatus, IncidentStage> = {
      OPEN: "REPORTED",
      INVESTIGATING: "UNDER_REVIEW",
      ACTION_TAKEN: "ACTIONS_DEFINED",
      CLOSED: "VERIFIED",
    };

    const existingIncident = await prisma.incident.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        title: true,
        type: true,
        severity: true,
        isRestrictedWork: true,
        responsibleId: true,
        avviksnummer: true,
      },
    });

    if (!existingIncident) {
      return NextResponse.json({ error: "Avviket ble ikke funnet." }, { status: 404 });
    }

    const incident = await prisma.incident.update({
      where: { id, tenantId },
      data: {
        type: type ?? undefined,
        subcategoryKeys:
          subcategoryKeys === undefined
            ? undefined
            : subcategoryKeys.length > 0
              ? JSON.stringify(subcategoryKeys)
              : null,
        projectId: projectId === undefined ? undefined : projectId,
        projectReference,
        status,
        severity,
        responsibleId,
        stage: stageMap[status as IncidentStatus] || "REPORTED",
        medicalAttentionRequired:
          medicalAttentionRequired === undefined ? undefined : medicalAttentionRequired,
        isFatal: isFatal === undefined ? undefined : isFatal,
        isLostTimeIncident: isLostTimeIncident === undefined ? undefined : isLostTimeIncident,
        isRestrictedWork: isRestrictedWork === undefined ? undefined : isRestrictedWork,
        lostWorkdays:
          lostWorkdays === undefined
            ? undefined
            : isLostTimeIncident
              ? lostWorkdays
              : null,
        isFirstAidCase: isFirstAidCase === undefined ? undefined : isFirstAidCase,
        isProductionStop: isProductionStop === undefined ? undefined : isProductionStop,
        productionStopHours:
          productionStopHours === undefined
            ? undefined
            : isProductionStop
              ? productionStopHours
              : null,
        isPropertyDamage: isPropertyDamage === undefined ? undefined : isPropertyDamage,
        estimatedDamageCost:
          estimatedDamageCost === undefined
            ? undefined
            : isPropertyDamage
              ? estimatedDamageCost
              : null,
        isEnvironmentalRelease: isEnvironmentalRelease === undefined ? undefined : isEnvironmentalRelease,
        environmentalDescription:
          environmentalDescription === undefined
            ? undefined
            : isEnvironmentalRelease
              ? environmentalDescription
              : null,
        involvedPersons,
        injuryType,
        injuryDescription,
        suggestedActions,
        source: source ?? undefined,
      },
    });

    revalidatePath(`/dashboard/incidents/${id}`);
    revalidatePath("/dashboard/incidents");

    // IK-HMS § 5 nr. 7: den som får avviket til behandling må få beskjed om det
    if (incident.responsibleId && incident.responsibleId !== existingIncident.responsibleId) {
      await createNotification({
        tenantId,
        userId: incident.responsibleId,
        type: "NEW_INCIDENT",
        title: "Avvik tildelt deg",
        message: `${incident.avviksnummer ?? incident.type}: ${incident.title} er sendt til deg for behandling.`,
        link: `/dashboard/incidents/${incident.id}`,
      });
    }

    const becameStopWork =
      existingIncident.isRestrictedWork !== true && incident.isRestrictedWork === true;
    if (becameStopWork || (incident.severity ?? 0) >= 5) {
      await notifyUsersByRoles(tenantId, ["ADMIN", "HMS"], {
        type: "NEW_INCIDENT",
        title: "KRITISK: Stoppet arbeid",
        message: `${incident.type}: ${incident.title} - stoppet arbeid krever umiddelbar oppfolging.`,
        link: `/dashboard/incidents/${incident.id}`,
      });
    }

    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    console.error("Update incident error:", error);
    const message =
      error?.code === "P2025"
        ? "Avviket ble ikke funnet. Sjekk at du har tilgang."
        : error.message || "Intern feil ved oppdatering av avvik.";
    return NextResponse.json({ error: message }, { status: error?.code === "P2025" ? 404 : 500 });
  }
}
