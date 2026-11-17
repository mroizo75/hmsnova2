import { prisma } from "@/lib/db";
import { employeeMayUseTimeRegistration } from "@/lib/time/employee-time-access";

export async function denyEmployeeTimeRegistration(input: {
  tenantId: string;
  role: string;
}): Promise<string | null> {
  if (input.role !== "ANSATT") return null;
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: {
      timeRegistrationEnabled: true,
      timeRegistrationVisibleToEmployees: true,
    },
  });
  const open = employeeMayUseTimeRegistration({
    role: input.role,
    timeRegistrationEnabled: tenant?.timeRegistrationEnabled ?? false,
    visibleToEmployees: tenant?.timeRegistrationVisibleToEmployees ?? true,
  });
  if (open) return null;
  if (!tenant?.timeRegistrationEnabled) {
    return "Timeregistrering er ikke aktivert for denne virksomheten";
  }
  return "Timeregistrering er ikke åpnet for ansatte";
}
