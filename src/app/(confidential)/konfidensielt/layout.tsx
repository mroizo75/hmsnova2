import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WhistleblowStepUpGate } from "@/features/whistleblowing/components/step-up-gate";

export default async function ConfidentialLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-dvh bg-background p-4 sm:p-8">
      <WhistleblowStepUpGate>{children}</WhistleblowStepUpGate>
    </div>
  );
}
