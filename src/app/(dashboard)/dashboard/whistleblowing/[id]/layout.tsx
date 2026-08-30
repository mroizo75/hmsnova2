import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewWhistleblowingContent } from "@/lib/whistleblowing-access";

export default async function WhistleblowingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!canViewWhistleblowingContent(session?.user?.role)) {
    redirect("/dashboard/whistleblowing");
  }

  return children;
}
