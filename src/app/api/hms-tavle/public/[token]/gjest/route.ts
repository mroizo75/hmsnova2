import { NextRequest } from "next/server";
import { z } from "zod";
import { GuestSubmissionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIp, strictRateLimiter } from "@/lib/rate-limit";
import { generateFileKey, getStorage } from "@/lib/storage";
import { validateImageFile, validateFileSize } from "@/lib/file-validation";
import { emitTavleUpdate } from "@/lib/tavle-events";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";
import {
  calculateSlaDueAt,
  derivePriority,
  MAX_GUEST_ATTACHMENTS,
  MAX_GUEST_ATTACHMENT_MB,
  normalizeGuestLocale,
  parseGjesteserviceConfig,
  type GuestAttachment,
} from "@/features/hms-tavle/lib/gjesteservice-config";
import {
  buildGuestStatusUrl,
  notifyNewGuestSubmission,
  sendGuestReceiptEmail,
} from "@/features/hms-tavle/lib/gjesteservice-notify";

const schema = z.object({
  type: z.nativeEnum(GuestSubmissionType),
  message: z.string().min(5, "Meldingen er for kort").max(2000),
  guestName: z.string().max(100).optional().nullable(),
  guestEmail: z.string().email("Ugyldig e-postadresse").max(200).optional().nullable(),
  guestPhone: z.string().max(30).optional().nullable(),
  roomOrTable: z.string().max(50).optional().nullable(),
  locale: z.enum(["nb", "en"]).optional(),
  consentContact: z.boolean().optional(),
});

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Leser både JSON og multipart slik at eldre klienter fortsatt fungerer. */
async function readPayload(req: NextRequest): Promise<{ body: unknown; images: File[] }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return { body: await req.json(), images: [] };
  }

  const formData = await req.formData();
  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  return {
    body: {
      type: emptyToNull(formData.get("type")),
      message: emptyToNull(formData.get("message")) ?? "",
      guestName: emptyToNull(formData.get("guestName")),
      guestEmail: emptyToNull(formData.get("guestEmail")),
      guestPhone: emptyToNull(formData.get("guestPhone")),
      roomOrTable: emptyToNull(formData.get("roomOrTable")),
      locale: emptyToNull(formData.get("locale")) ?? undefined,
      consentContact: formData.get("consentContact") === "true",
    },
    images: images.slice(0, MAX_GUEST_ATTACHMENTS),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const ip = getClientIp(req);
    const rateLimit = await strictRateLimiter.limit(`tavle-gjest:${ip}`);
    if (!rateLimit.success) {
      return createErrorResponse(
        "RATE_LIMITED",
        "For mange innsendinger. Vent litt før du sender en ny melding.",
        429
      );
    }

    const tavle = await prisma.hmsTavle.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        isPublic: true,
        tenantId: true,
        name: true,
        sections: { where: { type: "GJEST_SKJEMA" }, select: { config: true }, take: 1 },
      },
    });

    if (!tavle) return createErrorResponse(ErrorCodes.NOT_FOUND, "Tavle ikke funnet", 404);
    if (!tavle.isPublic) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, "Tavle er ikke offentlig tilgjengelig", 403);
    }

    const subscription = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: tavle.tenantId },
    });
    if (!subscription || subscription.status === "EXPIRED") {
      return createErrorResponse("SUBSCRIPTION_EXPIRED", "Tavle-abonnementet er utløpt", 402);
    }

    const { body, images } = await readPayload(req);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);
    }

    const config = parseGjesteserviceConfig(tavle.sections[0]?.config);
    if (!config.activeTypes.includes(parsed.data.type)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Denne meldingstypen er ikke aktiv for denne tavlen",
        400
      );
    }

    const attachments: GuestAttachment[] = [];
    if (config.allowAttachments && images.length > 0) {
      const storage = getStorage();

      for (const image of images) {
        const sizeCheck = validateFileSize(image.size, MAX_GUEST_ATTACHMENT_MB);
        if (!sizeCheck.isValid) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, sizeCheck.error!, 400);
        }

        const buffer = Buffer.from(await image.arrayBuffer());
        const typeCheck = await validateImageFile(buffer);
        if (!typeCheck.isValid) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, typeCheck.error!, 400);
        }

        const key = generateFileKey(tavle.tenantId, "tavle-gjest", image.name);
        await storage.upload(key, buffer);
        attachments.push({ key, name: image.name, size: image.size });
      }
    }

    const locale = normalizeGuestLocale(parsed.data.locale);
    const priority = derivePriority(parsed.data.type);
    const slaDueAt = calculateSlaDueAt(priority, config);

    const submission = await prisma.tavleGuestSubmission.create({
      data: {
        tavleId: tavle.id,
        type: parsed.data.type,
        message: parsed.data.message,
        guestName: parsed.data.guestName ?? null,
        guestEmail: parsed.data.guestEmail ?? null,
        guestPhone: parsed.data.guestPhone ?? null,
        roomOrTable: parsed.data.roomOrTable ?? null,
        status: "NY",
        locale,
        priority,
        slaDueAt,
        consentContact: parsed.data.consentContact === true,
        attachments:
          attachments.length > 0 ? (attachments as unknown as Prisma.InputJsonValue) : undefined,
      },
      select: { id: true, trackingToken: true, guestEmail: true, consentContact: true },
    });

    // Varsling og kvittering skal ikke blokkere gjestens kvitteringsskjerm
    await Promise.allSettled([
      notifyNewGuestSubmission({
        tenantId: tavle.tenantId,
        tavleId: tavle.id,
        tavleName: tavle.name,
        type: parsed.data.type,
        priority,
        message: parsed.data.message,
        roomOrTable: parsed.data.roomOrTable ?? null,
        slaDueAt,
        config,
      }),
      submission.guestEmail && submission.consentContact
        ? sendGuestReceiptEmail({
            to: submission.guestEmail,
            locale,
            tenantName: tavle.name,
            trackingToken: submission.trackingToken,
          })
        : Promise.resolve(),
    ]);

    emitTavleUpdate(token);

    return createSuccessResponse(
      {
        id: submission.id,
        trackingToken: submission.trackingToken,
        statusUrl: buildGuestStatusUrl(submission.trackingToken),
      },
      undefined,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
