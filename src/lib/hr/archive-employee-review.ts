import { prisma } from "@/lib/db";
import { generateDocumentPdf } from "@/lib/pdf-brand";
import { generatePersonnelFileKey, getStorage } from "@/lib/storage";
import { buildReviewDocument, bothPartiesConfirmed } from "@/features/employee-reviews/lib/review-document";

/**
 * Lagrer bekreftet samtale i personalmappen.
 * AML § 4-6 (5): deltakelse skal kunne dokumenteres.
 * GDPR art. 5: samme opplysninger, ett sted, med tilgangsstyring på mappen.
 */
export async function archiveSignedEmployeeReview(reviewId: string, uploadedById: string): Promise<string> {
  const review = await prisma.employeeReview.findUnique({
    where: { id: reviewId },
    include: {
      employee: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
      goals: { select: { description: true, status: true } },
      actions: { select: { description: true, ansvarlig: true } },
      tenant: { select: { name: true } },
    },
  });
  if (!review) throw new Error("Samtalen ble ikke funnet");
  if (review.personnelDocumentId) return review.personnelDocumentId;
  if (!bothPartiesConfirmed(review)) {
    throw new Error("Begge parter må bekrefte før dokumentet legges i personalmappen");
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
    tenant: { name: review.tenant.name },
    generatedAt: new Date(),
  });

  const title = `${document.title} – ${employeeName}`;
  const fileKey = generatePersonnelFileKey(review.tenantId, review.employeeId, "CORRESPONDENCE", document.fileName);
  await getStorage().upload(fileKey, new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }));

  const stored = await prisma.personnelDocument.create({
    data: {
      tenantId: review.tenantId,
      userId: review.employeeId,
      category: "CORRESPONDENCE",
      title,
      fileKey,
      fileName: document.fileName,
      mime: "application/pdf",
      fileSize: pdfBuffer.length,
      legalRef: document.legalRef,
      notes: `Bekreftet samtale ${review.id}. Begge parter har bekreftet i systemet.`,
      uploadedById,
    },
  });

  await prisma.employeeReview.update({
    where: { id: review.id },
    data: { personnelDocumentId: stored.id },
  });

  return stored.id;
}
