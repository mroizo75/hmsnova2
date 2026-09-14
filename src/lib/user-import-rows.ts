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

const HEADER_ALIASES: Record<UserImportColumnKey, string[]> = {
  email: ["email", "e-post", "epost", "e_post"],
  name: ["navn", "name"],
  role: ["rolle", "role"],
  position: ["stilling", "position", "title", "stillingstittel"],
  manager: ["leder", "nærmeste leder", "naermeste leder", "manager", "leder-epost", "leder_epost"],
  employeeNumber: ["ansattnummer", "ansattnr", "ansatt-nr", "lønnsnummer", "loennsnummer", "employee number"],
  department: ["avdeling", "department"],
};

export const DEFAULT_USER_IMPORT_COLUMNS: UserImportColumnIndex = {
  email: 0,
  name: 1,
  role: 2,
  position: 3,
  manager: 4,
  employeeNumber: 5,
  department: 6,
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeUserImportRole(value: string): Role | null {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase() as Role;
  if (USER_IMPORT_ROLES.includes(upper)) return upper;
  const key = trimmed.toLowerCase().replace(/\s+/g, "-");
  return ROLE_ALIASES[key] ?? null;
}

export function detectUserImportColumns(headers: string[]): UserImportColumnIndex | null {
  const normalized = headers.map(normalizeHeader);
  const looksLikeHeader = normalized.some(
    (header) =>
      HEADER_ALIASES.email.includes(header) ||
      HEADER_ALIASES.name.includes(header) ||
      HEADER_ALIASES.role.includes(header)
  );
  if (!looksLikeHeader) return null;

  const index: UserImportColumnIndex = { ...DEFAULT_USER_IMPORT_COLUMNS };
  (Object.keys(HEADER_ALIASES) as UserImportColumnKey[]).forEach((key) => {
    const found = normalized.findIndex((header) => HEADER_ALIASES[key].includes(header));
    if (found >= 0) index[key] = found;
  });
  return index;
}

function cell(cells: string[], index: number): string {
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

export function mapUserImportRow(
  cells: string[],
  columns: UserImportColumnIndex
): UserImportRow | null {
  const email = cell(cells, columns.email).toLowerCase();
  const name = cell(cells, columns.name);
  const role = normalizeUserImportRole(cell(cells, columns.role));
  if (!email || !name || !role) return null;
  if (!EMAIL_PATTERN.test(email)) return null;

  return {
    email,
    name: name.slice(0, 120),
    role,
    position: normalizeOptional(cell(cells, columns.position), 100),
    managerEmail: normalizeManagerEmail(cell(cells, columns.manager)),
    employeeNumber: normalizeOptional(cell(cells, columns.employeeNumber), 40),
    departmentName: normalizeOptional(cell(cells, columns.department), 120),
  };
}

export function parseUserImportCsv(text: string): UserImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => line.split(sep).map((part) => part.replace(/^"|"$/g, "").trim());
  const first = split(lines[0]);
  const detected = detectUserImportColumns(first);
  const columns = detected ?? DEFAULT_USER_IMPORT_COLUMNS;
  const start = detected ? 1 : 0;
  const rows: UserImportRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const row = mapUserImportRow(split(lines[i]), columns);
    if (row) rows.push(row);
  }

  return rows;
}
