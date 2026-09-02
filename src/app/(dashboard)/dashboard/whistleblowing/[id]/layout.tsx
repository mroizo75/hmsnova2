import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewWhistleblowingContent } from "@/lib/whistleblowing-access";
import { prisma } from "@/lib/db";
import { WhistleblowStepUpGate } from "@/features/whistleblowing/components/step-up-gate";

export default async function WhistleblowingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    redirect("/dashboard");
  }

  const handler = canViewWhistleblowingContent(session.user.role);
  const grant = handler
    ? true
    : await prisma.whistleblowAccessGrant.findFirst({
        where: {
          tenantId: session.user.tenantId,
          granteeId: session.user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          type: { in: ["ASSIGN", "ASSIST", "BREAK_GLASS"] },
        },
        select: { id: true },
      });

  if (!grant) {
    redirect("/dashboard/whistleblowing");
  }

  return <WhistleblowStepUpGate>{children}</WhistleblowStepUpGate>;
}
