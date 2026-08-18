import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateImprovementReportPdf } from "@/features/hms-ai/lib/improvement-report-pdf"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId =
    (session as any).activeTenantId ?? user.tenants[0]?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Ingen bedrift valgt" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const monthsBack = parseInt(searchParams.get("months") ?? "12", 10)

  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setMonth(periodStart.getMonth() - monthsBack)
  periodStart.setHours(0, 0, 0, 0)

  const pdfBuffer = await generateImprovementReportPdf(
    tenantId,
    periodStart,
    periodEnd,
  )

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  })

  const filename = `Forbedringsrapport_${tenant?.name ?? "bedrift"}_${periodStart.getFullYear()}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
