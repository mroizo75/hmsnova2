import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readMicrosoftConsentResult } from "@/lib/microsoft-admin-consent";

/**
 * Retur-endepunkt for admin-samtykke fra Microsoft Entra ID.
 * Selve samtykket lagres hos Microsoft — her viser vi bare resultatet til admin.
 */
export async function GET(request: NextRequest) {
  const result = readMicrosoftConsentResult(request.nextUrl.searchParams);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const target = new URL("/dashboard/settings", baseUrl);
  target.searchParams.set("consent", result);

  return NextResponse.redirect(target);
}
