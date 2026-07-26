import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { emitTavleUpdate } from "@/lib/tavle-events";
import { normalizeOrgNr } from "@/features/hms-tavle/lib/oversiktsliste-config";

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
    const { token } = await params;
    const { tavle, error } = await hentTilgjengeligTavle(token);
    if (error) return error;

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const today = new Date().toISOString().slice(0, 10);
    const checkin = await prisma.tavleCheckin.create({
      data: {
        tavleId: tavle.id,
        name: parsed.data.name,
        employer: parsed.data.employer,
        employerOrgNr: normalizeOrgNr(parsed.data.employerOrgNr),
        hmsCardNr: parsed.data.hmsCardNr,
        birthDate: parsed.data.birthDate,
        phone: parsed.data.phone,
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
