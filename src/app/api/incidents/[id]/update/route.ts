import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IncidentStage, IncidentStatus, IncidentType } from "@prisma/client";

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
    const { status, severity, responsibleId } = body;
    const type = parseIncidentType(body.type);
    const projectId = parseProjectId(body.projectId);
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
    const medicalAttentionRequired = parseBoolean(body.medicalAttentionRequired);
    const isFatal = parseBoolean(body.isFatal);
    const isLostTimeIncident = parseBoolean(body.isLostTimeIncident);
    const isRestrictedWork = parseBoolean(body.isRestrictedWork);
    const lostWorkdays = parseNullableNumber(body.lostWorkdays);

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
        status,
        severity,
        responsibleId: responsibleId || null,
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
      },
    });

    revalidatePath(`/dashboard/incidents/${id}`);
    revalidatePath("/dashboard/incidents");
    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    console.error("Update incident error:", error);
    const message =
      error?.code === "P2025"
        ? "Avviket ble ikke funnet. Sjekk at du har tilgang."
        : error.message || "Intern feil ved oppdatering av avvik.";
    return NextResponse.json({ error: message }, { status: error?.code === "P2025" ? 404 : 500 });
}

