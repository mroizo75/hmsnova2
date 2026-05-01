import { NextRequest, NextResponse } from "next/server";

/**
 * Sjekker at forespørselen bærer riktig INTERNAL_API_SECRET.
 * Brukes for server-til-server-kall mellom HMS Nova og Bransjekurs.no.
 *
 * Header som forventes:
 *   Authorization: Bearer <INTERNAL_API_SECRET>
 */
export function validateInternalRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    return NextResponse.json(
      { code: "MISCONFIGURED", message: "Intern integrasjon er ikke konfigurert" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Ugyldig eller manglende autorisasjonstoken" },
      { status: 401 },
    );
  }

  return null;
}
