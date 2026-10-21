import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { generateDocumentPdf } from "@/lib/pdf-brand";
import { buildReviewDocument } from "@/features/employee-reviews/lib/review-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;
  const review = await prisma.employeeReview.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
      ...(auth.permissions.canReadAllEmployeeReviews
        ? {}
        : { OR: [{ employeeId: auth.userId }, { reviewerId: auth.userId }] }),
    },
    include: {
      employee: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
      goals: { select: { description: true, status: true } },
      actions: { select: { description: true, ansvarlig: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Samtalen ble ikke funnet" }, { status: 404 });
  }

  const employeeName = review.employee.name ?? review.employee.email;
  const document = buildReviewDocument(
    {
      kind: review.kind,
      status: review.status,
      templateKey: review.templateKey,
      templateAnswers: review.templateAnswers,
      scheduledDate: review.scheduledDate,
      completedDate: review.completedDate,
      employeeName,
      reviewerName: review.reviewer.name ?? review.reviewer.email,
      signertAvAnsatt: review.signertAvAnsatt,
      signertAvLeder: review.signertAvLeder,
      ansattSignertAt: review.ansattSignertAt,
      lederSignertAt: review.lederSignertAt,
      oppsummeringKommentar: review.oppsummeringKommentar,
      lederTilbakemeldingTilAnsatt: review.lederTilbakemeldingTilAnsatt,
      ansattTilbakemeldingTilLeder: review.ansattTilbakemeldingTilLeder,
      ansattForberedelse: review.ansattForberedelse,
      goals: review.goals,
      actions: review.actions,
    },
    review.tenant.name,
  );

  const pdfBuffer = await generateDocumentPdf({
    ...document.config,
    generatedAt: new Date(),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.fileName}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
