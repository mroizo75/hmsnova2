export function isoDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function earliestIsoDate(dates: Array<Date | string | null | undefined>): string | null {
  const iso = dates
    .filter((value): value is Date | string => value != null && value !== "")
    .map(isoDateOnly)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (iso.length === 0) return null;
  return iso.reduce((min, value) => (value < min ? value : min));
}

/** Tripletex avviser timer/varer før prosjektets startDate. */
export function projectStartNeedsMove(
  currentStart: string | null | undefined,
  entryDate: string
): boolean {
  if (!currentStart) return true;
  return isoDateOnly(entryDate) < isoDateOnly(currentStart);
}

export function tripletexNumericId(value?: string | null): number | null {
  if (!value || value.startsWith("local-")) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function buildTripletexProjectPayload(
  input: {
    name: string;
    startDate: string;
    customerExternalId?: string | null;
    parentExternalId?: string | null;
    description?: string | null;
    reference?: string | null;
    contactExternalId?: string | null;
  },
  projectManagerId?: string | null
): Record<string, unknown> {
  const customerId = tripletexNumericId(input.customerExternalId);
  const parentId = tripletexNumericId(input.parentExternalId);
  const managerId = tripletexNumericId(projectManagerId);
  const contactId = tripletexNumericId(input.contactExternalId);

  const body: Record<string, unknown> = {
    name: input.name,
    startDate: input.startDate.slice(0, 10),
    isInternal: !customerId,
    isClosed: false,
    isReadyForInvoicing: false,
  };
  if (customerId) body.customer = { id: customerId };
  if (parentId) body.mainProject = { id: parentId };
  if (managerId) body.projectManager = { id: managerId };
  if (contactId) body.contact = { id: contactId };
  if (input.description) body.description = input.description;
  if (input.reference) body.reference = input.reference;
  return body;
}

export function buildTripletexProjectUpdatePayload(input: {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string | null;
  reference?: string | null;
  isReadyForInvoicing?: boolean;
  isClosed?: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.startDate) body.startDate = isoDateOnly(input.startDate);
  if (input.endDate) body.endDate = isoDateOnly(input.endDate);
  if (input.description !== undefined) body.description = input.description;
  if (input.reference !== undefined) body.reference = input.reference;
  if (input.isReadyForInvoicing !== undefined) body.isReadyForInvoicing = input.isReadyForInvoicing;
  if (input.isClosed !== undefined) body.isClosed = input.isClosed;
  return body;
}

export function tripletexValidationSummary(body?: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown;
      validationMessages?: Array<{ field?: string; message?: string }>;
    };
    const details = parsed.validationMessages
      ?.map((item) => [item.field, item.message].filter(Boolean).join(": "))
      .filter((item) => item.length > 0)
      .join("; ");
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (details && message) return `${message} (${details})`;
    return details || message || null;
  } catch {
    return null;
  }
}
