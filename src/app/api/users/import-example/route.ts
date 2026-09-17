import { buildUserImportExampleWorkbook } from "@/lib/user-import-example";

export async function GET() {
  const workbook = await buildUserImportExampleWorkbook();
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
