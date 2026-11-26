"use server";

/**
 * Server actions for personalarkiv.
 * Hjemmel: GDPR art. 5, 6, 15 og 17. AML § 14-5/14-6.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext, type AuthContext } from "@/lib/server-authorization";
import { generatePersonnelFileKey, getStorage } from "@/lib/storage";
import {
  DeletePersonnelDocumentSchema,
  UpdatePersonnelDocumentSchema,
  type DeletePersonnelDocumentInput,
  type UpdatePersonnelDocumentInput,
} from "@/features/personnel/schemas/personnel.schema";
import {
  canAccessPersonnelFile,
  personnelCategoryFromHrTemplate,
  personnelLegalRefForHrTemplate,
} from "@/features/personnel/lib/personnel-categories";
import {
  defaultHrMergeValues,
  hrMergeFields,
  mergeHrDocumentHtml,
  templateVariableKeys,
  validateHrMergeValues,
  type HrMergeContext,
  type HrMergeField,
} from "@/lib/hr-document-merge";
import { isHrDocumentCategory } from "@/lib/document-module-scope";
import { generateDocumentPdf } from "@/lib/pdf-brand";
import { buildDocumentTemplatePdfSections, slugifyDocumentTitle } from "@/lib/template-copy";

function revalidatePersonnel(userId: string) {
  revalidatePath("/dashboard/personalarkiv");
  revalidatePath(`/dashboard/personalarkiv/${userId}`);
  revalidatePath("/ansatt/personalmappe");
}

async function canAccessEmployeeFolder(auth: AuthContext, employeeId: string): Promise<boolean> {
  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: employeeId, tenantId: auth.tenantId } },
    select: { departmentId: true },
  });
  if (!membership) return false;

  return canAccessPersonnelFile({
    viewerId: auth.userId,
    employeeId,
    canReadOwn: auth.permissions.canReadOwnPersonnelFile,
    canReadAll: auth.permissions.canReadAllPersonnelFiles,
    canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
    viewerDepartmentId: auth.departmentId,
    employeeDepartmentId: membership.departmentId,
  });
}

async function loadHrMergeContext(tenantId: string, userId: string): Promise<HrMergeContext | null> {
  const [tenant, membership] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        orgNumber: true,
        address: true,
        postalCode: true,
        city: true,
        contactPerson: true,
      },
    }),
    prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        user: { select: { name: true, email: true } },
        hrProfile: { select: { dateOfBirth: true, startedAt: true } },
        orgDepartment: { select: { name: true } },
      },
    }),
  ]);
  if (!tenant || !membership) return null;

  return {
    tenantName: tenant.name,
    orgNumber: tenant.orgNumber,
    address: tenant.address,
    postalCode: tenant.postalCode,
    city: tenant.city,
    contactPerson: tenant.contactPerson,
    employeeName: membership.user.name ?? membership.user.email,
    dateOfBirth: membership.hrProfile?.dateOfBirth ?? null,
    position: membership.position,
    workplace: membership.orgDepartment?.name ?? membership.department,
    startedAt: membership.hrProfile?.startedAt ?? null,
  };
}

export async function getHrDocumentMergeFields(input: {
  userId: string;
  templateId: string;
}): Promise<{ success: true; data: { fields: HrMergeField[] } } | { success: false; error: string }> {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canUploadPersonnelFile) {
      return { success: false, error: "Du har ikke tilgang til å laste opp til personalarkivet" };
    }

    const userId = input.userId.trim();
    const templateId = input.templateId.trim();
    if (!userId || !templateId) {
      return { success: false, error: "Ansatt og mal er påkrevd" };
    }

    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
      select: { departmentId: true },
    });
    if (!membership) return { success: false, error: "Ansatt ikke funnet i denne bedriften" };

    const allowed = canAccessPersonnelFile({
      viewerId: auth.userId,
      employeeId: userId,
      canReadOwn: auth.permissions.canReadOwnPersonnelFile,
      canReadAll: auth.permissions.canReadAllPersonnelFiles,
      canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
      viewerDepartmentId: auth.departmentId,
      employeeDepartmentId: membership.departmentId,
    });
    if (!allowed) return { success: false, error: "Du har ikke tilgang til denne personalmappen" };

    const template = await prisma.documentTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: auth.tenantId }, { isGlobal: true, tenantId: null }],
      },
    });
    if (!template || !isHrDocumentCategory(template.category)) {
      return { success: false, error: "HR-mal ikke funnet" };
    }

    const context = await loadHrMergeContext(auth.tenantId, userId);
    if (!context) return { success: false, error: "Ansatt ikke funnet i denne bedriften" };

    const keys = templateVariableKeys(template.variables, template.bodyHtml);
    return { success: true, data: { fields: hrMergeFields(keys, defaultHrMergeValues(keys, context)) } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente feltene i malen";
    return { success: false, error: message };
  }
}

export async function createPersonnelDocumentFromTemplate(input: {
  userId: string;
  templateId: string;
  values?: Record<string, string>;
}) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canUploadPersonnelFile) {
      return { success: false as const, error: "Du har ikke tilgang til å laste opp til personalarkivet" };
    }

    const userId = input.userId.trim();
    const templateId = input.templateId.trim();
    if (!userId || !templateId) {
      return { success: false as const, error: "Ansatt og mal er påkrevd" };
    }

    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!membership) {
      return { success: false as const, error: "Ansatt ikke funnet i denne bedriften" };
    }

    const allowed = canAccessPersonnelFile({
      viewerId: auth.userId,
      employeeId: userId,
      canReadOwn: auth.permissions.canReadOwnPersonnelFile,
      canReadAll: auth.permissions.canReadAllPersonnelFiles,
      canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
      viewerDepartmentId: auth.departmentId,
      employeeDepartmentId: membership.departmentId,
    });
    if (!allowed) {
      return { success: false as const, error: "Du har ikke tilgang til denne personalmappen" };
    }

    const template = await prisma.documentTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: auth.tenantId }, { isGlobal: true, tenantId: null }],
      },
    });
    if (!template || !isHrDocumentCategory(template.category)) {
      return { success: false as const, error: "HR-mal ikke funnet" };
    }

    const [tenant, mergeContext] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { name: true, orgNumber: true, address: true, logoUrl: true },
      }),
      loadHrMergeContext(auth.tenantId, userId),
    ]);
    if (!mergeContext) {
      return { success: false as const, error: "Ansatt ikke funnet i denne bedriften" };
    }

    const keys = templateVariableKeys(template.variables, template.bodyHtml);
    const values = defaultHrMergeValues(keys, mergeContext);
    for (const key of keys) {
      const override = input.values?.[key];
      if (typeof override === "string") values[key] = override.trim();
    }
    const mergeError = validateHrMergeValues(keys, values);
    if (mergeError) return { success: false as const, error: mergeError };

    const category = personnelCategoryFromHrTemplate(template.name);
    const legalRef = personnelLegalRefForHrTemplate(template.name);
    const employeeName = membership.user.name ?? membership.user.email;
    const title = `${template.name} – ${employeeName}`;
    const pdfBuffer = await generateDocumentPdf({
      title: template.name,
      subtitle: employeeName,
      reportLabel: "HR-dokument",
      tenant: {
        name: tenant?.name ?? "Bedrift",
        orgNumber: tenant?.orgNumber,
        address: tenant?.address,
        logoUrl: tenant?.logoUrl,
      },
      generatedBy: auth.userEmail,
      legalReference: legalRef,
      sections: buildDocumentTemplatePdfSections({
        description: template.description,
        bodyHtml: template.bodyHtml ? mergeHrDocumentHtml(template.bodyHtml, keys, values) : null,
        pdcaGuidance: template.pdcaGuidance,
      }),
    });

    const fileName = `${slugifyDocumentTitle(template.name)}.pdf`;
    const fileKey = generatePersonnelFileKey(auth.tenantId, userId, category, fileName);
    const storage = getStorage();
    await storage.upload(fileKey, new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }));

    const document = await prisma.personnelDocument.create({
      data: {
        tenantId: auth.tenantId,
        userId,
        category,
        title,
        fileKey,
        fileName,
        mime: "application/pdf",
        fileSize: pdfBuffer.length,
        legalRef,
        uploadedById: auth.userId,
      },
    });

    revalidatePersonnel(userId);
    return { success: true as const, data: { id: document.id, title: document.title } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke opprette dokument fra mal";
    return { success: false as const, error: message };
  }
}

export async function updatePersonnelDocument(input: UpdatePersonnelDocumentInput) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canUploadPersonnelFile) {
      return { success: false as const, error: "Du har ikke tilgang til å endre personalmapper" };
    }

    const validated = UpdatePersonnelDocumentSchema.parse(input);

    const existing = await prisma.personnelDocument.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return { success: false as const, error: "Dokumentet ble ikke funnet" };
    }

    if (!(await canAccessEmployeeFolder(auth, existing.userId))) {
      return { success: false as const, error: "Du har ikke tilgang til denne personalmappen" };
    }

    await prisma.personnelDocument.update({
      where: { id: existing.id },
      data: {
        title: validated.title ?? existing.title,
        notes: validated.notes ?? existing.notes,
        retainUntil:
          validated.retainUntil === undefined
            ? existing.retainUntil
            : validated.retainUntil
              ? new Date(validated.retainUntil)
              : null,
      },
    });

    revalidatePersonnel(existing.userId);
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke oppdatere dokument";
    return { success: false as const, error: message };
  }
}

export async function deletePersonnelDocument(input: DeletePersonnelDocumentInput) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canDeletePersonnelFile) {
      return { success: false as const, error: "Du har ikke tilgang til å slette personalmapper" };
    }

    const validated = DeletePersonnelDocumentSchema.parse(input);

    const existing = await prisma.personnelDocument.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return { success: false as const, error: "Dokumentet ble ikke funnet" };
    }

    if (!(await canAccessEmployeeFolder(auth, existing.userId))) {
      return { success: false as const, error: "Du har ikke tilgang til denne personalmappen" };
    }

    const storage = getStorage();
    await storage.delete(existing.fileKey);

    await prisma.personnelDocument.delete({
      where: { id: existing.id },
    });

    revalidatePersonnel(existing.userId);
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette dokument";
    return { success: false as const, error: message };
  }
}
