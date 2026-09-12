import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  readMicrosoftConsentResult,
  verifyMicrosoftConsentState,
} from "@/lib/microsoft-admin-consent";

/**
 * Retur-endepunkt for admin-samtykke fra Microsoft Entra ID.
 * Selve samtykket lagres hos Microsoft — her viser vi bare resultatet til admin.
 */
export async function GET(request: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const target = new URL("/dashboard/settings", baseUrl);
  target.searchParams.set("tab", "sso");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;
  const state = request.nextUrl.searchParams.get("state");

  if (!userId || !tenantId || !verifyMicrosoftConsentState(state, userId, tenantId)) {
    target.searchParams.set("consent", "failed");
    return NextResponse.redirect(target);
  }

  const result = readMicrosoftConsentResult(request.nextUrl.searchParams);
  target.searchParams.set("consent", result);

  return NextResponse.redirect(target);
}
