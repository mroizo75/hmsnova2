import { prisma } from "@/lib/db";
import { membershipRoles, parseExtraRoles } from "@/lib/extra-roles";
import { getRoleDisplayName } from "@/lib/permissions";
import { getAuthContext } from "@/lib/server-authorization";
import {
  accessLabel,
  readIdList,
  userCanFillChecklist,
  userCanViewChecklistRun,
  type ChecklistAccessMode,
} from "@/features/checklists/lib/checklist-access";

export interface ChecklistMemberOption {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
}

export interface ChecklistOverviewItem {
  id: string;
  title: string;
  description: string | null;
  usageNote: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  accessLabel: string;
  itemCount: number;
  updatedAt: string;
  lastSubmittedAt: string | null;
  deviationsLast30Days: number;
  canFill: boolean;
}

export interface ChecklistRecentRun {
  id: string;
  checklistId: string;
  checklistTitle: string;
  reference: string;
  submittedAt: string;
  submittedByName: string;
  location: string | null;
  okCount: number;
  deviationCount: number;
  notApplicableCount: number;
}

export interface ChecklistBuilderData {
  id?: string;
  title: string;
  description: string;
  usageNote: string;
  status: "DRAFT" | "ACTIVE";
  access: ChecklistAccessMode;
  allowedRoles: string[];
  allowedUserIds: string[];
  resultRecipientIds: string[];
  sections: Array<{
    title: string;
    items: Array<{ prompt: string; helpText: string; required: boolean }>;
  }>;
  members: ChecklistMemberOption[];
  roles: Array<{ value: string; label: string }>;
}

export interface ChecklistFillData {
  id: string;
  title: string;
  description: string | null;
  usageNote: string | null;
  sections: Array<{
    title: string;
    items: Array<{ id: string; prompt: string; helpText: string | null; required: boolean }>;
  }>;
}

export interface ChecklistRunView {
  id: string;
  checklistId: string;
  checklistTitle: string;
  reference: string;
  submittedAt: string;
  submittedByName: string;
  location: string | null;
  note: string | null;
  okCount: number;
  deviationCount: number;
  notApplicableCount: number;
  recipients: string[];
  answers: Array<{
    sectionTitle: string;
    prompt: string;
    response: "OK" | "DEVIATION" | "NOT_APPLICABLE";
    comment: string | null;
  }>;
}

const ROLE_OPTIONS = [
  "ADMIN",
  "HMS",
  "LEDER",
  "VERNEOMBUD",
  "ANSATT",
  "HR",
  "BHT",
  "REVISOR",
] as const;

async function loadMembers(tenantId: string): Promise<ChecklistMemberOption[]> {
  const rows = await prisma.userTenant.findMany({
    where: { tenantId },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name?.trim() || row.user.email,
    role: row.role,
    roleLabel: getRoleDisplayName(row.role),
  }));
}

function canSeeRun(
  run: { submittedById: string; checklist: { resultRecipientIds: unknown } },
  userId: string,
  canManage: boolean,
) {
  return userCanViewChecklistRun({
    userId,
    submittedById: run.submittedById,
    resultRecipientIds: readIdList(run.checklist.resultRecipientIds),
    canManage,
  });
}

