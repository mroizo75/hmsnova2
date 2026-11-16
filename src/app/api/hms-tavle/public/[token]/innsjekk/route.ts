import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { emitTavleUpdate } from "@/lib/tavle-events";
import { normalizeOrgNr } from "@/features/hms-tavle/lib/oversiktsliste-config";
import { isClearlyOutside, type SiteGeofence } from "@/features/hms-tavle/lib/geofence";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";

/**
 * Innsjekk og utsjekk til oversiktslisten – Byggherreforskriften § 15.
 * Feltene speiler bokstav c–e: arbeidsgiver, organisasjonsnummer, navn,
 * fødselsdato og HMS-kortnummer.
 */
const checkinSchema = z.object({
  name: z.string().min(2, "Navn er påkrevd"),
  employer: z.string().optional(),
  employerOrgNr: z.string().optional(),
  hmsCardNr: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  accuracy: z.number().min(0).max(10_000).optional(),
});

const checkoutSchema = z.object({
  checkinId: z.string().min(1, "Innsjekk-ID er påkrevd"),
});

/** Felles tilgangskontroll: tavlen må være offentlig og abonnementet aktivt. */
async function hentTilgjengeligTavle(token: string) {
  const tavle = await prisma.hmsTavle.findUnique({ where: { publicToken: token } });
  if (!tavle || !tavle.isPublic) {
    return { error: createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404) };
  }

  const subscription = await prisma.hmsTavleSubscription.findUnique({
    where: { tenantId: tavle.tenantId },
  });

  if (!subscription || subscription.status === "EXPIRED") {
    return {
      error: createErrorResponse("SUBSCRIPTION_EXPIRED", "Tavle-abonnementet er utløpt", 402),
    };
  }

  if (subscription.plan === "ENKEL") {
    return {
      error: createErrorResponse(
        ErrorCodes.FORBIDDEN,
        "QR-innsjekk krever Standard- eller høyere plan",
        403
      ),
    };
  }

  return { tavle };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const rateLimit = await checkRateLimitPolicy({
      policy: "publicForm",
      scope: "hms-tavle-checkin",
      identifiers: [getClientIp(req)],
      failClosed: true,
    });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const { token } = await params;
    const { tavle, error } = await hentTilgjengeligTavle(token);
    if (error) return error;

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const site: SiteGeofence | null =
      tavle.geofenceRadiusMeters != null && tavle.siteLatitude != null && tavle.siteLongitude != null
        ? {
            latitude: tavle.siteLatitude,
            longitude: tavle.siteLongitude,
            radiusMeters: tavle.geofenceRadiusMeters,
          }
        : null;

    if (site) {
      if (parsed.data.latitude == null || parsed.data.longitude == null) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "Innsjekk krever at du er innenfor prosjektområdet",
          400
        );
      }
      const utenfor = isClearlyOutside(
        { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
        parsed.data.accuracy ?? 0,
        site
      );
      if (utenfor) {
        return createErrorResponse(
          ErrorCodes.FORBIDDEN,
          "Du er utenfor prosjektområdet og kan ikke sjekke inn",
          403
        );
      }
    }

    const session = await getServerSession(authOptions);
    let userId: string | undefined;
    let employer = parsed.data.employer;
    let employerOrgNr = parsed.data.employerOrgNr;
    let hmsCardNr = parsed.data.hmsCardNr;
    let birthDate = parsed.data.birthDate;
    let phone = parsed.data.phone;

    if (session?.user?.id && session.user.tenantId === tavle.tenantId) {
      userId = session.user.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, phone: true },
      });
      if (!phone && dbUser?.phone) phone = dbUser.phone;
      if (tavle.projectId && dbUser?.name) {
        const roster = await prisma.constructionRosterEntry.findFirst({
          where: {
            tenantId: tavle.tenantId,
            projectId: tavle.projectId,
            isActive: true,
            fullName: dbUser.name,
          },
          select: {
            employerName: true,
            employerOrgNumber: true,
            hmsCardNumber: true,
            birthDate: true,
          },
        });
        if (roster) {
          employer = employer || roster.employerName;
          employerOrgNr = employerOrgNr || roster.employerOrgNumber || undefined;
          hmsCardNr = hmsCardNr || roster.hmsCardNumber || undefined;
          birthDate = birthDate || roster.birthDate.toISOString().slice(0, 10);
        }
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const apen = await prisma.tavleCheckin.findFirst({
      where: {
        tavleId: tavle.id,
        date: today,
        checkedOutAt: null,
        OR: [...(userId ? [{ userId }] : []), { name: parsed.data.name.trim() }],
      },
    });
    if (apen) {
      return createSuccessResponse({ checkin: apen, alreadyCheckedIn: true });
    }

    const checkin = await prisma.tavleCheckin.create({
      data: {
        tavleId: tavle.id,
        name: parsed.data.name.trim(),
        employer,
        employerOrgNr: normalizeOrgNr(employerOrgNr),
        hmsCardNr,
        birthDate,
        phone,
        userId,
        date: today,
      },
    });

    emitTavleUpdate(token);

    return createSuccessResponse({ checkin }, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Utsjekk. § 15 krever at listen kontrolleres og oppdateres daglig, slik at den
 * viser hvem som faktisk er på plassen. Kun dagens egen innsjekk kan lukkes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const rateLimit = await checkRateLimitPolicy({
      policy: "publicForm",
      scope: "hms-tavle-checkout",
      identifiers: [getClientIp(req)],
      failClosed: true,
    });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const { token } = await params;
    const { tavle, error } = await hentTilgjengeligTavle(token);
    if (error) return error;

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const today = new Date().toISOString().slice(0, 10);
    const eksisterende = await prisma.tavleCheckin.findFirst({
      where: { id: parsed.data.checkinId, tavleId: tavle.id, date: today },
      select: { id: true, checkedOutAt: true },
    });

    if (!eksisterende) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Fant ingen innsjekk for i dag", 404);
    }

    if (eksisterende.checkedOutAt) {
      return createSuccessResponse({ alreadyCheckedOut: true });
    }

    const checkin = await prisma.tavleCheckin.update({
      where: { id: eksisterende.id },
      data: { checkedOutAt: new Date() },
    });

    emitTavleUpdate(token);

    return createSuccessResponse({ checkin });
  } catch (error) {
    return handleApiError(error);
  }
}
