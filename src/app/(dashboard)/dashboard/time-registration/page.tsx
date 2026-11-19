import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { fetchTimeRegistrationData } from "@/server/queries/time-registration.queries";
import { TimeRegistrationContent } from "@/features/time-registration/components/time-registration-content";
import { prisma } from "@/lib/db";
import { employeeMayUseTimeRegistration } from "@/lib/time/employee-time-access";

interface TimeRegistrationPageProps {
  searchParams: Promise<{ projectId?: string; tab?: string; date?: string; mode?: string }>;
}

export default async function TimeRegistrationPage({ searchParams }: TimeRegistrationPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role!, session.user.extraRoles);

  if (!permissions.canAccessTimeRegistration) {
    redirect("/dashboard");
  }

  const role = session.user.role!;
  if (role === "ANSATT") {
    const visibility = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { timeRegistrationEnabled: true, timeRegistrationVisibleToEmployees: true },
    });
    if (
      !employeeMayUseTimeRegistration({
        role,
        timeRegistrationEnabled: visibility?.timeRegistrationEnabled ?? false,
        visibleToEmployees: visibility?.timeRegistrationVisibleToEmployees ?? true,
      })
    ) {
      redirect("/ansatt");
    }
  }
  const isAdmin = ["ADMIN", "HMS", "LEDER"].includes(role);
  const { projectId, tab, date, mode } = await searchParams;

  const initialData = await fetchTimeRegistrationData();

  return (
    <div className="space-y-6">
      <TimeRegistrationContent
        initialData={initialData}
        isAdmin={isAdmin}
        role={role}
        selectedProjectId={projectId}
        initialTab={tab}
        initialDate={date}
        initialMode={mode === "absence" ? "absence" : "work"}
      />
    </div>
  );
}
