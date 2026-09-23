import { tripletexNumericId } from "./tripletex/project-payload";

export type TripletexEmployeeCandidate = {
  externalId: string;
  email?: string | null;
  employeeNumber?: string | null;
};

export function pickTripletexEmployeeId(input: {
  mappedId?: string | null;
  email?: string | null;
  employeeNumber?: string | null;
  employees: TripletexEmployeeCandidate[];
  tokenEmployeeId?: string | null;
  alreadyMappedIds?: string[];
}): string | null {
  const mapped = tripletexNumericId(input.mappedId ?? null);
  if (mapped) return String(mapped);

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const hit = input.employees.find((row) => row.email?.trim().toLowerCase() === email);
    if (hit) return hit.externalId;
  }

  const number = input.employeeNumber?.trim();
  if (number) {
    const hit = input.employees.find((row) => row.employeeNumber === number);
    if (hit) return hit.externalId;
  }

  if (input.employees.length === 1) return input.employees[0].externalId;

  const tokenId = tripletexNumericId(input.tokenEmployeeId ?? null);
  if (tokenId) {
    const id = String(tokenId);
    const taken = (input.alreadyMappedIds ?? []).includes(id);
    if (!taken) return id;
  }

  return null;
}
