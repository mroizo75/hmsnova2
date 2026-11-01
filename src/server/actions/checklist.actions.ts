"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { validateFileSize, validateImageFile } from "@/lib/file-validation";
import { generateSequenceNumber } from "@/lib/sequence";
import { generateFileKey, getStorage } from "@/lib/storage";
import { membershipRoles, parseExtraRoles } from "@/lib/extra-roles";
import { getAuthContext } from "@/lib/server-authorization";
import { createNotification } from "@/server/actions/notification.actions";
import {
  nextChecklistReference,
  readIdList,
  summarizeChecklistResponses,
  userCanFillChecklist,
} from "@/features/checklists/lib/checklist-access";
import {
  saveChecklistSchema,
  submitChecklistSchema,
  type SaveChecklistInput,
  type SubmitChecklistInput,
} from "@/features/checklists/schemas/checklist.schema";

const ROLES = new Set<string>(Object.values(Role));

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function cleanText(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

async function membershipRolesFor(userId: string, tenantId: string, primary: Role) {
  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { extraRoles: true },
  });
  return membershipRoles(primary, parseExtraRoles(membership?.extraRoles, primary));
}

export async function saveChecklist(input: SaveChecklistInput) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    if (!auth.permissions.canManageChecklists) {
      return { success: false as const, error: "Du kan ikke lage sjekklister" };
    }

    const data = saveChecklistSchema.parse(input);
    const members = await prisma.userTenant.findMany({
      where: { tenantId: auth.tenantId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((member) => member.userId));
    const allowedUserIds = [...new Set(data.allowedUserIds)].filter((id) => memberIds.has(id));
    const resultRecipientIds = [...new Set(data.resultRecipientIds)].filter((id) => memberIds.has(id));
    const allowedRoles = [...new Set(data.allowedRoles)].filter((role) => ROLES.has(role));

    if (data.status === "ACTIVE" && resultRecipientIds.length === 0) {
      return { success: false as const, error: "Velg minst én person i bedriften som skal få resultatet" };
    }
    if ((data.access === "USERS" || data.access === "ROLES_AND_USERS") && allowedUserIds.length === 0) {
      return { success: false as const, error: "Velg minst én person som skal kunne fylle ut" };
    }
    if ((data.access === "ROLES" || data.access === "ROLES_AND_USERS") && allowedRoles.length === 0) {
      return { success: false as const, error: "Velg minst én gyldig rolle" };
    }

    if (data.id) {
      const existing = await prisma.checklist.findFirst({
        where: { id: data.id, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!existing) return { success: false as const, error: "Sjekklisten finnes ikke" };
    }

    const saved = await prisma.$transaction(async (tx) => {
      const payload = {
        title: data.title,
        description: cleanText(data.description),
        usageNote: cleanText(data.usageNote),
        status: data.status,
        access: data.access,
        allowedRoles,
        allowedUserIds,
        resultRecipientIds,
      };
      const checklist = data.id
        ? await tx.checklist.update({ where: { id: data.id }, data: payload })
        : await tx.checklist.create({
            data: { ...payload, tenantId: auth.tenantId, createdById: auth.userId },
          });

      await tx.checklistSection.deleteMany({ where: { checklistId: checklist.id } });
      for (const [sectionIndex, section] of data.sections.entries()) {
        await tx.checklistSection.create({
          data: {
            checklistId: checklist.id,
            title: section.title,
            sortOrder: sectionIndex,
            items: {
              create: section.items.map((item, itemIndex) => ({
                prompt: item.prompt,
                helpText: cleanText(item.helpText),
                required: item.required,
                sortOrder: itemIndex,
              })),
            },
          },
        });
      }
      return checklist;
    });

    revalidatePath("/dashboard/sjekklister");
    revalidatePath(`/dashboard/sjekklister/${saved.id}`);
    revalidatePath("/ansatt/sjekklister");
    return { success: true as const, id: saved.id };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre sjekklisten") };
  }
}

export async function archiveChecklist(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canManageChecklists) {
      return { success: false as const, error: "Du kan ikke arkivere sjekklister" };
    }
    const existing = await prisma.checklist.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!existing) return { success: false as const, error: "Sjekklisten finnes ikke" };
    await prisma.checklist.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/dashboard/sjekklister");
    revalidatePath(`/dashboard/sjekklister/${id}`);
    revalidatePath("/ansatt/sjekklister");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke arkivere sjekklisten") };
  }
}

