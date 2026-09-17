import ExcelJS from "exceljs";
import { DEFAULT_USER_IMPORT_ROLE, USER_IMPORT_ROLES } from "@/lib/user-import-rows";

export const USER_IMPORT_EXAMPLE_COLUMNS = [
  {
    header: "e-post (påkrevd)",
    key: "email",
    width: 32,
    required: true,
    note: "Påkrevd. Invitasjon og innlogging sendes hit.",
  },
  {
    header: "navn (påkrevd)",
    key: "navn",
    width: 24,
    required: true,
    note: "Påkrevd. Fornavn og etternavn. Alternativt egne kolonner fornavn og etternavn.",
  },
  {
    header: "rolle (valgfritt)",
    key: "rolle",
    width: 20,
    required: false,
    note: `Valgfritt. Tomt felt gir ${DEFAULT_USER_IMPORT_ROLE}.`,
  },
  {
    header: "ansattnummer (valgfritt)",
    key: "ansattnummer",
    width: 24,
    required: false,
    note: "Valgfritt. Bedriftens ansatt- eller lønnsnummer.",
  },
  {
    header: "stilling (valgfritt)",
    key: "stilling",
    width: 22,
    required: false,
    note: "Valgfritt.",
  },
  {
    header: "avdeling (valgfritt)",
    key: "avdeling",
    width: 20,
    required: false,
    note: "Valgfritt. Må treffe et avdelingsnavn som allerede finnes.",
  },
  {
    header: "leder (valgfritt)",
    key: "leder",
    width: 32,
    required: false,
    note: "Valgfritt. E-post til nærmeste leder. Kan peke på en annen rad i samme fil.",
  },
] as const;

const REQUIRED_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};
const OPTIONAL_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF6B7280" },
};

export async function buildUserImportExampleWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Brukere");
  sheet.columns = USER_IMPORT_EXAMPLE_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.height = 22;
  USER_IMPORT_EXAMPLE_COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.fill = column.required ? REQUIRED_FILL : OPTIONAL_FILL;
    cell.note = column.note;
    cell.alignment = { wrapText: true, vertical: "middle" };
  });

  sheet.addRow({
    email: "ola.nordmann@example.com",
    navn: "Ola Nordmann",
    rolle: "",
    ansattnummer: "",
    stilling: "",
    avdeling: "",
    leder: "",
  });
  sheet.addRow({
    email: "kari.leder@example.com",
    navn: "Kari Leder",
    rolle: "LEDER",
    ansattnummer: "A-0001",
    stilling: "Prosjektleder",
    avdeling: "Bygg",
    leder: "",
  });
  sheet.addRow({
    email: "per.ansatt@example.com",
    navn: "Per Ansatt",
    rolle: "",
    ansattnummer: "",
    stilling: "",
    avdeling: "",
    leder: "kari.leder@example.com",
  });

  const roleValidation: ExcelJS.DataValidation = {
    type: "list",
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: "Ugyldig rolle",
    error: `La feltet stå tomt for ${DEFAULT_USER_IMPORT_ROLE}, eller velg en gyldig rolle.`,
    formulae: [`"${USER_IMPORT_ROLES.join(",")}"`],
  };
  for (let rowNumber = 2; rowNumber <= 501; rowNumber += 1) {
    sheet.getCell(rowNumber, 3).dataValidation = roleValidation;
  }

  const guide = workbook.addWorksheet("Veiledning");
  guide.getColumn(1).width = 92;
  const lines = [
    "Brukerimport – kun feltene som trengs for å opprette innlogging",
    "",
    "Påkrevd",
    "• e-post – invitasjon og innlogging",
    "• navn – visningsnavn (eller kolonnene fornavn + etternavn)",
    "",
    "Valgfritt – kan stå tomme. Fylles inn i HR/personalarkiv senere om du vil.",
    `• rolle – tomt felt gir ${DEFAULT_USER_IMPORT_ROLE}. Gyldige: ${USER_IMPORT_ROLES.join(", ")}`,
    "• ansattnummer",
    "• stilling",
    "• avdeling – må treffe et avdelingsnavn som allerede finnes",
    "• leder – e-post til nærmeste leder, kan stå hvor som helst i filen",
    "",
    "Ikke ta med her",
    "Pårørende, fødselsdato, adresse, mobil og lignende hører til HR-import av ansatt- og pårørendeliste. De er ikke nødvendig for å registrere en bruker.",
  ];
  lines.forEach((line, index) => {
    const row = guide.getRow(index + 1);
    row.getCell(1).value = line;
    if (index === 0) row.font = { bold: true, size: 14 };
    if (line === "Påkrevd" || line === "Valgfritt – kan stå tomme. Fylles inn i HR/personalarkiv senere om du vil." || line === "Ikke ta med her") {
      row.font = { bold: true };
    }
  });

  return workbook;
}
