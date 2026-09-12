import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchFieldJobs } from "@/server/queries/field-jobs.queries";
import { FieldJobsContent } from "@/features/jobs/components/field-jobs-content";

export default async function AnsattJobberPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const data = await fetchFieldJobs();

  return (
    <div className="space-y-4">
      <Link
        href="/ansatt"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake
      </Link>
      <FieldJobsContent initialData={data} />
    </div>
  );
}