export async function deleteDraftChecklist(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canManageChecklists) {
      return { success: false as const, error: "Du kan ikke slette sjekklister" };
    }
    const existing = await prisma.checklist.findFirst({
      where: { id, tenantId: auth.tenantId, status: "DRAFT" },
      select: { id: true, _count: { select: { runs: true } } },
    });
    if (!existing) return { success: false as const, error: "Bare kladder uten innsendinger kan slettes" };
    if (existing._count.runs > 0) {
      return { success: false as const, error: "Sjekklisten har innsendinger og må arkiveres" };
    }
    await prisma.checklist.delete({ where: { id } });
    revalidatePath("/dashboard/sjekklister");
    revalidatePath("/ansatt/sjekklister");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette sjekklisten") };
  }
}

export async function uploadChecklistPhoto(formData: FormData) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    if (!auth.permissions.canFillChecklists && !auth.permissions.canManageChecklists) {
      return { success: false as const, error: "Du kan ikke legge ved bilder" };
    }
    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false as const, error: "Velg et bilde" };
    const size = validateFileSize(file.size, 8);
    if (!size.isValid) return { success: false as const, error: size.error ?? "Bildet er for stort" };
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await validateImageFile(buffer);
    if (!image.isValid || !image.detectedType) {
      return { success: false as const, error: image.error ?? "Ugyldig bilde" };
    }
    const fileKey = generateFileKey(auth.tenantId, "checklists/photos", file.name || "bilde.jpg");
    await getStorage().upload(fileKey, buffer);
    return {
      success: true as const,
      photo: {
        fileKey,
        fileName: file.name || "bilde",
        mimeType: image.detectedType,
      },
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke laste opp bildet") };
  }
}

