import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewJobForm } from "@/features/jobs/components/new-job-form";
import { listCachedCustomers } from "@/server/actions/accounting.actions";

export default async function NyJobbPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const customers = await listCachedCustomers();

  return (
    <div className="space-y-4">
      <Link
        href="/ansatt/jobber"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Jobber
      </Link>
      <h1 className="text-2xl font-bold">Ny jobb</h1>
      <NewJobForm customers={customers} />
    </div>
  );
}
