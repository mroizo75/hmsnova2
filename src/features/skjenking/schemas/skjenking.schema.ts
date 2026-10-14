import { z } from "zod";
import { containsGuestIdentity } from "@/features/skjenking/lib/internkontroll";

const optionalText = (max: number) => z.string().max(max).nullable().optional();
const optionalDate = z.string().datetime().nullable().optional();

export const skjenkeBevillingSchema = z.object({
  bevillingstype: z.enum(["SKJENKING", "SALG", "BEGGE"]).default("SKJENKING"),
  ambulerende: z.boolean().default(false),
  bevillingsnummer: optionalText(100),
  kommune: optionalText(100),
  gyldigFra: optionalDate,
  gyldigTil: optionalDate,
  gruppe1: z.boolean().default(true),
  gruppe2: z.boolean().default(true),
  gruppe3: z.boolean().default(false),
  styrer: optionalText(200),
  stedfortreder: optionalText(200),
  styrerProveDato: optionalDate,
  stedfortrederProveDato: optionalDate,
  skjenketider: optionalText(4000),
  internregler: optionalText(8000),
  alderskontrollAnsvar: optionalText(200),
  beruselseAnsvar: optionalText(200),
  bortvisningAnsvar: optionalText(200),
  opplaeringAnsvar: optionalText(200),
  alkoholfrittUtvalg: optionalText(4000),
  harHalvflasker: z.boolean().default(false),
  harMinibar: z.boolean().default(false),
  sarvilkar: optionalText(4000),
  sistOmsetningsoppgave: optionalDate,
});

export const skjenkeHendelseSchema = z
  .object({
    occurredAt: z.string().datetime(),
    type: z.enum(["ALDERSKONTROLL", "BERUSELSE", "BORTVISNING", "AVVIK", "ANNET"]),
    action: z.enum(["AVSLATT", "SERVERING_STOPPET", "BORTVIST", "ADVARSEL", "ANNET"]),
    beruselsesgrad: z.enum(["NORMAL", "PA_VEI", "APENBART_PAVIRKET"]).nullable().optional(),
    registeredBy: z.string().max(100).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
    korrigerendeTiltak: z.string().max(4000).nullable().optional(),
    forebygging: z.string().max(4000).nullable().optional(),
    status: z.enum(["APEN", "LUKKET"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.note && containsGuestIdentity(value.note)) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Notatet kan ikke inneholde fødselsnummer eller legitimasjonsnummer.",
      });
    }
    const status = value.status ?? (value.type === "AVVIK" ? "APEN" : "LUKKET");
    if (status === "LUKKET" && value.type === "AVVIK" && !value.korrigerendeTiltak?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["korrigerendeTiltak"],
        message: "Et lukket avvik må ha korrigerende tiltak.",
      });
    }
  });

export const skjenkeHendelsePatchSchema = z
  .object({
    korrigerendeTiltak: z.string().max(4000).nullable().optional(),
    forebygging: z.string().max(4000).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
    status: z.enum(["APEN", "LUKKET"]),
  })
  .superRefine((value, ctx) => {
    if (value.note && containsGuestIdentity(value.note)) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Notatet kan ikke inneholde fødselsnummer eller legitimasjonsnummer.",
      });
    }
    if (value.status === "LUKKET" && !value.korrigerendeTiltak?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["korrigerendeTiltak"],
        message: "Hendelsen kan lukkes når korrigerende tiltak er fylt inn.",
      });
    }
  });

export const skjenkeRutineSchema = z.object({
  nokkel: z.string().min(2).max(80),
  innhold: z.string().max(8000),
  aktiv: z.boolean().default(true),
});

export const skjenkeGjennomgangSchema = z.object({
  gjennomfortAt: z.string().datetime(),
  gjennomfortAv: z.string().min(2).max(200),
  funn: z.string().min(2).max(8000),
  tiltak: z.string().max(8000).nullable().optional(),
  nesteDato: z.string().datetime(),
});
