import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp, apiRateLimiter } from "@/lib/rate-limit";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";

/**
 * GET /api/hms-tavle/public/sak/[trackingToken]
 *
 * Privat statussporing for gjesten. Returnerer KUN den saken tokenet peker på,
 * og kun felter gjesten selv har rett til å se.
 *
 * Interne notater, tildelt ansvarlig, kontaktopplysninger og andre saker
 * eksponeres aldri. Det finnes med vilje ingen listing-variant av dette
 * endepunktet – GDPR art. 5 (dataminimering).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingToken: string }> }
) {
  try {
    const { trackingToken } = await params;

    const rateLimit = await apiRateLimiter.limit(`tavle-sak:${getClientIp(req)}`);
    if (!rateLimit.success) {
      return createErrorResponse("RATE_LIMITED", "For mange forespørsler. Prøv igjen snart.", 429);
    }

    const submission = await prisma.tavleGuestSubmission.findUnique({
      where: { trackingToken },
      select: {
        type: true,
        status: true,
        locale: true,
        createdAt: true,
        acknowledgedAt: true,
        respondedAt: true,
        closedAt: true,
        response: true,
        tavle: { select: { name: true, logoUrl: true, brandColor: true } },
      },
    });

    if (!submission) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Saken ble ikke funnet", 404);
    }

    return createSuccessResponse({
      type: submission.type,
      status: submission.status,
      locale: submission.locale,
      createdAt: submission.createdAt,
      acknowledgedAt: submission.acknowledgedAt,
      respondedAt: submission.respondedAt,
      closedAt: submission.closedAt,
      response: submission.response,
      tavleName: submission.tavle.name,
      logoUrl: submission.tavle.logoUrl,
      brandColor: submission.tavle.brandColor,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
