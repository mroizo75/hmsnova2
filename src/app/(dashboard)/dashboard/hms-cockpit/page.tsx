import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchHmsCockpitData } from "@/server/queries/hms-cockpit.queries";
import { HmsCockpitContent } from "@/features/hms-cockpit/components/hms-cockpit-content";

export default async function HmsCockpitPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const initialData = await fetchHmsCockpitData();
  if (!initialData) redirect("/login");

  return (
    <div className="space-y-6">
      <HmsCockpitContent initialData={initialData} />
    </div>
  );
}
