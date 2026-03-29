import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderExposureRegisterPDF } from "@/lib/exposure-register-pdf";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [user, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        tenants: {
          where: session.user.tenantId ? { tenantId: session.user.tenantId } : undefined,
          take: 1,
          include: { tenant: { select: { name: true } } },
        },
      },
    }),
    prisma.exposureRegister.findMany({
      where: { employeeId: session.user.id },
      select: {
        id: true,
        exposureAgent: true,
        exposureType: true,
        exposureStartDate: true,
        exposureEndDate: true,
        duration: true,
        ppeUsed: true,
        healthCheckRequired: true,
        healthCheckDone: true,
        healthCheckDate: true,
        retentionUntilDate: true,
        status: true,
        comment: true,
        department: true,
        jobTitle: true,
        workLocation: true,
        registeredBy: true,
        chemical: { select: { productName: true, casNumber: true } },
        ruhReport: { select: { ruhNummer: true, title: true } },
        risk: { select: { title: true, score: true } },
      },
      orderBy: { exposureStartDate: "desc" },
    }),
  ]);

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const employeeName = user.name ?? user.email ?? "Ukjent";
  const selectedTenant = user.tenants.find((tenant) => tenant.tenant?.name);
  const companyName = selectedTenant?.tenant?.name ?? "Ukjent bedrift";
  const generatedAt = new Date().toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  try {
    const pdfBuffer = await renderExposureRegisterPDF({
      employeeName,
      companyName,
      generatedAt,
      entries,
    });

    const safeName = `Eksponeringsregister-${employeeName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new NextResponse("Kunne ikke generere PDF", { status: 500 });
  }
}