export async function fetchChecklistOverview() {
  const auth = await getAuthContext();
  if (!auth) return null;
  if (!auth.permissions.canReadChecklists && !auth.permissions.canFillChecklists) {
    return { denied: true as const };
  }

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: auth.userId, tenantId: auth.tenantId } },
    select: { extraRoles: true },
  });
  const roles = membershipRoles(auth.role, parseExtraRoles(membership?.extraRoles, auth.role));
  const canManage = auth.permissions.canManageChecklists;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [checklists, runs] = await Promise.all([
    prisma.checklist.findMany({
      where: { tenantId: auth.tenantId, ...(canManage ? {} : { status: "ACTIVE" }) },
      include: {
        sections: { include: { items: { select: { id: true } } } },
        runs: {
          where: { submittedAt: { gte: since } },
          select: { submittedAt: true, deviationCount: true, submittedById: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.checklistRun.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        checklist: { select: { id: true, title: true, resultRecipientIds: true } },
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 80,
    }),
  ]);

  const visible = checklists.filter((checklist) =>
    canManage
      ? true
      : userCanFillChecklist({
          access: checklist.access,
          allowedRoles: readIdList(checklist.allowedRoles),
          allowedUserIds: readIdList(checklist.allowedUserIds),
          userId: auth.userId,
          roles,
          canManage: false,
        }),
  );

  const items: ChecklistOverviewItem[] = visible.map((checklist) => {
    const ownRuns = canManage
      ? checklist.runs
      : checklist.runs.filter(
          (run) =>
            run.submittedById === auth.userId ||
            readIdList(checklist.resultRecipientIds).includes(auth.userId),
        );
    const last = ownRuns.reduce<Date | null>(
      (latest, run) => (!latest || run.submittedAt > latest ? run.submittedAt : latest),
      null,
    );
    return {
      id: checklist.id,
      title: checklist.title,
      description: checklist.description,
      usageNote: checklist.usageNote,
      status: checklist.status,
      accessLabel: accessLabel(
        checklist.access,
        readIdList(checklist.allowedRoles).length,
        readIdList(checklist.allowedUserIds).length,
      ),
      itemCount: checklist.sections.reduce((sum, section) => sum + section.items.length, 0),
      updatedAt: checklist.updatedAt.toISOString(),
      lastSubmittedAt: last?.toISOString() ?? null,
      deviationsLast30Days: ownRuns.reduce((sum, run) => sum + run.deviationCount, 0),
      canFill: checklist.status !== "ARCHIVED",
    };
  });

  const recentRuns: ChecklistRecentRun[] = runs
    .filter((run) => canSeeRun(run, auth.userId, canManage))
    .slice(0, 8)
    .map((run) => ({
      id: run.id,
      checklistId: run.checklistId,
      checklistTitle: run.checklist.title,
      reference: run.reference,
      submittedAt: run.submittedAt.toISOString(),
      submittedByName: run.submittedBy.name?.trim() || run.submittedBy.email,
      location: run.location,
      okCount: run.okCount,
      deviationCount: run.deviationCount,
      notApplicableCount: run.notApplicableCount,
    }));

  return {
    denied: false as const,
    canManage,
    items,
    recentRuns,
    activeCount: items.filter((item) => item.status === "ACTIVE").length,
    deviationCount: items.reduce((sum, item) => sum + item.deviationsLast30Days, 0),
  };
}

export async function fetchChecklistBuilder(id?: string): Promise<ChecklistBuilderData | null> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canManageChecklists) return null;
  const members = await loadMembers(auth.tenantId);
  const roles = ROLE_OPTIONS.map((value) => ({ value, label: getRoleDisplayName(value) }));
  if (!id) {
    return {
      title: "",
      description: "",
      usageNote: "",
      status: "DRAFT",
      access: "ALL",
      allowedRoles: [],
      allowedUserIds: [],
      resultRecipientIds: [auth.userId],
      sections: [{ title: "Kontrollpunkter", items: [{ prompt: "", helpText: "", required: true }] }],
      members,
      roles,
    };
  }

  const checklist = await prisma.checklist.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!checklist || checklist.status === "ARCHIVED") return null;
  return {
    id: checklist.id,
    title: checklist.title,
    description: checklist.description ?? "",
    usageNote: checklist.usageNote ?? "",
    status: checklist.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
    access: checklist.access,
    allowedRoles: readIdList(checklist.allowedRoles),
    allowedUserIds: readIdList(checklist.allowedUserIds),
    resultRecipientIds: readIdList(checklist.resultRecipientIds),
    sections: checklist.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        prompt: item.prompt,
        helpText: item.helpText ?? "",
        required: item.required,
      })),
    })),
    members,
    roles,
  };
}

export async function fetchChecklistFill(id: string): Promise<ChecklistFillData | null | "denied"> {
  const auth = await getAuthContext();
  if (!auth) return null;
  if (!auth.permissions.canFillChecklists && !auth.permissions.canManageChecklists) return "denied";

  const checklist = await prisma.checklist.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!checklist || checklist.status === "ARCHIVED") return null;
  if (checklist.status === "DRAFT" && !auth.permissions.canManageChecklists) return "denied";

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: auth.userId, tenantId: auth.tenantId } },
    select: { extraRoles: true },
  });
  const roles = membershipRoles(auth.role, parseExtraRoles(membership?.extraRoles, auth.role));
  const allowed = userCanFillChecklist({
    access: checklist.access,
    allowedRoles: readIdList(checklist.allowedRoles),
    allowedUserIds: readIdList(checklist.allowedUserIds),
    userId: auth.userId,
    roles,
    canManage: auth.permissions.canManageChecklists,
  });
  if (!allowed) return "denied";

  return {
    id: checklist.id,
    title: checklist.title,
    description: checklist.description,
    usageNote: checklist.usageNote,
    sections: checklist.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        helpText: item.helpText,
        required: item.required,
      })),
    })),
  };
}

