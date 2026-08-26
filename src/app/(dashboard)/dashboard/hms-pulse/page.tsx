import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchHmsPulseData } from "@/server/queries/hms-pulse.queries";
import { HmsPulseContent } from "@/features/hms-pulse/components/hms-pulse-content";

export default async function HmsPulsePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const initialData = await fetchHmsPulseData();
  if (!initialData) {
    return <div>Ingen tilgang til tenant.</div>;
  }

  return (
    <div className="space-y-6">
      <HmsPulseContent initialData={initialData} />
    </div>
  );
}
