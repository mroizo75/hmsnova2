export type PowerOfficeNextOfKin = {
  name: string;
  relation: string | null;
  phone: string | null;
};

export type PowerOfficeRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  email: string | null;
  startedAt: Date | null;
  department: string | null;
  position: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  employeeNumber: string | null;
  nextOfKin: PowerOfficeNextOfKin[];
};

export type PowerOfficeMatchCandidate = {
  userId: string;
  userTenantId: string;
  email: string;
  name: string | null;
  employeeNumber: string | null;
};

export type PowerOfficeMatchStatus = "matched" | "ambiguous" | "unmatched";

export type PowerOfficeMatchResult = {
  row: PowerOfficeRow;
  status: PowerOfficeMatchStatus;
  matchedUserId: string | null;
  reason: string;
};

const EMAIL_HEADERS = ["e-post", "epost", "email"];
const EMPLOYEE_NUMBER_HEADERS = ["lønnsnummer", "loennsnummer", "ansattnr", "ansattnummer", "employee number"];
const DOB_HEADERS = ["fødselsdato", "foedselsdato", "birth date", "date of birth"];
const START_HEADERS = ["ansatt fra", "startdato", "start date"];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return "";
  return String(value).trim();
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizePersonName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.replace(/\s+/g, " ").trim().toLowerCase();
}

export function normalizeStoredName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const text = cellText(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const nb = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (nb) {
    const date = new Date(`${nb[3]}-${nb[2].padStart(2, "0")}-${nb[1].padStart(2, "0")}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

export function mapPowerOfficeHeaders(rawHeaders: unknown[]): Record<string, number> {
  const headers = rawHeaders.map(normalizeHeader);
  const map: Record<string, number> = {
    firstName: headerIndex(headers, ["fornavn", "first name"]),
    lastName: headerIndex(headers, ["etternavn", "last name"]),
    dateOfBirth: headerIndex(headers, DOB_HEADERS),
    email: headerIndex(headers, EMAIL_HEADERS),
    startedAt: headerIndex(headers, START_HEADERS),
    department: headerIndex(headers, ["avdeling", "department"]),
    position: headerIndex(headers, ["stilling", "position", "title"]),
    address: headerIndex(headers, ["adresse", "address"]),
    postalCode: headerIndex(headers, ["postnummer", "postnr", "postal code"]),
    city: headerIndex(headers, ["poststed", "poststed/sted", "city"]),
    phone: headers.findIndex((header, index) => {
      if (!["mobil", "telefon", "phone", "mobile"].includes(header)) return false;
      const prev = headers[index - 1] ?? "";
      return !prev.includes("pårørende") && !prev.includes("parorende") && prev !== "relasjon";
    }),
    employeeNumber: headerIndex(headers, EMPLOYEE_NUMBER_HEADERS),
  };

  const kinStarts: number[] = [];
  headers.forEach((header, index) => {
    if (header.startsWith("pårørende") || header.startsWith("parorende") || header === "next of kin") {
      kinStarts.push(index);
    }
  });
  map.kin1 = kinStarts[0] ?? -1;
  map.kin2 = kinStarts[1] ?? -1;
  return map;
}

function readKin(values: unknown[], startIndex: number): PowerOfficeNextOfKin | null {
  if (startIndex < 0) return null;
  const name = cellText(values[startIndex]);
  if (!name) return null;
  return {
    name,
    relation: cellText(values[startIndex + 1]) || null,
    phone: cellText(values[startIndex + 2]) || null,
  };
}

export function parsePowerOfficeRow(values: unknown[], headerMap: Record<string, number>, rowNumber: number): PowerOfficeRow | null {
  const firstName = cellText(headerMap.firstName >= 0 ? values[headerMap.firstName] : "");
  const lastName = cellText(headerMap.lastName >= 0 ? values[headerMap.lastName] : "");
  if (!firstName && !lastName) return null;

  const nextOfKin = [readKin(values, headerMap.kin1), readKin(values, headerMap.kin2)].filter(
    (kin): kin is PowerOfficeNextOfKin => kin != null,
  );

  return {
    rowNumber,
    firstName,
    lastName,
    dateOfBirth: headerMap.dateOfBirth >= 0 ? parseExcelDate(values[headerMap.dateOfBirth]) : null,
    email: normalizeEmail(cellText(headerMap.email >= 0 ? values[headerMap.email] : "")),
    startedAt: headerMap.startedAt >= 0 ? parseExcelDate(values[headerMap.startedAt]) : null,
    department: cellText(headerMap.department >= 0 ? values[headerMap.department] : "") || null,
    position: cellText(headerMap.position >= 0 ? values[headerMap.position] : "") || null,
    address: cellText(headerMap.address >= 0 ? values[headerMap.address] : "") || null,
    postalCode: cellText(headerMap.postalCode >= 0 ? values[headerMap.postalCode] : "") || null,
    city: cellText(headerMap.city >= 0 ? values[headerMap.city] : "") || null,
    phone: cellText(headerMap.phone >= 0 ? values[headerMap.phone] : "") || null,
    employeeNumber: cellText(headerMap.employeeNumber >= 0 ? values[headerMap.employeeNumber] : "") || null,
    nextOfKin,
  };
}

export function matchPowerOfficeRow(
  row: PowerOfficeRow,
  candidates: PowerOfficeMatchCandidate[],
): PowerOfficeMatchResult {
  if (row.email) {
    const emailHits = candidates.filter((candidate) => normalizeEmail(candidate.email) === row.email);
    if (emailHits.length === 1) {
      return { row, status: "matched", matchedUserId: emailHits[0].userId, reason: "e-post" };
    }
    if (emailHits.length > 1) {
      return { row, status: "ambiguous", matchedUserId: null, reason: "Flere treff på e-post" };
    }
  }

  if (row.employeeNumber) {
    const numberHits = candidates.filter(
      (candidate) => (candidate.employeeNumber ?? "").trim() === row.employeeNumber,
    );
    if (numberHits.length === 1) {
      return { row, status: "matched", matchedUserId: numberHits[0].userId, reason: "lønnsnummer" };
    }
    if (numberHits.length > 1) {
      return { row, status: "ambiguous", matchedUserId: null, reason: "Flere treff på lønnsnummer" };
    }
  }

  const wanted = normalizePersonName(row.firstName, row.lastName);
  if (wanted.length > 0) {
    const nameHits = candidates.filter((candidate) => normalizeStoredName(candidate.name) === wanted);
    if (nameHits.length === 1) {
      return { row, status: "matched", matchedUserId: nameHits[0].userId, reason: "navn" };
    }
    if (nameHits.length > 1) {
      return { row, status: "ambiguous", matchedUserId: null, reason: "Flere treff på navn" };
    }
  }

  return { row, status: "unmatched", matchedUserId: null, reason: "Ingen treff" };
}
