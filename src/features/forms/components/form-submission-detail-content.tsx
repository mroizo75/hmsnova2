"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Briefcase, CheckCircle2, FileText, Download, MessageSquare } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { fetchFormSubmissionDetail } from "@/server/queries/form.queries";

type SubmissionData = NonNullable<Awaited<ReturnType<typeof fetchFormSubmissionDetail>>>;

interface FormSubmissionDetailContentProps {
  initialData: SubmissionData;
  formId: string;
  submissionId: string;
}

function isImageKey(key: string): boolean {
  const ext = key.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(ext ?? "");
}

function renderFieldValue(
  fieldType: string,
  options: string[] | null,
  value: string | null,
  fileKey: string | null
): React.ReactNode {
  if (fileKey) {
    if (isImageKey(fileKey)) {
      return (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${fileKey}`}
            alt="Vedlagt bilde"
            className="max-w-full rounded-lg border shadow-sm max-h-96 object-contain bg-muted/20"
          />
          <a href={`/api/files/${fileKey}`} download className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
            <Download className="h-3 w-3" />
            Last ned bilde
          </a>
        </div>
      );
    }
    return (
      <a href={`/api/files/${fileKey}`} download className="inline-flex items-center gap-2 text-primary underline hover:opacity-70">
        <FileText className="h-4 w-4" />
        Last ned vedlegg
      </a>
    );
  }

  if (!value) return <span className="text-muted-foreground italic">Ikke besvart</span>;

  if (fieldType === "CHECKBOX") {
    if (options && options.length > 0) {
      try {
        const selected: string[] = JSON.parse(value);
        if (selected.length === 0) return <span className="text-muted-foreground italic">Ingen valgt</span>;
        return (
          <ul className="space-y-1">
            {selected.map((v) => (
              <li key={v} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                {v}
              </li>
            ))}
          </ul>
        );
      } catch { return value; }
    }
    return value === "true" ? "Ja" : "Nei";
  }

  if (fieldType === "LIKERT_SCALE") {
    const labels: Record<string, string> = {
      "1": "1 – Svært uenig", "2": "2 – Uenig", "3": "3 – Nøytral", "4": "4 – Enig", "5": "5 – Svært enig",
    };
    return labels[value] || value;
  }

  if (fieldType === "DATE") {
    try { return format(new Date(value), "d. MMMM yyyy", { locale: nb }); } catch { return value; }
  }

  if (fieldType === "DATETIME") {
    try { return format(new Date(value), "d. MMMM yyyy HH:mm", { locale: nb }); } catch { return value; }
  }

  return <span className="whitespace-pre-wrap">{value}</span>;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Kladd", className: "bg-gray-100 text-gray-700" },
    SUBMITTED: { label: "Innsendt", className: "bg-blue-100 text-blue-800" },
    APPROVED: { label: "Godkjent", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "Avvist", className: "bg-red-100 text-red-800" },
  };
  const cfg = map[status] || map.SUBMITTED;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function FormSubmissionDetailContent({ initialData, formId, submissionId }: FormSubmissionDetailContentProps) {
  const { data: submission } = useQuery({
    queryKey: ["forms", formId, "submissions", submissionId],
    queryFn: () => fetchFormSubmissionDetail(formId, submissionId),
    initialData,
  });

  if (!submission) return null;

  const valueMap = new Map(
    submission.fieldValues.map((fv: any) => [fv.fieldId, fv])
  );

  const fieldComments: Record<string, string> = (() => {
    if (!submission.metadata) return {};
    try {
      const meta = JSON.parse(submission.metadata);
      return meta.fieldComments ?? {};
    } catch { return {}; }
  })();

  return (
    <>
      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Sendt inn</p>
              <p className="font-medium text-sm">
                {format(new Date(submission.createdAt), "d. MMMM yyyy HH:mm", { locale: nb })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Utfylt av</p>
              <p className="font-medium text-sm">
                {submission.submittedBy?.name || submission.submittedBy?.email || "Anonym"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            {getStatusBadge(submission.status)}
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Prosjekt</p>
              {submission.project ? (
                <Link href={`/dashboard/projects/${submission.project.id}`} className="font-medium text-sm text-primary hover:underline">
                  {submission.project.name}
                  {submission.project.code ? ` (${submission.project.code})` : ""}
                </Link>
              ) : (
                <p className="font-medium text-sm text-muted-foreground">Ikke koblet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {submission.formTemplate.fields.map((field: any, index: number) => {
          if (field.fieldType === "SECTION_HEADER") {
            return (
              <div key={field.id} className="mt-6 mb-2">
                <h2 className="text-xl font-bold text-primary border-b-2 border-primary pb-2">{field.label}</h2>
                {field.helpText && <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>}
              </div>
            );
          }

          const fieldValue = valueMap.get(field.id) as { value?: string; fileKey?: string } | undefined;
          const options: string[] | null = field.options
            ? (() => { try { return JSON.parse(field.options); } catch { return null; } })()
            : null;

          return (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                  {field.label}
                  {field.isRequired && <span className="text-destructive text-xs">*</span>}
                </CardTitle>
                {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {renderFieldValue(field.fieldType, options, fieldValue?.value ?? null, fieldValue?.fileKey ?? null)}
                </div>
                {fieldComments[field.id] && (
                  <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MessageSquare className="h-3 w-3" />
                      Merknad
                    </p>
                    <p className="text-sm text-foreground/80 italic whitespace-pre-wrap">{fieldComments[field.id]}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {submission.signedAt && (() => {
        const meta = submission.metadata ? (() => {
          try { return JSON.parse(submission.metadata); } catch { return null; }
        })() : null;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Digital signatur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Signert: {format(new Date(submission.signedAt), "d. MMMM yyyy HH:mm", { locale: nb })}
              </p>
              {meta?.signatureData && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={meta.signatureData} alt="Signatur" className="border rounded-md max-w-xs bg-white" />
              )}
            </CardContent>
          </Card>
        );
      })()}
    </>
  );
}
