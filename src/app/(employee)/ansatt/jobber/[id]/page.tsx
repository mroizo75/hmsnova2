import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchFieldJobDetail } from "@/server/queries/field-jobs.queries";
import { JobDetailContent } from "@/features/jobs/components/job-detail-content";

export default async function JobbDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");
  const { id } = await params;
  const data = await fetchFieldJobDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/ansatt/jobber"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Jobber
      </Link>
      <JobDetailContent initialData={data} />
    </div>
  );
}
