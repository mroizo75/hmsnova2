import { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/validations/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgNr: string }> }
) {
  try {
    const { orgNr: raw } = await params;
    const orgNr = raw.replace(/\D/g, "");

    if (orgNr.length !== 9) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        "Org.nr må ha nøyaktig 9 siffer",
        400
      );
    }

    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNr}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (res.status === 404) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        "Fant ingen bedrift med dette org.nr. i Enhetsregisteret.",
        404
      );
    }

    if (!res.ok) {
      return createErrorResponse(
        "BRREG_ERROR",
        `Brreg svarte med feil: ${res.status}`,
        502
      );
    }

    const data = await res.json();

    return createSuccessResponse({
      orgNr: data.organisasjonsnummer as string,
      navn: data.navn as string,
      adresse: [
        data.forretningsadresse?.adresse?.[0],
        data.forretningsadresse?.postnummer,
        data.forretningsadresse?.poststed,
      ]
        .filter(Boolean)
        .join(", "),
      naeringskode: (data.naeringskode1?.beskrivelse ?? null) as string | null,
      antallAnsatte: (data.antallAnsatte ?? null) as number | null,
      konkurs: (data.konkurs ?? false) as boolean,
      underAvvikling: (data.underAvvikling ?? false) as boolean,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
