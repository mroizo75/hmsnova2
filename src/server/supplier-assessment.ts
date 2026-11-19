import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  legacySupplierQuestions,
  parseSupplierQuestions,
  validateSupplierResponse,
} from "@/lib/supplier-management";

export async function submitSupplierAssessment(
  token: string,
  input: { respondentName: string; respondentEmail: string; answers: { questionId: string; value: string }[] },
) {
  const assessment = await prisma.supplierAssessment.findUnique({ where: { token } });
  if (!assessment || assessment.status !== "SENT") {
    return { success: false as const, error: "Lenken er ikke lenger aktiv." };
  }
  const questions = parseSupplierQuestions(assessment.questionsSnapshot) ?? legacySupplierQuestions(assessment.worksOnSite);
  const check = validateSupplierResponse({
    respondentName: input.respondentName,
    respondentEmail: input.respondentEmail,
    questions,
    answers: input.answers,
  });
  if (check.ok === false) return { success: false as const, error: check.message };

  await prisma.supplierAssessment.update({
    where: { id: assessment.id },
    data: {
      status: "ANSWERED",
      respondentName: input.respondentName.trim(),
      respondentEmail: input.respondentEmail.trim().toLowerCase(),
      answersSnapshot: JSON.stringify(check.lines),
      answeredAt: new Date(),
    },
  });
  revalidatePath(`/dashboard/leverandorer/${assessment.supplierId}`);
  revalidatePath("/dashboard/leverandorer");
  return { success: true as const };
}
