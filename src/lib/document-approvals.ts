export type ApprovalOwner = {
  id: string;
  name: string | null;
  email: string | null;
};

export type PendingApprovalDocument = {
  id: string;
  title: string;
  kind: string;
  version: string;
  owner: ApprovalOwner | null;
};

export type PendingApprovalGroup = {
  key: string;
  ownerId: string | null;
  label: string;
  waitingOnYou: boolean;
  unassigned: boolean;
  documents: PendingApprovalDocument[];
};

/** Hvem som skal ha varsel når et dokument venter på godkjenning. */
export function approvalNotificationUserIds(input: {
  ownerId: string | null;
  actorUserId: string | null;
  approverUserIds: string[];
}): string[] {
  const ids = new Set<string>();
  if (input.ownerId) {
    ids.add(input.ownerId);
  } else {
    for (const id of input.approverUserIds) {
      if (id) ids.add(id);
    }
  }
  if (input.actorUserId) ids.add(input.actorUserId);
  return [...ids];
}

export function ownerDisplayName(owner: ApprovalOwner | null | undefined): string | null {
  if (!owner) return null;
  const name = owner.name?.trim();
  if (name) return name;
  const email = owner.email?.trim();
  return email || null;
}

/** ISO 9001:2015 pkt. 7.5: dokumentert informasjon skal godkjennes før bruk. */
export function groupPendingApprovals<T extends PendingApprovalDocument>(
  documents: T[],
  currentUserId: string,
): Array<PendingApprovalGroup & { documents: T[] }> {
  const groups = new Map<string, PendingApprovalGroup & { documents: T[] }>();

  for (const document of documents) {
    const ownerId = document.owner?.id ?? null;
    const key = ownerId ?? "unassigned";
    const waitingOnYou = ownerId !== null && ownerId === currentUserId;
    const existing = groups.get(key);
    if (existing) {
      existing.documents.push(document);
      continue;
    }
    groups.set(key, {
      key,
      ownerId,
      label: ownerDisplayName(document.owner) ?? "",
      waitingOnYou,
      unassigned: ownerId === null,
      documents: [document],
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.waitingOnYou !== b.waitingOnYou) return a.waitingOnYou ? -1 : 1;
    if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
    return a.label.localeCompare(b.label, "nb");
  });
}
