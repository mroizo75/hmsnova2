import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { fetchWelcomeData } from "@/server/queries/welcome.queries";
import { WelcomeContent } from "@/features/welcome/components/welcome-content";

export const metadata = { title: "Kom i gang med HMS Nova" };

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session.user.role) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role as Role);

  if (!permissions.canUpdateSettings) {
    redirect("/dashboard");
  }

  const initialData = await fetchWelcomeData();

  if (!initialData || initialData.startpakkeCompleted) {
    redirect("/dashboard");
  }

  return <WelcomeContent initialData={initialData} />;
}
