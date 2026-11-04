import ExcelJS from "exceljs";

/**
 * Beredskapsliste til lederens perm.
 * AML § 3-1: arbeidsgiver skal ha planer for ulykker og andre faresituasjoner.
 * AML § 5-2: alvorlig personskade og dødsfall varsles straks til politi og Arbeidstilsynet.
 * Internkontrollforskriften § 5 nr. 6: planer og tiltak skal dokumenteres.
 * GDPR art. 5: bare det som trengs for å nå den ansatte og pårørende. Ingen diagnose.
 */
export type EmergencyRosterKin = {
  name: string;
  relation: string | null;
  phone: string | null;
};

export type EmergencyRosterEmployee = {
  name: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  nextOfKin: EmergencyRosterKin[];
};

export function formatNextOfKin(kin: EmergencyRosterKin[]): string {
  if (kin.length === 0) return "Ikke registrert";
  return kin
    .map((person) => [person.name, person.relation, person.phone].filter(Boolean).join(", "))
    .join(" · ");
}

function kinFields(kin: EmergencyRosterKin[], index: number) {
  const person = kin[index];
  return {
    name: person?.name ?? "",
    relation: person?.relation ?? "",
    phone: person?.phone ?? "",
  };
}

export async function buildEmergencyRosterWorkbook(input: {
  tenantName: string;
  orgNumber?: string | null;
  scopeLabel: string;
  employees: EmergencyRosterEmployee[];
}): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Beredskapsliste");
  sheet.columns = [
    { header: "Avdeling", key: "department", width: 22 },
    { header: "Ansatt", key: "name", width: 26 },
    { header: "Telefon", key: "phone", width: 16 },
    { header: "Stilling", key: "position", width: 22 },
    { header: "Pårørende 1", key: "kin1Name", width: 22 },
    { header: "Relasjon 1", key: "kin1Relation", width: 14 },
    { header: "Mobil 1", key: "kin1Phone", width: 14 },
    { header: "Pårørende 2", key: "kin2Name", width: 22 },
    { header: "Relasjon 2", key: "kin2Relation", width: 14 },
    { header: "Mobil 2", key: "kin2Phone", width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  headerRow.height = 22;

  const sorted = [...input.employees].sort((a, b) => {
    const department = (a.department ?? "Uten avdeling").localeCompare(
      b.department ?? "Uten avdeling",
      "nb"
    );
    if (department !== 0) return department;
    return a.name.localeCompare(b.name, "nb");
  });

  for (const employee of sorted) {
    const kin1 = kinFields(employee.nextOfKin, 0);
    const kin2 = kinFields(employee.nextOfKin, 1);
    sheet.addRow({
      department: employee.department?.trim() || "Uten avdeling",
      name: employee.name,
      phone: employee.phone?.trim() || "Mangler",
      position: employee.position?.trim() || "",
      kin1Name: kin1.name,
      kin1Relation: kin1.relation,
      kin1Phone: kin1.phone,
      kin2Name: kin2.name,
      kin2Relation: kin2.relation,
      kin2Phone: kin2.phone,
    });
  }

  // AutoFilter: gjør det enkelt å filtrere på avdeling i Excel
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sorted.length + 1), column: 10 },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const guide = workbook.addWorksheet("Veiledning");
  guide.getColumn(1).width = 96;
  const lines = [
    "Beredskapsfil – Excel",
    "",
    input.tenantName,
    input.orgNumber ? `Org.nr. ${input.orgNumber}` : "",
    input.scopeLabel,
    "",
    "Hvordan filtrere på avdeling",
    "1. Åpne arket «Beredskapsliste».",
    "2. Klikk pilen i kolonneoverskriften «Avdeling».",
    "3. Huk av ønsket avdeling (eller flere).",
    "",
    "Slik brukes listen",
    "Listen er til lederens perm slik at pårørende kan nås ved en ulykke.",
    "Ring 113 ved personskade, 110 ved brann og 112 ved behov for politi.",
    "Ved alvorlig personskade eller dødsfall skal arbeidsgiver straks varsle politiet og Arbeidstilsynet.",
    "Ved dødsfall er det politiet som varsler pårørende.",
    "",
    "Nødnumre",
    "Ambulanse: 113",
    "Brann: 110",
    "Politi: 112",
    "Legevakt: 116 117",
    "Arbeidstilsynet: 73 19 97 00",
    "",
    "Hjemmel: AML § 3-1 og § 5-2, internkontrollforskriften § 5 nr. 6. GDPR art. 5: ingen diagnose.",
  ].filter((line, index, all) => !(line === "" && all[index - 1] === ""));

  lines.forEach((line, index) => {
    const row = guide.getRow(index + 1);
    row.getCell(1).value = line;
    if (index === 0) row.font = { bold: true, size: 14 };
    if (
      line === "Hvordan filtrere på avdeling" ||
      line === "Slik brukes listen" ||
      line === "Nødnumre"
    ) {
      row.font = { bold: true };
    }
  });

  return workbook;
}
