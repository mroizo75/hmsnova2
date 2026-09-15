import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchMocDetail, fetchMocList } from "@/server/queries/moc.queries";
import { MocDetailContent } from "@/features/moc/components/moc-detail-content";

export default async function AnsattMocDetaljPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { id } = await params;
  const data = await fetchMocDetail(id);
  if (!data) {
    const list = await fetchMocList();
    if (!list.moduleEnabled) redirect("/ansatt");
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ansatt/moc" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{data.moc.title}</h1>
          <p className="text-sm text-muted-foreground font-mono">{data.moc.number}</p>
        </div>
      </div>
      <MocDetailContent data={data} />
    </div>
  );
}
