import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, FileText } from "lucide-react";
import Link from "next/link";
import { CopyFormButton } from "@/components/forms/copy-form-button";
import { DeleteFormButton } from "@/components/forms/delete-form-button";
import { fetchFormDetail } from "@/server/queries/form.queries";
import { FormDetailContent } from "@/features/forms/components/form-detail-content";
import { BCM_PATH, bcmFormHref, isBcmTemplateCategory } from "@/lib/bcm-audit";

export default async function BcmFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    allTemplates?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const queryParams = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(queryParams.page || "1", 10);
  const allTemplatesView = queryParams.allTemplates === "1";

  const initialData = await fetchFormDetail(id);
  if (!initialData) {
    redirect("/dashboard/bcm");
  }

  const { form, permissions } = initialData;

  if (!isBcmTemplateCategory(form.category)) {
    redirect(`/dashboard/forms/${id}`);
  }

  const detailHref = bcmFormHref(form.id);
  const fillSearchParams = new URLSearchParams({
    returnUrl: detailHref,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={BCM_PATH} aria-label="Tilbake til beredskap">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{form.title}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/forms/${form.id}/fill?${fillSearchParams.toString()}`}>
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <FileText className="h-4 w-4 mr-2" />
              Fyll ut skjema
            </Button>
          </Link>
          {form.isGlobal ? (
            <CopyFormButton formId={form.id} formTitle={form.title} />
          ) : (
            <>
              {permissions.canManageForms && form.allowTenantDeletion ? (
                <Link href={`/dashboard/forms/${form.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                </Link>
              ) : null}
              {permissions.canManageForms && form.allowTenantDeletion ? (
                <DeleteFormButton
                  formId={form.id}
                  formTitle={form.title}
                  submissionCount={form._count.submissions}
                  returnUrl={BCM_PATH}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      <FormDetailContent
        initialData={initialData}
        formId={id}
        currentPage={currentPage}
        allTemplatesView={allTemplatesView}
        detailHref={detailHref}
      />
    </div>
  );
}
