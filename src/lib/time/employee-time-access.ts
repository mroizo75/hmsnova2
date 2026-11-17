/**
 * Timeregistrering kan være på for bedriften uten at ansattrollen ser den.
 * Admin og leder prøver først, og åpner for ansatte når de er klare.
 */
export function employeeMayUseTimeRegistration(input: {
  role: string;
  timeRegistrationEnabled: boolean;
  visibleToEmployees: boolean;
}): boolean {
  if (!input.timeRegistrationEnabled) return false;
  if (input.role === "ANSATT" && !input.visibleToEmployees) return false;
  return true;
}
