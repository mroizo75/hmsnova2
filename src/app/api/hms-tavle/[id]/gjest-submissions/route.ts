import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { AuditLog } from "@/lib/audit-log";
import { getClientIp } from "@/lib/rate-limit";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";
import { normalizeGuestLocale } from "@/features/hms-tavle/lib/gjesteservice-config";
import { sendGuestResolvedEmail } from "@/features/hms-tavle/lib/gjesteservice-notify";

const patchSchema = z.object({
  status: z.enum(["NY", "LEST", "BEHANDLET", "LUKKET"]).optional(),
  response: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(4000).optional().nullable(),
  assignedToId: z.string().max(64).optional().nullable(),
});

/** Statuser der gjesten skal få vite hva som ble gjort */
const RESPONSE_REQUIRED_STATUSES = new Set(["BEHANDLET", "LUKKET"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const { id } = await params;
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);

    const status = new URL(req.url).searchParams.get("status");

    const submissions = await prisma.tavleGuestSubmission.findMany({
      where: {
        tavleId: id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ submissions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);
    }

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);
    }

    const { id } = await params;
    const submissionId = new URL(req.url).searchParams.get("submissionId");
    if (!submissionId) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "submissionId mangler", 400);
    }

    const submission = await prisma.tavleGuestSubmission.findFirst({
      where: { id: submissionId, tavleId: id },
      include: { tavle: { select: { tenantId: true, name: true } } },
    });
    if (!submission || submission.tavle.tenantId !== session.user.tenantId) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Innmelding ikke funnet", 404);
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    }

    const nyStatus = parsed.data.status ?? submission.status;
    const nyResponse =
      parsed.data.response !== undefined ? parsed.data.response : submission.response;

    // Gjesten skal alltid få vite hva som ble gjort før saken avsluttes
    if (RESPONSE_REQUIRED_STATUSES.has(nyStatus) && !nyResponse?.trim()) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Fyll inn «Hva ble gjort» før saken settes til behandlet eller ferdig",
        400
      );
    }

    if (parsed.data.assignedToId) {
      const medlem = await prisma.userTenant.findFirst({
        where: { userId: parsed.data.assignedToId, tenantId: session.user.tenantId },
        select: { userId: true },
      });
      if (!medlem) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Ukjent ansvarlig", 400);
      }
    }

    const now = new Date();
    const responseEndret =
      parsed.data.response !== undefined && parsed.data.response !== submission.response;

    const updated = await prisma.tavleGuestSubmission.update({
      where: { id: submissionId },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: parsed.data.internalNotes }
          : {}),
        ...(parsed.data.assignedToId !== undefined
          ? { assignedToId: parsed.data.assignedToId }
          : {}),
        ...(responseEndret
          ? {
              response: parsed.data.response,
              respondedAt: parsed.data.response?.trim() ? now : null,
            }
          : {}),
        ...(nyStatus !== "NY" && !submission.acknowledgedAt ? { acknowledgedAt: now } : {}),
        ...(nyStatus === "LUKKET" && !submission.closedAt ? { closedAt: now } : {}),
      },
    });

    await AuditLog.log(
      session.user.tenantId,
      session.user.id,
      "TAVLE_GUEST_SUBMISSION_UPDATED",
      "TavleGuestSubmission",
      submissionId,
      {
        fraStatus: submission.status,
        tilStatus: nyStatus,
        svarOppdatert: responseEndret,
        ansvarligEndret: parsed.data.assignedToId !== undefined,
      },
      getClientIp(req),
      req.headers.get("user-agent") ?? undefined
    );

    // Lukket sløyfe mot gjesten – kun når samtykke er gitt (GDPR art. 6)
    if (
      responseEndret &&
      updated.response?.trim() &&
      submission.guestEmail &&
      submission.consentContact
    ) {
      try {
        await sendGuestResolvedEmail({
          to: submission.guestEmail,
          locale: normalizeGuestLocale(submission.locale),
          tenantName: submission.tavle.name,
          trackingToken: submission.trackingToken,
          response: updated.response,
        });
      } catch (error) {
        console.error("[gjesteservice] Kunne ikke sende svar til gjest:", error);
      }
    }

    return createSuccessResponse({ updated });
  } catch (error) {
    return handleApiError(error);
  }
}
