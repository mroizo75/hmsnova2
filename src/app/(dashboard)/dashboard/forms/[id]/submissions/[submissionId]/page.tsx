import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { fetchFormSubmissionDetail } from "@/server/queries/form.queries";
import { FormSubmissionDetailContent } from "@/features/forms/components/form-submission-detail-content";

export const dynamic = "force-dynamic";

export default async function SubmissionViewPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id: formId, submissionId } = await params;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const initialData = await fetchFormSubmissionDetail(formId, submissionId);
  if (!initialData) {
    redirect(`/dashboard/forms/${formId}`);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/forms/${formId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{initialData.formTemplate.title}</h1>
          {initialData.formTemplate.description && (
            <p className="text-muted-foreground mt-1">{initialData.formTemplate.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/forms/${formId}/submissions/${submissionId}/pdf`} download>
            <Download className="h-4 w-4 mr-2" />
            Last ned PDF
          </a>
        </Button>
      </div>

      <FormSubmissionDetailContent
        initialData={initialData}
        formId={formId}
        submissionId={submissionId}
      />
    </div>
  );
}
