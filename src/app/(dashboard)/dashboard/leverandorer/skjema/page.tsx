import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierFormEditor } from "@/features/suppliers/components/supplier-form-editor";
import { defaultSupplierQuestions, type SupplierQuestionTypeValue } from "@/lib/supplier-management";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SupplierFormPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const template = await prisma.supplierFormTemplate.findUnique({
    where: { tenantId: session.user.tenantId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  const questions = template
    ? template.questions.map((question) => ({
        label: question.label,
        helpText: question.helpText ?? "",
        fieldType: question.fieldType as SupplierQuestionTypeValue,
        required: question.required,
      }))
    : defaultSupplierQuestions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Standardskjema</h1>
          <p className="text-muted-foreground">
            Ett skjema for alle leverandører. Spørsmålene redigeres her én gang og sendes fra leverandørkortet. Svarene lagres på leverandøren.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/leverandorer">Tilbake til leverandører</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{template?.title ?? "Selvevaluering"}</CardTitle>
          <CardDescription>
            {template
              ? "Dette er bedriftens standardskjema. Allerede utsendte skjema beholder spørsmålene de ble sendt med."
              : "Forslaget under er standarden til dere lagrer egne spørsmål. Det brukes for alle leverandører uten at det må redigeres per leverandør. Arbeider leverandøren hos dere, bør skjemaet også spørre om samordning etter arbeidsmiljøloven § 2-2."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierFormEditor title={template?.title ?? "Selvevaluering"} questions={questions} />
        </CardContent>
      </Card>
    </div>
  );
}
