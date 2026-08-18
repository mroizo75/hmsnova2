import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { StartpakkeWizard } from "@/features/onboarding/components/startpakke-wizard";
import type { Role } from "@prisma/client";

export const metadata = { title: "Kom i gang med HMS Nova" };

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session.user.role) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role as Role);

  // Kun admin kan se wizard
  if (!permissions.canUpdateSettings) {
    redirect("/dashboard");
  }

  const tenantId = session.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, startpakkeCompleted: true },
  });

  // Allerede fullført – send videre til dashboard
  if (tenant?.startpakkeCompleted) {
    redirect("/dashboard");
  }

  return (
    <StartpakkeWizard
      tenantId={tenantId}
      tenantName={tenant?.name ?? "Din bedrift"}
    />
  );
}
