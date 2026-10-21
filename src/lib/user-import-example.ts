import ExcelJS from "exceljs";

/** Samme ark-navn og kolonner som docs/260306 Ansatt- og pårørendeliste.xlsx */
export const USER_IMPORT_EXAMPLE_SHEET_NAME = "Ansatt- og pårørende";

export const USER_IMPORT_EXAMPLE_COLUMNS = [
  { header: "Fornavn", key: "fornavn", width: 16, required: true },
  { header: "Etternavn", key: "etternavn", width: 16, required: true },
  { header: "Fødselsdato", key: "foedselsdato", width: 14, required: false },
  { header: "E-post", key: "epost", width: 28, required: true },
  { header: "Ansatt Fra", key: "ansattFra", width: 12, required: false },
  { header: "Avdeling", key: "avdeling", width: 16, required: false },
  { header: "Stilling", key: "stilling", width: 18, required: false },
  { header: "Adresse", key: "adresse", width: 22, required: false },
  { header: "Postnummer", key: "postnummer", width: 12, required: false },
  { header: "Poststed", key: "poststed", width: 14, required: false },
  { header: "Mobil", key: "mobil", width: 14, required: false },
  { header: "Pårørende 1", key: "parorende1", width: 18, required: false },
  { header: "Relasjon", key: "relasjon1", width: 12, required: false },
  { header: "Mobil", key: "mobilParorende1", width: 14, required: false },
  { header: "Pårørende 2", key: "parorende2", width: 18, required: false },
  { header: "Relasjon", key: "relasjon2", width: 12, required: false },
  { header: "Mobil", key: "mobilParorende2", width: 14, required: false },
] as const;

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

export async function buildUserImportExampleWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(USER_IMPORT_EXAMPLE_SHEET_NAME);
  sheet.columns = USER_IMPORT_EXAMPLE_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.height = 22;
  USER_IMPORT_EXAMPLE_COLUMNS.forEach((_, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.fill = HEADER_FILL;
    cell.alignment = { wrapText: true, vertical: "middle" };
  });

  sheet.addRow({
    fornavn: "Ola",
    etternavn: "Nordmann",
    foedselsdato: "01.01.1990",
    epost: "ola.nordmann@example.com",
    ansattFra: "01.01.2024",
    avdeling: "Bygg",
    stilling: "Tømrer",
    adresse: "Eksempelveien 1",
    postnummer: "0123",
    poststed: "Oslo",
    mobil: "90000001",
    parorende1: "Kari Nordmann",
    relasjon1: "Ektefelle",
    mobilParorende1: "90000002",
    parorende2: "",
    relasjon2: "",
    mobilParorende2: "",
  });
  sheet.addRow({
    fornavn: "Kari",
    etternavn: "Leder",
    foedselsdato: "15.06.1985",
    epost: "kari.leder@example.com",
    ansattFra: "01.03.2022",
    avdeling: "Administrasjon",
    stilling: "Prosjektleder",
    adresse: "Testgata 5",
    postnummer: "5003",
    poststed: "Bergen",
    mobil: "90000003",
    parorende1: "Per Leder",
    relasjon1: "Samboer",
    mobilParorende1: "90000004",
    parorende2: "",
    relasjon2: "",
    mobilParorende2: "",
  });

  const guide = workbook.addWorksheet("Veiledning");
  guide.getColumn(1).width = 96;
  const lines = [
    "Ansatt- og pårørendeliste – samme format som malen i docs",
    "",
    "Kolonner (rad 1 må stå uendret)",
    "Fornavn | Etternavn | Fødselsdato | E-post | Ansatt Fra | Avdeling | Stilling | Adresse | Postnummer | Poststed | Mobil | Pårørende 1 | Relasjon | Mobil | Pårørende 2 | Relasjon | Mobil",
    "",
    "Brukerimport (innlogging)",
    "• Påkrevd: Fornavn, Etternavn og E-post",
    "• Valgfritt for innlogging: Avdeling, Stilling",
    "• Rolle settes automatisk til ANSATT (ingen rolle-kolonne i denne malen)",
    "• Fyll ut eksempelradene eller erstatt dem med egne ansatte",
    "",
    "HR / Power Office-import",
    "• Samme fil kan brukes til å oppdatere fødselsdato, adresse, mobil og pårørende for eksisterende brukere",
    "• Matcher på e-post (eller navn) mot brukere som allerede er i systemet",
  ];
  lines.forEach((line, index) => {
    const row = guide.getRow(index + 1);
    row.getCell(1).value = line;
    if (index === 0) row.font = { bold: true, size: 14 };
    if (
      line === "Kolonner (rad 1 må stå uendret)" ||
      line === "Brukerimport (innlogging)" ||
      line === "HR / Power Office-import"
    ) {
      row.font = { bold: true };
    }
  });

  return workbook;
}
