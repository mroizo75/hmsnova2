import { z } from "zod";

export const HazardousWasteTypeSchema = z.enum([
  "KJOLEVAESKE",
  "SPILLOLJE",
  "OLJEFILTER",
  "BREMSEVAESKE",
  "BATTERI",
  "SPRAYBOKS",
  "MALING_LOSEMIDDEL",
  "ANNET",
]);

export const CreateHazardousWasteDeliverySchema = z
  .object({
    wasteType: HazardousWasteTypeSchema,
    customType: z.string().trim().max(120).optional().nullable(),
    amountKg: z.coerce.number().positive("Mengde må være større enn 0"),
    deliveredAt: z.coerce.date(),
    declarationNumber: z.string().trim().min(1, "Deklarasjonsnummer er påkrevd").max(80),
    recipient: z.string().trim().min(1, "Mottaker er påkrevd").max(160),
    aspectId: z.string().trim().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.wasteType === "ANNET" && !data.customType?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customType"],
        message: "Oppgi hva slags avfall som er levert",
      });
    }
  });
