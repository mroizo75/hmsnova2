import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMocList } from "@/server/queries/moc.queries";
import { MocListContent } from "@/features/moc/components/moc-list-content";

export default async function AnsattMocPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const data = await fetchMocList();
  if (!data.moduleEnabled) {
    redirect("/ansatt");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-teal-700" />
            Endringsledelse
          </h1>
          <p className="text-muted-foreground">
            Foreslå endringer, se saker du er berørt av, og bekreft at du er informert.
          </p>
        </div>
        <Button asChild>
          <Link href="/ansatt/moc/ny">
            <Plus className="h-4 w-4 mr-1" />
            Foreslå endring
          </Link>
        </Button>
      </div>
      <MocListContent data={data} detailBasePath="/ansatt/moc" />
    </div>
  );
}
