import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { fetchTimeRegistrationData } from "@/server/queries/time-registration.queries";
import { TimeRegistrationContent } from "@/features/time-registration/components/time-registration-content";

interface TimeRegistrationPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function TimeRegistrationPage({ searchParams }: TimeRegistrationPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role!);

  if (!permissions.canAccessTimeRegistration) {
    redirect("/dashboard");
  }

  const role = session.user.role!;
  const isAdmin = ["ADMIN", "HMS", "LEDER"].includes(role);
  const { projectId } = await searchParams;

  const initialData = await fetchTimeRegistrationData();

  return (
    <div className="space-y-6">
      <TimeRegistrationContent
        initialData={initialData}
        isAdmin={isAdmin}
        role={role}
        selectedProjectId={projectId}
      />
    </div>
  );
}
