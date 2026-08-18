import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { sendEmail } from "@/lib/email";

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Ikke autentisert", 401);

    const perms = getPermissions(session.user.role);
    if (!perms.canManageHmsTavle) return createErrorResponse(ErrorCodes.FORBIDDEN, "Ingen tilgang", 403);

    const existing = await prisma.hmsTavleSubscription.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (existing) return createErrorResponse(ErrorCodes.ALREADY_EXISTS, "HMS Tavle-abonnement finnes allerede", 400);

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, orgNumber: true, contactEmail: true },
    });

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const subscription = await prisma.hmsTavleSubscription.create({
      data: {
        tenantId: session.user.tenantId,
        plan: "ADDON",
        status: "ACTIVE",
        isAddon: true,
        pricePerMonth: 290,
        startsAt: new Date(),
        endsAt: oneYearFromNow,
        autoRenew: true,
        maxTavler: 999,
      },
    });

    // Varsle HMS Nova om ny addon-aktivering
    try {
      await sendEmail({
        to: "post@hmsnova.no",
        subject: `HMS Tavle Add-on aktivert: ${tenant?.name ?? "Ukjent"}`,
        html: `<h2>HMS Tavle Add-on aktivert</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Bedrift:</td><td>${tenant?.name ?? "Ukjent"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Org.nr:</td><td>${tenant?.orgNumber ?? "–"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Plan:</td><td>HMS Nova Add-on</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Pris:</td><td>kr 290/mnd</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Aktivert av:</td><td>${session.user.name ?? session.user.email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Kontakt-e-post:</td><td>${tenant?.contactEmail ?? "–"}</td></tr>
</table>
<p style="margin-top:16px;font-size:13px;color:#666;">Faktura: kr 290/mnd legges til eksisterende HMS Nova-abonnement.</p>`,
      });
    } catch {
      // Ikke blokker aktiveringen om intern varsel feiler
    }

    return createSuccessResponse(subscription, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
