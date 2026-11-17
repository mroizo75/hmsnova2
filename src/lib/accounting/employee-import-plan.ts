/**
 * GDPR art. 6 nr. 1 bokstav b: bare navn, e-post og ansattnummer,
 * det som trengs for å opprette innlogging i arbeidsforholdet.
 */
export type TripletexEmployeeImportRow = {
  externalId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  employeeNumber?: string | null;
};

export type TenantMemberMatch = {
  userId: string;
  email: string;
  externalEmployeeId: string | null;
  employeeNumber: string | null;
};

export type PlannedEmployeeInvite = {
  externalId: string;
  email: string;
  name: string;
  employeeNumber: string | null;
};

export type PlannedEmployeeLink = PlannedEmployeeInvite & {
  userId: string;
  fillEmployeeNumber: boolean;
};

export function planTripletexEmployeeActivation(input: {
  employees: TripletexEmployeeImportRow[];
  members: TenantMemberMatch[];
}): {
  toInvite: PlannedEmployeeInvite[];
  toLink: PlannedEmployeeLink[];
  skippedNoEmail: number;
  alreadyActive: number;
} {
  const byEmail = new Map(input.members.map((member) => [member.email.toLowerCase(), member]));
  const linkedIds = new Set(
    input.members.map((member) => member.externalEmployeeId).filter((id): id is string => Boolean(id))
  );
  const seenEmail = new Set<string>();
  const toInvite: PlannedEmployeeInvite[] = [];
  const toLink: PlannedEmployeeLink[] = [];
  let skippedNoEmail = 0;
  let alreadyActive = 0;

  for (const employee of input.employees) {
    const email = employee.email?.trim().toLowerCase() ?? "";
    if (!email.includes("@")) {
      skippedNoEmail += 1;
      continue;
    }
    if (seenEmail.has(email)) continue;
    seenEmail.add(email);

    const name =
      [employee.firstName, employee.lastName].filter((part) => part && part.trim()).join(" ") || email;
    const employeeNumber = employee.employeeNumber?.trim() || null;
    const planned = {
      externalId: employee.externalId,
      email,
      name,
      employeeNumber,
    };
    const member = byEmail.get(email);

    if (!member) {
      if (linkedIds.has(employee.externalId)) {
        alreadyActive += 1;
        continue;
      }
      toInvite.push(planned);
      continue;
    }

    if (member.externalEmployeeId === employee.externalId) {
      alreadyActive += 1;
      continue;
    }
    if (member.externalEmployeeId) {
      alreadyActive += 1;
      continue;
    }
    toLink.push({
      ...planned,
      userId: member.userId,
      fillEmployeeNumber: !member.employeeNumber && Boolean(employeeNumber),
    });
  }

  return { toInvite, toLink, skippedNoEmail, alreadyActive };
}