export async function fetchChecklistDetail(id: string) {
  const auth = await getAuthContext();
  if (!auth) return null;
  const checklist = await prisma.checklist.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      sections: { include: { items: { select: { id: true } } } },
      createdBy: { select: { name: true, email: true } },
      runs: {
        include: { submittedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { submittedAt: "desc" },
        take: 40,
      },
    },
  });
  if (!checklist) return null;

  const canManage = auth.permissions.canManageChecklists;
  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: auth.userId, tenantId: auth.tenantId } },
    select: { extraRoles: true },
  });
  const roles = membershipRoles(auth.role, parseExtraRoles(membership?.extraRoles, auth.role));
  const canFill =
    checklist.status !== "ARCHIVED" &&
    userCanFillChecklist({
      access: checklist.access,
      allowedRoles: readIdList(checklist.allowedRoles),
      allowedUserIds: readIdList(checklist.allowedUserIds),
      userId: auth.userId,
      roles,
      canManage,
    });
  if (!canManage && !canFill && !readIdList(checklist.resultRecipientIds).includes(auth.userId)) {
    return "denied" as const;
  }

  const members = await loadMembers(auth.tenantId);
  const recipientIds = readIdList(checklist.resultRecipientIds);
  return {
    canManage,
    canFill,
    id: checklist.id,
    title: checklist.title,
    description: checklist.description,
    usageNote: checklist.usageNote,
    status: checklist.status,
    accessLabel: accessLabel(
      checklist.access,
      readIdList(checklist.allowedRoles).length,
      readIdList(checklist.allowedUserIds).length,
    ),
    itemCount: checklist.sections.reduce((sum, section) => sum + section.items.length, 0),
    createdByName: checklist.createdBy.name?.trim() || checklist.createdBy.email,
    recipients: members.filter((member) => recipientIds.includes(member.id)).map((member) => member.name),
    runs: checklist.runs
      .filter((run) =>
        userCanViewChecklistRun({
          userId: auth.userId,
          submittedById: run.submittedById,
          resultRecipientIds: recipientIds,
          canManage,
        }),
      )
      .map((run) => ({
        id: run.id,
        reference: run.reference,
        submittedAt: run.submittedAt.toISOString(),
        submittedByName: run.submittedBy.name?.trim() || run.submittedBy.email,
        location: run.location,
        okCount: run.okCount,
        deviationCount: run.deviationCount,
        notApplicableCount: run.notApplicableCount,
      })),
  };
}

export async function fetchChecklistRun(checklistId: string, runId: string): Promise<ChecklistRunView | null | "denied"> {
  const auth = await getAuthContext();
  if (!auth) return null;
  const run = await prisma.checklistRun.findFirst({
    where: { id: runId, checklistId, tenantId: auth.tenantId },
    include: {
      checklist: { select: { title: true, resultRecipientIds: true } },
      submittedBy: { select: { name: true, email: true } },
      answers: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!run) return null;
  const recipientIds = readIdList(run.checklist.resultRecipientIds);
  if (
    !userCanViewChecklistRun({
      userId: auth.userId,
      submittedById: run.submittedById,
      resultRecipientIds: recipientIds,
      canManage: auth.permissions.canManageChecklists,
    })
  ) {
    return "denied";
  }
  const members = await loadMembers(auth.tenantId);
  return {
    id: run.id,
    checklistId: run.checklistId,
    checklistTitle: run.checklist.title,
    reference: run.reference,
    submittedAt: run.submittedAt.toISOString(),
    submittedByName: run.submittedBy.name?.trim() || run.submittedBy.email,
    location: run.location,
    note: run.note,
    okCount: run.okCount,
    deviationCount: run.deviationCount,
    notApplicableCount: run.notApplicableCount,
    recipients: members.filter((member) => recipientIds.includes(member.id)).map((member) => member.name),
    answers: run.answers.map((answer) => ({
      sectionTitle: answer.sectionTitle,
      prompt: answer.prompt,
      response: answer.response,
      comment: answer.comment,
    })),
  };
}
