import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchFormsList } from "@/server/queries/form.queries";
import { FormsListContent } from "@/features/forms/components/forms-list-content";

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; projectId?: string; q?: string; view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(params.page || "1", 10);
  const selectedProjectId = params.projectId || null;
  const query = (params.q || "").trim();
  const showAllTemplates = params.view === "all";

  const initialData = await fetchFormsList({
    page: currentPage,
    projectId: selectedProjectId,
    query,
    showAllTemplates,
  });

  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Skjemaer</h1>
            <p className="text-muted-foreground mt-1">
              Bygg, administrer og fyll ut egendefinerte skjemaer
            </p>
            {query && (
              <p className="text-sm text-primary mt-1">
                Filtrert på <strong>{query}</strong>
              </p>
            )}
            {!showAllTemplates && (
              <p className="text-sm text-muted-foreground mt-1">
                Viser bransjetilpassede maler
              </p>
            )}
          </div>
          <PageHelpDialog content={helpContent.forms} />
        </div>
        <div className="flex items-center gap-2">
          <Link href={showAllTemplates ? "/dashboard/forms" : "/dashboard/forms?view=all"}>
            <Button variant="outline" size="lg">
              {showAllTemplates ? "Vis bransjemaler" : "Vis alle maler"}
            </Button>
          </Link>
          <Link href="/dashboard/forms/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nytt skjema
            </Button>
          </Link>
        </div>
      </div>

      <FormsListContent
        initialData={initialData}
        currentPage={currentPage}
        selectedProjectId={selectedProjectId}
        query={query}
        showAllTemplates={showAllTemplates}
      />
    </div>
  );
}
