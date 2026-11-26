import { MAX_AGREED_VACATION_TRANSFER_WEEKDAYS } from "@/lib/hr-document-template-library";

const DATE_KEYS = new Set(["ansattFodselsdato", "tiltredelsesdato", "avtaleDato"]);

const FIELD_LABELS: Record<string, string> = {
  bedriftsnavn: "Bedriftsnavn",
  orgNummer: "Organisasjonsnummer",
  adresse: "Adresse",
  dagligLeder: "Daglig leder",
  ansattNavn: "Ansatt",
  ansattFodselsdato: "Fødselsdato",
  stillingstittel: "Stilling",
  arbeidssted: "Arbeidssted",
  tiltredelsesdato: "Tiltredelsesdato",
  lonn: "Lønn",
  arbeidstid: "Arbeidstid",
  feriedager: "Feriedager",
  oppsigelsestid: "Oppsigelsestid",
  provetid: "Prøvetid",
  feriear: "Ferieår det overføres fra",
  nesteFeriear: "Ferieår det overføres til",
  antallVirkedager: "Antall virkedager",
  avtaleDato: "Avtaledato",
};

export type HrMergeFieldInput = "text" | "number" | "date";

export type HrMergeField = {
  key: string;
  label: string;
  value: string;
  input: HrMergeFieldInput;
};

export type HrMergeContext = {
  tenantName: string;
  orgNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  contactPerson?: string | null;
  employeeName: string;
  dateOfBirth?: Date | null;
  position?: string | null;
  workplace?: string | null;
  startedAt?: Date | null;
  now?: Date;
};

export function hrMergeFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function templateVariableKeys(variables: unknown, bodyHtml: string | null): string[] {
  if (Array.isArray(variables)) {
    const keys = variables.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (keys.length > 0) return keys;
  }

  const found: string[] = [];
  const pattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  for (const match of bodyHtml?.matchAll(pattern) ?? []) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatNbDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function defaultHrMergeValues(keys: string[], context: HrMergeContext): Record<string, string> {
  const now = context.now ?? new Date();
  const year = now.getFullYear();
  const cityLine = [context.postalCode, context.city].filter(Boolean).join(" ");
  const address = [context.address, cityLine].filter(Boolean).join(", ");
  const known: Record<string, string> = {
    bedriftsnavn: context.tenantName.trim(),
    orgNummer: context.orgNumber?.trim() ?? "",
    adresse: address,
    dagligLeder: context.contactPerson?.trim() ?? "",
    ansattNavn: context.employeeName.trim(),
    ansattFodselsdato: context.dateOfBirth ? isoDate(context.dateOfBirth) : "",
    stillingstittel: context.position?.trim() ?? "",
    arbeidssted: context.workplace?.trim() ?? "",
    tiltredelsesdato: context.startedAt ? isoDate(context.startedAt) : "",
    feriedager: "25",
    feriear: String(year),
    nesteFeriear: String(year + 1),
    avtaleDato: isoDate(now),
  };

  const values: Record<string, string> = {};
  for (const key of keys) {
    values[key] = known[key] ?? "";
  }
  return values;
}

export function hrMergeFields(keys: string[], values: Record<string, string>): HrMergeField[] {
  return keys.map((key) => ({
    key,
    label: hrMergeFieldLabel(key),
    value: values[key] ?? "",
    input: DATE_KEYS.has(key) ? "date" : key === "antallVirkedager" ? "number" : "text",
  }));
}

export function validateHrMergeValues(keys: string[], values: Record<string, string>): string | null {
  for (const key of keys) {
    const value = values[key]?.trim() ?? "";
    if (!value) return `${hrMergeFieldLabel(key)} må fylles ut`;
    if (value.length > 200) return `${hrMergeFieldLabel(key)} er for lang`;
  }

  if (keys.includes("antallVirkedager")) {
    const count = Number(values.antallVirkedager?.trim());
    if (!Number.isInteger(count) || count < 1 || count > MAX_AGREED_VACATION_TRANSFER_WEEKDAYS) {
      return `Avtalt overføring kan være 1–${MAX_AGREED_VACATION_TRANSFER_WEEKDAYS} virkedager, jf. ferieloven § 7 (3).`;
    }
  }

  return null;
}

export function mergeHrDocumentHtml(html: string, keys: string[], values: Record<string, string>): string {
  let result = html;
  for (const key of keys) {
    const raw = values[key]?.trim() ?? "";
    const printed = DATE_KEYS.has(key) ? formatNbDate(raw) : raw;
    result = result.replaceAll(`{{${key}}}`, escapeHtml(printed));
  }
  return result;
}