export async function submitChecklistRun(input: SubmitChecklistInput) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    if (!auth.permissions.canFillChecklists && !auth.permissions.canManageChecklists) {
      return { success: false as const, error: "Du kan ikke fylle ut sjekklister" };
    }

    const data = submitChecklistSchema.parse(input);
    const checklist = await prisma.checklist.findFirst({
      where: { id: data.checklistId, tenantId: auth.tenantId },
      include: {
        sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!checklist) return { success: false as const, error: "Sjekklisten finnes ikke" };
    if (checklist.status === "ARCHIVED") {
      return { success: false as const, error: "Sjekklisten er arkivert" };
    }
    if (checklist.status === "DRAFT" && !auth.permissions.canManageChecklists) {
      return { success: false as const, error: "Sjekklisten er ikke publisert" };
    }

    const roles = await membershipRolesFor(auth.userId, auth.tenantId, auth.role);
    const allowed = userCanFillChecklist({
      access: checklist.access,
      allowedRoles: readIdList(checklist.allowedRoles),
      allowedUserIds: readIdList(checklist.allowedUserIds),
      userId: auth.userId,
      roles,
      canManage: auth.permissions.canManageChecklists,
    });
    if (!allowed) return { success: false as const, error: "Du har ikke tilgang til denne sjekklisten" };

    const photoPrefix = `${auth.tenantId}/checklists/photos/`;
    const byItem = new Map(data.answers.map((answer) => [answer.itemId, answer]));
    const ordered: Array<{
      itemId: string;
      sectionTitle: string;
      prompt: string;
      response: "OK" | "DEVIATION" | "NOT_APPLICABLE";
      comment: string | null;
      reportIncident: boolean;
      photos: Array<{ fileKey: string; fileName: string; mimeType: string }>;
      sortOrder: number;
    }> = [];
    let sortOrder = 0;
    for (const section of checklist.sections) {
      for (const item of section.items) {
        const answer = byItem.get(item.id);
        if (!answer) {
          if (item.required) {
            return { success: false as const, error: "Alle obligatoriske punkter må besvares" };
          }
          continue;
        }
        const comment = cleanText(answer.comment);
        if (answer.response === "DEVIATION" && !comment) {
          return { success: false as const, error: "Avvik må forklares, så mottakeren vet hva som er galt" };
        }
        const reportIncident = answer.response === "DEVIATION" && answer.reportIncident === true;
        if (reportIncident && !auth.permissions.canCreateIncidents) {
          return { success: false as const, error: "Du kan ikke melde avvik" };
        }
        const photos = (answer.photos ?? []).filter(
          (photo) => photo.fileKey.startsWith(photoPrefix) && photo.mimeType.startsWith("image/"),
        );
        ordered.push({
          itemId: item.id,
          sectionTitle: section.title,
          prompt: item.prompt,
          response: answer.response,
          comment,
          reportIncident,
          photos,
          sortOrder,
        });
        sortOrder += 1;
      }
    }
    if (ordered.length === 0) {
      return { success: false as const, error: "Sjekklisten har ingen punkter" };
    }
    const storage = getStorage();
    for (const answer of ordered) {
      for (const photo of answer.photos) {
        if (!(await storage.exists(photo.fileKey))) {
          return { success: false as const, error: "Et bilde ble ikke funnet. Last det opp på nytt." };
        }
      }
    }

    const projectId = data.projectId?.trim() || null;
    const project = projectId
      ? await prisma.project.findFirst({
          where: {
            id: projectId,
            tenantId: auth.tenantId,
            isAbsenceProject: false,
            status: { in: ["ACTIVE", "PLANNING", "ON_HOLD"] },
          },
          select: { id: true },
        })
      : null;
    if (projectId && !project) {
      return { success: false as const, error: "Prosjektet finnes ikke, eller er avsluttet" };
    }

    const summary = summarizeChecklistResponses(ordered.map((answer) => answer.response));
    const year = new Date().getFullYear();
    const location = cleanText(data.location);
    const incidentNumbers: string[] = [];
    for (const answer of ordered) {
      if (!answer.reportIncident) continue;
      incidentNumbers.push(await generateSequenceNumber(auth.tenantId, "AVVIK", year));
    }
    const run = await prisma.$transaction(async (tx) => {
      const latest = await tx.checklistRun.findFirst({
        where: { tenantId: auth.tenantId, reference: { startsWith: `SJK-${year}-` } },
        orderBy: { reference: "desc" },
        select: { reference: true },
      });
      const createdRun = await tx.checklistRun.create({
        data: {
          checklistId: checklist.id,
          tenantId: auth.tenantId,
          submittedById: auth.userId,
          reference: nextChecklistReference(latest?.reference ?? null, year),
          location,
          projectId: project?.id,
          note: cleanText(data.note),
          okCount: summary.okCount,
          deviationCount: summary.deviationCount,
          notApplicableCount: summary.notApplicableCount,
        },
      });
      let incidentIndex = 0;
      for (const answer of ordered) {
        let incidentId: string | undefined;
        if (answer.reportIncident) {
          const avviksnummer = incidentNumbers[incidentIndex];
          incidentIndex += 1;
          const incident = await tx.incident.create({
            data: {
              tenantId: auth.tenantId,
              avviksnummer,
              type: "AVVIK",
              title: answer.prompt.slice(0, 180),
              description: [
                `Meldt fra sjekkliste «${checklist.title}» (${createdRun.reference}).`,
                `Bolk: ${answer.sectionTitle}.`,
                "",
                answer.comment ?? "",
              ].join("\n"),
              occurredAt: new Date(),
              reportedBy: auth.userId,
              location,
              projectId: project?.id,
              source: "CHECKLIST",
              stage: "REPORTED",
              attachments: answer.photos.length
                ? {
                    create: answer.photos.map((photo) => ({
                      tenantId: auth.tenantId,
                      fileKey: photo.fileKey,
                      name: photo.fileName,
                      mime: photo.mimeType,
                      uploadedById: auth.userId,
                    })),
                  }
                : undefined,
            },
          });
          incidentId = incident.id;
        }
        await tx.checklistAnswer.create({
          data: {
            runId: createdRun.id,
            itemId: answer.itemId,
            sectionTitle: answer.sectionTitle,
            prompt: answer.prompt,
            response: answer.response,
            comment: answer.comment,
            sortOrder: answer.sortOrder,
            incidentId,
            photos: answer.photos.length ? { create: answer.photos } : undefined,
          },
        });
      }
      return createdRun;
    }, { maxWait: 10_000, timeout: 60_000 });

    if (checklist.status === "ACTIVE") {
      const recipients = readIdList(checklist.resultRecipientIds).filter((id) => id !== auth.userId);
      const submitter = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });
      const name = submitter?.name?.trim() || "En ansatt";
      const deviationText =
        summary.deviationCount === 0
          ? "Ingen avvik."
          : summary.deviationCount === 1
            ? "1 avvik."
            : `${summary.deviationCount} avvik.`;
      await Promise.all(
        recipients.map((userId) =>
          createNotification({
            tenantId: auth.tenantId,
            userId,
            type: "FORM_SUBMITTED",
            title: summary.deviationCount > 0 ? "Sjekkliste med avvik" : "Sjekkliste sendt inn",
            message: `${name} sendte inn «${checklist.title}» (${run.reference}). ${deviationText}`,
            link: `/ansatt/sjekklister/${checklist.id}/resultat/${run.id}`,
          }).catch(() => undefined),
        ),
      );
    }

    revalidatePath("/dashboard/sjekklister");
    revalidatePath(`/dashboard/sjekklister/${checklist.id}`);
    revalidatePath("/dashboard/incidents");
    revalidatePath("/ansatt/sjekklister");
    revalidatePath("/ansatt/avvik");
    return { success: true as const, runId: run.id, reference: run.reference };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke sende inn sjekklisten") };
  }
}
