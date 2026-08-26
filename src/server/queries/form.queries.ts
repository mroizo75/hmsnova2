"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { resolveEffectivePermissions } from "@/lib/server-authorization";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";
import { Role } from "@prisma/client";

export async function fetchFormsList(params: {
  page: number;
  projectId: string | null;
  query: string;
  showAllTemplates: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const tenantId = session.user.tenantId;
  const { page, query, showAllTemplates } = params;
  const skip = (page - 1) * 10;

  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId,
      },
    },
    select: { role: true },
  });
  const permissions = getPermissions(userTenant?.role ?? "ANSATT");
  const tenantInfo = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { industry: true },
  });
  const tenantIndustry = tenantInfo?.industry ?? null;

  const formSearchFilter =
    query.length > 0
      ? { OR: [{ title: { contains: query } }, { description: { contains: query } }] }
      : {};

  const formsBase = await prisma.formTemplate.findMany({
    where: {
      AND: [
        { OR: [{ tenantId }, { isGlobal: true }] },
        formSearchFilter,
      ],
    },
    include: {
      _count: {
        select: {
          fields: true,
          submissions: { where: { tenantId } },
        },
      },
      submissions: {
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const scopedForms = formsBase.filter((form) =>
    tenantCanUseGlobalFormTemplate(form, tenantIndustry, { allTemplatesView: showAllTemplates })
  );
  const totalForms = scopedForms.length;

  const forms = await Promise.all(
    scopedForms.slice(skip, skip + 10).map(async (form) => {
      const restrictedGlobal = form.isGlobal && !permissions.canManageForms;
      if (!restrictedGlobal) {
        return {
          ...form,
          visibleSubmissionCount: form._count.submissions,
          latestVisibleSubmissionCreatedAt: form.submissions[0]?.createdAt ?? null,
        };
      }
      const [ownSubmissionCount, latestOwnSubmission] = await Promise.all([
        prisma.formSubmission.count({
          where: { formTemplateId: form.id, tenantId, submittedById: session.user.id },
        }),
        prisma.formSubmission.findFirst({
          where: { formTemplateId: form.id, tenantId, submittedById: session.user.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);
      return {
        ...form,
        visibleSubmissionCount: ownSubmissionCount,
        latestVisibleSubmissionCreatedAt: latestOwnSubmission?.createdAt ?? null,
      };
    })
  );

  const allFormsStats = await Promise.all(
    scopedForms.map(async (form) => {
      const restrictedGlobal = form.isGlobal && !permissions.canManageForms;
      if (!restrictedGlobal) {
        return { visibleSubmissionCount: form._count.submissions, isActive: form.isActive };
      }
      const ownSubmissionCount = await prisma.formSubmission.count({
        where: { formTemplateId: form.id, tenantId, submittedById: session.user.id },
      });
      return { visibleSubmissionCount: ownSubmissionCount, isActive: form.isActive };
    })
  );

  const totalSubmissions = allFormsStats.reduce((sum, f) => sum + f.visibleSubmissionCount, 0);
  const activeForms = allFormsStats.filter((f) => f.isActive).length;

  return JSON.parse(JSON.stringify({
    forms,
    totalForms,
    totalSubmissions,
    activeForms,
    permissions: { canManageForms: permissions.canManageForms },
  }));
}

export async function fetchFormDetail(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const tenantId = session.user.tenantId;
  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId,
      },
    },
    select: { role: true },
  });
  const permissions = await resolveEffectivePermissions(
    tenantId,
    (userTenant?.role ?? "ANSATT") as Role
  );

  const form = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: {
        select: {
          submissions: { where: { tenantId } },
        },
      },
    },
  });

  if (!form) return null;
  if (form.tenantId && form.tenantId !== tenantId) return null;

  const restrictedGlobalView = form.isGlobal && !permissions.canManageForms;
  const ownSubmissionsOnly = restrictedGlobalView || !permissions.canReadAllFormSubmissions;

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formTemplateId: id,
      tenantId,
      ...(ownSubmissionsOnly ? { submittedById: session.user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      fieldValues: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, code: true } },
    },
  });

  const submittedByIds = submissions
    .map((s) => s.submittedById)
    .filter((id): id is string => id != null);
  const userTenants =
    submittedByIds.length > 0
      ? await prisma.userTenant.findMany({
          where: { userId: { in: submittedByIds }, tenantId },
          select: { userId: true, displayName: true },
        })
      : [];

  const visibleSubmissionCount = ownSubmissionsOnly
    ? await prisma.formSubmission.count({
        where: { formTemplateId: id, tenantId, submittedById: session.user.id },
      })
    : form._count.submissions;

  const allSubmissions = await prisma.formSubmission.findMany({
    where: {
      formTemplateId: id,
      tenantId,
      ...(ownSubmissionsOnly ? { submittedById: session.user.id } : {}),
    },
    select: { createdAt: true, status: true },
  });

  return JSON.parse(JSON.stringify({
    form,
    submissions,
    userTenants,
    visibleSubmissionCount,
    allSubmissions,
    restrictedGlobalView,
    permissions: {
      canManageForms: permissions.canManageForms,
      canReadAllFormSubmissions: permissions.canReadAllFormSubmissions,
    },
  }));
}

export async function fetchFormSubmissionDetail(formId: string, submissionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;

  const tenantId = session.user.tenantId;
  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId,
      },
    },
    select: { role: true },
  });
  const permissions = getPermissions(userTenant?.role ?? "ANSATT");

  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId, tenantId },
    include: {
      fieldValues: true,
      submittedBy: { select: { name: true, email: true } },
      project: { select: { id: true, name: true, code: true } },
      formTemplate: {
        include: {
          fields: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!submission || submission.formTemplateId !== formId) return null;

  const restrictedGlobalView =
    submission.formTemplate.isGlobal && !permissions.canManageForms;
  if (restrictedGlobalView && submission.submittedById !== session.user.id) return null;

  return JSON.parse(JSON.stringify(submission));
}
