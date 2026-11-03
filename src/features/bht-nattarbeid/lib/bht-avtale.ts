import { z } from "zod";

function blankToNull(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

const optionalString = (max: number) =>
  z.preprocess(blankToNull, z.string().max(max).nullable().optional());

export const bhtAvtaleSchema = z.object({
  leverandorNavn: z.string().trim().min(2).max(200),
  leverandorOrgnr: optionalString(20),
  kontaktperson: optionalString(100),
  kontaktTelefon: optionalString(30),
  kontaktEpost: z.preprocess(
    blankToNull,
    z.string().email("Ugyldig e-post").nullable().optional(),
  ),
  startDato: z.string().datetime(),
  sluttDato: z.preprocess(blankToNull, z.string().datetime().nullable().optional()),
  arsTimeverk: z.number().int().min(1).nullable().optional(),
  naringskode: optionalString(20),
  bransjeKrav: optionalString(500),
  avtaleUrl: z.preprocess(blankToNull, z.string().url().nullable().optional()),
  notat: optionalString(2000),
});
