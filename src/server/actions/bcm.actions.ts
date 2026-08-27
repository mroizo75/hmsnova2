"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.tenantId) return null;
  return { email: session.user.email, tenantId: session.user.tenantId, userId: session.user.id };
}

export async function activateBcmTemplate(templateId: string) {
  const ctx = await getSessionContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) return { success: false, error: "Mal ikke funnet" };

  const existing = await prisma.document.findFirst({
    where: { tenantId: ctx.tenantId, templateId: template.id },
  });

  if (existing) {
    return { success: false, error: "Du har allerede opprettet et dokument fra denne malen" };
  }

  const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const doc = await prisma.document.create({
    data: {
      title: template.name,
      tenantId: ctx.tenantId,
      templateId: template.id,
      status: "DRAFT",
      kind: "PLAN",
      slug: `${slug}-${Date.now()}`,
      fileKey: "",
      ownerId: ctx.userId!,
      version: "1.0",
      planSummary: template.description ?? "",
    },
  });

  revalidatePath("/dashboard/bcm");
  revalidatePath("/dashboard/documents");
  triggerRealtimeEvent(ctx.tenantId, "document-updated");

  return { success: true, documentId: doc.id };
}

export async function submitBcmWizard(data: {
  criticalProcesses: string[];
  crisisTeam: Array<{ name: string; role: string; phone: string; email: string; substitute: string }>;
  riskScenarios: string[];
  recoveryPlan: string;
  communicationPlan: string;
  nextReviewDate: string;
}) {
  const ctx = await getSessionContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const formTemplate = await prisma.formTemplate.findFirst({
    where: { title: "Beredskapsplan — veiviser", isGlobal: true, category: "BCM" },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!formTemplate) return { success: false, error: "BCM-veivisermal ikke funnet. Kjør seed først." };

  const submission = await prisma.formSubmission.create({
    data: {
      formTemplateId: formTemplate.id,
      tenantId: ctx.tenantId,
      submittedById: ctx.userId!,
      status: "SUBMITTED",
    },
  });

  const fieldValues = [
    { fieldId: formTemplate.fields[0]?.id, value: JSON.stringify(data.criticalProcesses) },
    { fieldId: formTemplate.fields[1]?.id, value: JSON.stringify(data.crisisTeam) },
    { fieldId: formTemplate.fields[2]?.id, value: JSON.stringify(data.riskScenarios) },
    { fieldId: formTemplate.fields[3]?.id, value: data.recoveryPlan },
    { fieldId: formTemplate.fields[4]?.id, value: data.communicationPlan || "" },
    { fieldId: formTemplate.fields[5]?.id, value: data.nextReviewDate || "" },
  ].filter((fv) => fv.fieldId);

  for (const fv of fieldValues) {
    await prisma.formFieldValue.create({
      data: {
        submissionId: submission.id,
        fieldId: fv.fieldId!,
        value: fv.value,
      },
    });
  }

  const contentHtml = generateBcmPlanHtml(data);
  const planTemplate = await prisma.documentTemplate.findFirst({
    where: { name: "Gjenopprettingsplan", isGlobal: true, category: "BCM" },
  });
  await prisma.document.create({
    data: {
      title: `Beredskapsplan — ${new Date().getFullYear()}`,
      tenantId: ctx.tenantId,
      status: "DRAFT",
      kind: "PLAN",
      slug: `beredskapsplan-${Date.now()}`,
      fileKey: "",
      ownerId: ctx.userId!,
      version: "1.0",
      planSummary: contentHtml,
      templateId: planTemplate?.id ?? undefined,
    },
  });

  revalidatePath("/dashboard/bcm");
  revalidatePath("/dashboard/documents");
  triggerRealtimeEvent(ctx.tenantId, "document-updated");

  return { success: true, submissionId: submission.id };
}

function generateBcmPlanHtml(data: {
  criticalProcesses: string[];
  crisisTeam: Array<{ name: string; role: string; phone: string; email: string; substitute: string }>;
  riskScenarios: string[];
  recoveryPlan: string;
  communicationPlan: string;
  nextReviewDate: string;
}): string {
  const teamRows = data.crisisTeam
    .map(
      (m) =>
        `<tr><td>${m.name}</td><td>${m.role}</td><td>${m.phone}</td><td>${m.email}</td><td>${m.substitute}</td></tr>`,
    )
    .join("");

  return `
<h1>Beredskapsplan</h1>
<p><strong>Opprettet:</strong> ${new Date().toLocaleDateString("nb-NO")}</p>
${data.nextReviewDate ? `<p><strong>Neste gjennomgang:</strong> ${data.nextReviewDate}</p>` : ""}

<h2>1. Kritiske prosesser</h2>
<ul>${data.criticalProcesses.map((p) => `<li>${p}</li>`).join("")}</ul>

<h2>2. Kriseteam</h2>
<table>
<thead><tr><th>Navn</th><th>Rolle</th><th>Mobil</th><th>E-post</th><th>Stedfortreder</th></tr></thead>
<tbody>${teamRows}</tbody>
</table>

<h2>3. Risikoscenarier</h2>
<ul>${data.riskScenarios.map((s) => `<li>${s}</li>`).join("")}</ul>

<h2>4. Gjenopprettingstiltak</h2>
${data.recoveryPlan.split("\n").map((line) => `<p>${line}</p>`).join("")}

${data.communicationPlan ? `<h2>5. Kommunikasjonsplan</h2>${data.communicationPlan.split("\n").map((line) => `<p>${line}</p>`).join("")}` : ""}
`.trim();
}
