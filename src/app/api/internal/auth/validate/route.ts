import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateInternalRequest } from "@/lib/internal-auth";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(1, "Passord er påkrevd"),
});

/**
 * POST /api/internal/auth/validate
 *
 * Validerer påloggingsopplysninger for en bruker og bekrefter at vedkommende
 * tilhører en bedrift med aktiv Bransjekurs.no-kursavtale.
 *
 * Kun tilgjengelig for interne server-til-server-kall (INTERNAL_API_SECRET).
 *
 * Request body:
 *   { email: string; password: string }
 *
 * Response (200):
 *   { valid: true; userId: string; tenantId: string; name: string; email: string }
 *
 * Response (feil):
 *   { code: string; message: string }
 */
export async function POST(request: NextRequest) {
  const unauthorized = validateInternalRequest(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "Ugyldig JSON i forespørselen" },
      { status: 400 },
    );
  }

  let validated: z.infer<typeof requestSchema>;
  try {
    validated = requestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Ugyldig input" },
        { status: 400 },
      );
    }
    throw error;
  }

  const normalizedEmail = validated.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      lockedUntil: true,
      tenants: {
        select: {
          tenantId: true,
          role: true,
          tenant: {
            select: {
              id: true,
              status: true,
              bransjekursEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.password) {
    return NextResponse.json(
      { code: "INVALID_CREDENTIALS", message: "Ugyldig e-post eller passord" },
      { status: 401 },
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      {
        code: "ACCOUNT_LOCKED",
        message: `Kontoen er midlertidig låst. Prøv igjen om ${minutesLeft} minutter.`,
      },
      { status: 401 },
    );
  }

  const isPasswordValid = await bcrypt.compare(validated.password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json(
      { code: "INVALID_CREDENTIALS", message: "Ugyldig e-post eller passord" },
      { status: 401 },
    );
  }

  // Finn første tenant med aktiv kursavtale
  const kursavtaleMembership = user.tenants.find(
    (membership) =>
      membership.tenant.bransjekursEnabled &&
      (membership.tenant.status === "ACTIVE" || membership.tenant.status === "TRIAL"),
  );

  if (!kursavtaleMembership) {
    return NextResponse.json(
      {
        code: "NO_KURSAVTALE",
        message:
          "Brukeren tilhører ikke en bedrift med aktiv kursavtale via HMS Nova.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    valid: true,
    userId: user.id,
    tenantId: kursavtaleMembership.tenantId,
    name: user.name ?? normalizedEmail,
    email: user.email,
  });
}
