import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Brukere", {
    headerFooter: {
      firstHeader: "Brukerimport – Last ned, fyll ut og importer",
    },
  });

  sheet.columns = [
    { header: "email", key: "email", width: 30 },
    { header: "navn", key: "navn", width: 25 },
    { header: "rolle", key: "rolle", width: 18 },
    { header: "stilling", key: "stilling", width: 22 },
    { header: "leder", key: "leder", width: 30 },
  ];

  sheet.addRow({
    email: "ola.nordmann@example.com",
    navn: "Ola Nordmann",
    rolle: "ANSATT",
    stilling: "Tømrer",
    leder: "kari.leder@example.com",
  });
  sheet.addRow({
    email: "kari.leder@example.com",
    navn: "Kari Leder",
    rolle: "LEDER",
    stilling: "Prosjektleder",
    leder: "",
  });

  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="bruker-import-eksempel.xlsx"',
      "Cache-Control": "no-cache",
    },
  });
}
