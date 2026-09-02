/**
 * Regelbasert (ikke-AI) forslagsmotor for "levende HMS-håndbok".
 *
 * Ren nøkkelord-/regellogikk – ingen AI/OpenAI-kall, ingen kostnad per bruk.
 * Kjøres når HMS-ansvarlig/leder BEHANDLER (utreder) et avvik/RUH, ikke ved
 * førstegangs-innsending. Formålet er å foreslå hvilken type dokument i
 * HMS-håndboken som bør vurderes oppdatert ut fra hendelsen – et menneske
 * vurderer alltid forslaget (IK-HMS § 5: systematisk oppfølging av avvik).
 *
 * Inspirert av suggestHandbookUpdates() i hmsnova3, men bygget nativt mot
 * hmsnova2 sin egen DocumentKind-enum (LAW/PROCEDURE/CHECKLIST/FORM/SDS/PLAN/OTHER).
 */

import type { DocumentKind, IncidentType } from "@prisma/client";

export interface HandbookSuggestion {
  /** Stabil kode - brukes til å unngå duplikater og for evt. "Ikke relevant"-sporing i UI */
  code: string;
  documentKind: DocumentKind;
  message: string;
}

export interface SuggestHandbookUpdatesInput {
  type: IncidentType | string;
  title: string;
  rootCause?: string | null;
  description?: string | null;
}

interface KeywordRule {
  code: string;
  documentKind: DocumentKind;
  message: string;
  keywords: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    code: "HANDBOOK_FIRE",
    documentKind: "PLAN",
    message: "Vurder å oppdatere brann-/beredskapsplan og rømningsøvelse ut fra dette avviket.",
    keywords: ["brann", "røyk", "rømning", "evakuer", "brannalarm", "slokk"],
  },
  {
    code: "HANDBOOK_CHEM",
    documentKind: "SDS",
    message: "Sjekk stoffkartotek og sikkerhetsdatablad (SDS) etter dette avviket.",
    keywords: ["kjemikal", "sds", "sikkerhetsdatablad", "eksponer", "løsemiddel", "gass", "syre"],
  },
  {
    code: "HANDBOOK_HEIGHT",
    documentKind: "PROCEDURE",
    message: "Dette avviket tyder på at prosedyren for arbeid i høyden bør gjennomgås.",
    keywords: ["høyde", "stige", "stillas", "fallsikring", "tak", "lift"],
  },
  {
    code: "HANDBOOK_HYGIENE",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere rutine for mattrygghet/hygiene basert på dette avviket.",
    keywords: ["mat", "hygiene", "allergen", "kjøkken", "næringsmiddel", "temperatur"],
  },
  {
    code: "HANDBOOK_MACHINE",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere prosedyre for sikker bruk av maskiner/utstyr.",
    keywords: ["maskin", "verktøy", "utstyr", "sag", "kutt", "klem", "roterende"],
  },
  {
    code: "HANDBOOK_ELECTRICAL",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere prosedyre for elektrisk arbeid/el-sikkerhet.",
    keywords: ["elektrisk", "strøm", "kortslutning", "spenning", "el-anlegg"],
  },
  {
    code: "HANDBOOK_VEHICLE",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere kjøre-/transportrutine ut fra dette avviket.",
    keywords: ["kjøretøy", "truck", "bil", "trailer", "kjøring", "transport"],
  },
  {
    code: "HANDBOOK_ERGONOMICS",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere ergonomirutine (løft/arbeidsstilling) ut fra dette avviket.",
    keywords: ["løft", "tunge", "ergonomi", "arbeidsstilling", "belastning", "rygg"],
  },
  {
    code: "HANDBOOK_PSYCHOSOCIAL",
    documentKind: "PROCEDURE",
    message: "Vurder å gjennomgå rutine for psykososialt arbeidsmiljø/varsling.",
    keywords: ["mobbing", "trakasser", "trussel", "vold", "konflikt", "psykisk"],
  },
  {
    code: "HANDBOOK_ENVIRONMENT",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere rutine for miljøavvik/utslippshåndtering.",
    keywords: ["utslipp", "forurens", "avfall", "miljø", "søl"],
  },
  {
    code: "HANDBOOK_CUSTOMER",
    documentKind: "PROCEDURE",
    message: "Vurder å oppdatere rutine for kundebehandling/klagehåndtering.",
    keywords: ["kunde", "klage", "reklamasjon"],
  },
];

const TYPE_DEFAULT_RULES: Partial<Record<IncidentType | string, KeywordRule>> = {
  YRKESSYKDOM: {
    code: "HANDBOOK_OCCUPATIONAL_HEALTH",
    documentKind: "SDS",
    message: "Yrkessykdom registrert – vurder eksponeringsregister og stoffkartotek for mulig kilde.",
    keywords: [],
  },
  MILJO: {
    code: "HANDBOOK_ENVIRONMENT_TYPE",
    documentKind: "PROCEDURE",
    message: "Miljøavvik registrert – vurder om miljørutinen bør oppdateres (ISO 14001).",
    keywords: [],
  },
  CUSTOMER: {
    code: "HANDBOOK_CUSTOMER_TYPE",
    documentKind: "PROCEDURE",
    message: "Kundeklage registrert – vurder om rutine for kundebehandling bør oppdateres (ISO 10002).",
    keywords: [],
  },
};

/**
 * Foreslår håndbok-/rutineoppdateringer basert på et avvik/RUH under behandling.
 * Mennesket (HMS-ansvarlig/leder) må alltid selv bekrefte eller avvise forslaget.
 */
export function suggestHandbookUpdates(input: SuggestHandbookUpdatesInput): HandbookSuggestion[] {
  const suggestions: HandbookSuggestion[] = [];
  const seenCodes = new Set<string>();
  const text = `${input.title} ${input.rootCause ?? ""} ${input.description ?? ""}`.toLowerCase();

  const addSuggestion = (rule: Pick<KeywordRule, "code" | "documentKind" | "message">) => {
    if (seenCodes.has(rule.code)) return;
    seenCodes.add(rule.code);
    suggestions.push({ code: rule.code, documentKind: rule.documentKind, message: rule.message });
  };

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      addSuggestion(rule);
    }
  }

  const typeRule = TYPE_DEFAULT_RULES[input.type];
  if (typeRule) {
    addSuggestion(typeRule);
  }

  if (suggestions.length === 0 && input.rootCause?.trim()) {
    addSuggestion({
      code: "HANDBOOK_GENERAL",
      documentKind: "PROCEDURE",
      message: "Vurder om en relevant rutine i HMS-håndboken bør oppdateres ut fra denne årsaksanalysen.",
    });
  }

  return suggestions.slice(0, 4);
}
