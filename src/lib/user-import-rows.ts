import { Role } from "@prisma/client";

export const USER_IMPORT_ROLES: Role[] = [
  "ADMIN",
  "HMS",
  "LEDER",
  "HR",
  "VERNEOMBUD",
  "ANSATT",
  "BHT",
  "REVISOR",
  "VARSLINGSANSVARLIG",
];

export const DEFAULT_USER_IMPORT_ROLE: Role = "ANSATT";

const ROLE_ALIASES: Record<string, Role> = {
  administrator: "ADMIN",
  admin: "ADMIN",
  hr: "HR",
  leder: "LEDER",
  hms: "HMS",
  "hms-ansvarlig": "HMS",
  verneombud: "VERNEOMBUD",
  ansatt: "ANSATT",
  bht: "BHT",
  bedriftshelsetjeneste: "BHT",
  revisor: "REVISOR",
  varslingsansvarlig: "VARSLINGSANSVARLIG",
  "varslings-ansvarlig": "VARSLINGSANSVARLIG",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserImportColumnKey =
  | "email"
  | "name"
  | "firstName"
  | "lastName"
  | "role"
  | "position"
  | "manager"
  | "employeeNumber"
  | "department";

export type UserImportColumnIndex = Record<UserImportColumnKey, number>;

export type UserImportRow = {
  email: string;
  name: string;
  role: Role;
  position: string | null;
  managerEmail: string | null;
  employeeNumber: string | null;
  departmentName: string | null;
};

export type UserImportRowResult =
  | { status: "ok"; row: UserImportRow }
  | { status: "empty" }
  | { status: "error"; message: string };

export type UserImportParseResult = {
  rows: UserImportRow[];
  errors: string[];
};

const HEADER_ALIASES: Record<UserImportColumnKey, string[]> = {
  email: ["email", "e-post", "epost", "e_post"],
  name: ["navn", "name", "fullt navn", "full name"],
  firstName: ["fornavn", "first name", "firstname", "first-name"],
  lastName: ["etternavn", "last name", "lastname", "last-name", "surname"],
  role: ["rolle", "role"],
  position: ["stilling", "position", "title", "stillingstittel"],
  manager: ["leder", "nærmeste leder", "naermeste leder", "manager", "leder-epost", "leder_epost"],
  employeeNumber: ["ansattnummer", "ansattnr", "ansatt-nr", "lønnsnummer", "loennsnummer", "employee number"],
  department: ["avdeling", "department"],
};

export const DEFAULT_USER_IMPORT_COLUMNS: UserImportColumnIndex = {
  email: 0,
  name: 1,
  firstName: -1,
  lastName: -1,
  role: 2,
  position: 3,
  manager: 4,
  employeeNumber: 5,
  department: 6,
};

function missingColumnIndex(): UserImportColumnIndex {
  return {
    email: -1,
    name: -1,
    firstName: -1,
    lastName: -1,
    role: -1,
    position: -1,
    manager: -1,
    employeeNumber: -1,
    department: -1,
  };
}

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[*]+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\b(p[åa]krevd|obligatorisk|required|valgfritt|valgfri|optional)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUserImportRole(value: string): Role | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase() as Role;
  if (USER_IMPORT_ROLES.includes(upper)) return upper;
  const key = trimmed.toLowerCase().replace(/\s+/g, "-");
  return ROLE_ALIASES[key] ?? null;
}

export function detectUserImportColumns(headers: string[]): UserImportColumnIndex | null {
  const normalized = headers.map(normalizeHeader);
  const looksLikeHeader = (Object.keys(HEADER_ALIASES) as UserImportColumnKey[]).some((key) =>
    normalized.some((header) => HEADER_ALIASES[key].includes(header))
  );
  if (!looksLikeHeader) return null;

  const index = missingColumnIndex();
  (Object.keys(HEADER_ALIASES) as UserImportColumnKey[]).forEach((key) => {
    const found = normalized.findIndex((header) => HEADER_ALIASES[key].includes(header));
    if (found >= 0) index[key] = found;
  });
  return index;
}

function cell(cells: string[], index: number): string {
  if (index < 0) return "";
  return (cells[index] ?? "").trim();
}

function normalizeOptional(value: string, max: number): string | null {
  const text = value.trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

function normalizeManagerEmail(value: string): string | null {
  const email = value.toLowerCase().trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function resolveName(cells: string[], columns: UserImportColumnIndex): string {
  const full = cell(cells, columns.name);
  if (full) return full.slice(0, 120);
  const first = cell(cells, columns.firstName);
  const last = cell(cells, columns.lastName);
  return `${first} ${last}`.replace(/\s+/g, " ").trim().slice(0, 120);
}

function rowHasContent(cells: string[], columns: UserImportColumnIndex): boolean {
  return (Object.keys(columns) as UserImportColumnKey[]).some((key) => cell(cells, columns[key]).length > 0);
}

export function mapUserImportRow(
  cells: string[],
  columns: UserImportColumnIndex,
  rowLabel = "rad"
): UserImportRowResult {
  if (!rowHasContent(cells, columns)) return { status: "empty" };

  const email = cell(cells, columns.email).toLowerCase();
  const name = resolveName(cells, columns);
  const roleRaw = cell(cells, columns.role);

  if (!email) {
    return { status: "error", message: `${rowLabel}: mangler e-post (påkrevd for innlogging)` };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: `${rowLabel}: ugyldig e-post` };
  }
  if (!name) {
    return { status: "error", message: `${rowLabel}: mangler navn (påkrevd)` };
  }

  let role: Role = DEFAULT_USER_IMPORT_ROLE;
  if (roleRaw) {
    const parsed = normalizeUserImportRole(roleRaw);
    if (!parsed) {
      return {
        status: "error",
        message: `${rowLabel}: ugyldig rolle "${roleRaw}". Gyldige: ${USER_IMPORT_ROLES.join(", ")}. Tomt felt gir ${DEFAULT_USER_IMPORT_ROLE}.`,
      };
    }
    role = parsed;
  }

  return {
    status: "ok",
    row: {
      email,
      name,
      role,
      position: normalizeOptional(cell(cells, columns.position), 100),
      managerEmail: normalizeManagerEmail(cell(cells, columns.manager)),
      employeeNumber: normalizeOptional(cell(cells, columns.employeeNumber), 40),
      departmentName: normalizeOptional(cell(cells, columns.department), 120),
    },
  };
}

function collectRows(lines: string[][], start: number, columns: UserImportColumnIndex): UserImportParseResult {
  const rows: UserImportRow[] = [];
  const errors: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const mapped = mapUserImportRow(lines[i], columns, `rad ${i + 1}`);
    if (mapped.status === "ok") rows.push(mapped.row);
    else if (mapped.status === "error") errors.push(mapped.message);
  }

  return { rows, errors };
}

export function parseUserImportCsv(text: string): UserImportParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: [] };

  const sep = lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => line.split(sep).map((part) => part.replace(/^"|"$/g, "").trim());
  const parsedLines = lines.map(split);
  const detected = detectUserImportColumns(parsedLines[0]);
  const columns = detected ?? DEFAULT_USER_IMPORT_COLUMNS;
  const start = detected ? 1 : 0;
  return collectRows(parsedLines, start, columns);
}
