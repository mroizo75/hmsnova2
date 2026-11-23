import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminProductUpdates } from "@/features/product-updates/components/admin-product-updates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Systembeskjeder | HMS Nova",
};

export default async function AdminProductUpdatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/admin");

  return <AdminProductUpdates />;
}
