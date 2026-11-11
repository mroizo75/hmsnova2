export interface CheckpointField {
  id: string;
  label: string;
  options: string[] | null;
}

const DEVIATION_ANSWERS = new Set([
  "ikke ok",
  "ikke_ok",
  "not ok",
  "not_ok",
  "nei",
  "no",
  "avvik",
  "fail",
  "failed",
  "non-compliant",
  "non_compliant",
]);

export function isDeviationAnswer(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return DEVIATION_ANSWERS.has(normalized) || normalized.includes("ikke ok");
}

export function checkpointLabelFromDescription(description: string | null | undefined): string | null {
  const match = description?.match(/Sjekkpunkt:\s*(.+)/);
  const label = match?.[1]?.trim();
  return label || null;
}

export function resolveCheckpointFieldId(input: {
  storedFieldId: string | null | undefined;
  incidentDescription: string | null | undefined;
  fields: Array<{ id: string; label: string }>;
}): string | null {
  if (input.storedFieldId && input.fields.some((field) => field.id === input.storedFieldId)) {
    return input.storedFieldId;
  }
  const label = checkpointLabelFromDescription(input.incidentDescription);
  if (!label) return null;
  return input.fields.find((field) => field.label === label)?.id ?? null;
}

export function withCheckpointLabel(description: string, label: string): string {
  if (/Sjekkpunkt:/.test(description)) {
    return description.replace(/Sjekkpunkt:\s*.+/, `Sjekkpunkt: ${label}`);
  }
  const source = description.match(/Kilde: Vernerunde[^\n]*/);
  if (source && source.index !== undefined) {
    const insertAt = source.index + source[0].length;
    return `${description.slice(0, insertAt)}\nSjekkpunkt: ${label}${description.slice(insertAt)}`;
  }
  return `Sjekkpunkt: ${label}\n\n${description}`;
}

export function replacementAnswer(options: string[] | null, deviation: boolean): string {
  const list = options ?? [];
  if (deviation) {
    return list.find((option) => isDeviationAnswer(option)) ?? "Ikke OK";
  }
  const ok = list.find((option) => {
    const normalized = option.trim().toLowerCase();
    return normalized === "ok" || normalized === "ja" || normalized === "yes";
  });
  return ok ?? "OK";
}

export function fieldValueAfterCheckpointMove(input: {
  fieldId: string;
  currentValue: string | null;
  options: string[] | null;
  findingIdsOnField: string[];
}): string | null {
  const hasFinding = input.findingIdsOnField.length > 0;
  if (hasFinding) {
    return isDeviationAnswer(input.currentValue)
      ? input.currentValue
      : replacementAnswer(input.options, true);
  }
  if (!isDeviationAnswer(input.currentValue)) return input.currentValue;
  return replacementAnswer(input.options, false);
}
