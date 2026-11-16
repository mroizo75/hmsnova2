import { NextResponse } from "next/server";

/**
 * Kurs bestilles hos KKS AS. Endepunktet tar ikke lenger imot bestilling
 * med HMS Nova-priser eller medlemsrabatt.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Kurs bestilles hos KKS AS. HMS Nova tar ikke imot kursbestilling.",
      url: "https://www.kksas.no/kurs",
    },
    { status: 410 }
  );
}
