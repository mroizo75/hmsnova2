"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, HardHat, ClipboardCheck, ListTodo, Plus, ExternalLink, ShieldCheck, Clock, Paperclip, Upload, FileImage, FileSpreadsheet, FileText, FileCheck2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getIncidentTypeLabel, getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";

interface Incident {
  id: string;
  avviksnummer: string | null;
  title: string;
  type: string;
  severity: number | null;
  status: string;
  occurredAt: Date;
}

interface SjaAnalysis {
  id: string;
  sjaNummer: string | null;
  title: string;
  status: string;
  plannedDate: Date;
  workLocation: string;
}

interface Inspection {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: Date;
  location: string | null;
}

interface Measure {
  id: string;
  title: string;
  status: string;
  dueAt: Date;
  category: string;
  riskId?: string | null;
  incidentId?: string | null;
  projectId?: string | null;
}

interface TimeEntry {
  id: string;
  date: Date;
  hours: number;
  timeType: string;
  comment?: string | null;
  user: {
    name: string | null;
    email: string;
  };
}

interface ProjectAttachment {
  id: string;
  fileKey: string;
  name: string;
  mime: string;
  size: number | null;
  createdAt: Date;
}

interface ProjectFormSubmission {
  id: string;
  submissionNumber: string | null;
  status: string;
  createdAt: Date;
  formTemplateId: string;
  formTemplate: {
    title: string;
  };
  submittedBy: {
    name: string | null;
    email: string;
  } | null;
}

interface ProjectTabsProps {
  projectId: string;
  incidents: Incident[];
  sjaAnalyses: SjaAnalysis[];
  inspections: Inspection[];
  measures: Measure[];
  timeEntries: TimeEntry[];
  attachments: ProjectAttachment[];
  formSubmissions: ProjectFormSubmission[];
}

export function ProjectTabs({
  projectId,
  incidents,
  sjaAnalyses,
  inspections,
  measures,
  timeEntries,
  attachments,
  formSubmissions,
}: ProjectTabsProps) {
  const t = useTranslations("dashboardProjectTabs");
  const locale = useLocale();
  const { toast } = useToast();
  const [projectAttachments, setProjectAttachments] = useState<ProjectAttachment[]>(attachments);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const formatFileSize = (size: number | null) => {
    if (!size || size <= 0) return t("unknownSize");
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-600" />;
    if (mime.includes("sheet") || mime.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: t("toasts.noFiles.title"),
        description: t("toasts.noFiles.description"),
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || t("errors.upload"));
      }

      const createdAttachments = (payload.attachments || []) as ProjectAttachment[];
      setProjectAttachments((prev) => [...createdAttachments, ...prev]);
      setSelectedFiles([]);
      const input = document.getElementById("project-attachments-upload") as HTMLInputElement | null;
      if (input) input.value = "";

      toast({
        title: t("toasts.uploaded.title"),
        description: t("toasts.uploaded.description", { count: createdAttachments.length }),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("toasts.uploadError.title"),
        description: error?.message || t("toasts.uploadError.description"),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, attachmentName: string) => {
    if (!confirm(t("confirmDeleteAttachment", { name: attachmentName }))) {
      return;
    }

    try {
      setDeletingAttachmentId(attachmentId);
      const response = await fetch(`/api/projects/${projectId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || t("errors.deleteAttachment"));
      }

      setProjectAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
      toast({
        title: t("toasts.deleted.title"),
        description: t("toasts.deleted.description", { name: attachmentName }),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("toasts.deleteError.title"),
        description: error?.message || t("toasts.deleteError.description"),
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <Tabs defaultValue="incidents">
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/projects/${projectId}/construction-compliance`}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {t("actions.constructionCompliance")}
          </Link>
        </Button>
      </div>
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="incidents" className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          {t("tabs.incidents")}
          {incidents.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{incidents.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sja" className="flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5" />
          SJA
          {sjaAnalyses.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{sjaAnalyses.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="inspections" className="flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {t("tabs.inspections")}
          {inspections.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{inspections.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="measures" className="flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" />
          {t("tabs.measures")}
          {measures.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{measures.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="time" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t("tabs.time")}
          {timeEntries.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{timeEntries.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="attachments" className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          {t("tabs.attachments")}
          {projectAttachments.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{projectAttachments.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="forms" className="flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5" />
          {t("tabs.forms")}
          {formSubmissions.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{formSubmissions.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Avvik ── */}
      <TabsContent value="incidents" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("incidents.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/incidents/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("incidents.actions.new")}
            </Link>
          </Button>
        </div>
        {incidents.length === 0 ? (
          <EmptyState icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />} text={t("incidents.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {incidents.map((inc) => (
              <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {inc.avviksnummer && (
                      <span className="font-mono text-xs text-muted-foreground">{inc.avviksnummer}</span>
                    )}
                    <span className="text-sm font-medium truncate">{inc.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getIncidentTypeLabel(inc.type as any)} · {new Date(inc.occurredAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{getIncidentStatusLabel(inc.status)}</Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── SJA ── */}
      <TabsContent value="sja" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("sja.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/sja/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("sja.actions.new")}
            </Link>
          </Button>
        </div>
        {sjaAnalyses.length === 0 ? (
          <EmptyState icon={<HardHat className="h-8 w-8 text-muted-foreground" />} text={t("sja.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {sjaAnalyses.map((sja) => {
              const sc = getSjaStatusMap(t)[sja.status] ?? { label: sja.status, color: "" };
              return (
                <Link key={sja.id} href={`/dashboard/sja/${sja.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      {sja.sjaNummer && (
                        <span className="font-mono text-xs text-muted-foreground">{sja.sjaNummer}</span>
                      )}
                      <span className="text-sm font-medium">{sja.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sja.workLocation} · {new Date(sja.plannedDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ── Vernerunder ── */}
      <TabsContent value="inspections" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("inspections.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/inspections/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("inspections.actions.new")}
            </Link>
          </Button>
        </div>
        {inspections.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />} text={t("inspections.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {inspections.map((insp) => {
              const sc = getInspectionStatusMap(t)[insp.status] ?? { label: insp.status, color: "" };
              return (
                <Link key={insp.id} href={`/dashboard/inspections/${insp.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{insp.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insp.location ?? "—"} · {new Date(insp.scheduledDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* ── Tiltak ── */}
      <TabsContent value="measures" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("measures.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/actions?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("measures.actions.new")}
            </Link>
          </Button>
        </div>
        {measures.length === 0 ? (
          <EmptyState icon={<ListTodo className="h-8 w-8 text-muted-foreground" />} text={t("measures.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {measures.map((m) => {
              const sc = getMeasureStatusMap(t)[m.status] ?? { label: m.status, color: "" };
              const overdue = m.status !== "DONE" && m.status !== "CANCELLED" && new Date(m.dueAt) < new Date();
              return (
                <Link key={m.id} href={`/dashboard/actions`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{m.title}</span>
                    <p className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {t("measures.deadline", { date: new Date(m.dueAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO") })}
                      {overdue && ` ${t("measures.overdue")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("measures.sourceLabel")}: {m.incidentId ? t("measures.sourceIncident") : m.riskId ? t("measures.sourceRisk") : t("measures.sourceProject")}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="time" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("time.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/time-registration?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("time.actions.stamp")}
            </Link>
          </Button>
        </div>
        {timeEntries.length === 0 ? (
          <EmptyState icon={<Clock className="h-8 w-8 text-muted-foreground" />} text={t("time.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {entry.user.name || entry.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")} · {entry.timeType}
                    {entry.comment ? ` · ${entry.comment}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold">{Number(entry.hours).toFixed(1)} {t("time.hoursSuffix")}</span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="attachments" className="mt-4 space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {t("attachments.description")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="project-attachments-upload"
              type="file"
              multiple
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                setSelectedFiles(files);
              }}
            />
            <Button size="sm" onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0}>
              <Upload className="mr-1 h-3.5 w-3.5" />
              {isUploading ? t("attachments.actions.uploading") : t("attachments.actions.upload")}
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("attachments.selected")}: {selectedFiles.map((file) => file.name).join(", ")}
            </p>
          )}
        </div>

        {projectAttachments.length === 0 ? (
          <EmptyState icon={<Paperclip className="h-8 w-8 text-muted-foreground" />} text={t("attachments.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {projectAttachments.map((attachment) => {
              const isImage = attachment.mime.startsWith("image/");
              return (
                <div key={attachment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {renderFileIcon(attachment.mime)}
                      <a
                        href={`/api/files/${attachment.fileKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium truncate hover:underline"
                      >
                        {attachment.name}
                      </a>
                      {isImage && <Badge variant="outline" className="text-[10px]">{t("attachments.imageBadge")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(attachment.size)} · {new Date(attachment.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/api/files/${attachment.fileKey}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(attachment.id, attachment.name)}
                      disabled={deletingAttachmentId === attachment.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="forms" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{t("forms.description")}</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/inspections/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("forms.actions.fill")}
            </Link>
          </Button>
        </div>
        {formSubmissions.length === 0 ? (
          <EmptyState icon={<FileCheck2 className="h-8 w-8 text-muted-foreground" />} text={t("forms.empty")} />
        ) : (
          <div className="divide-y rounded-lg border">
            {formSubmissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/dashboard/projects/${projectId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {submission.submissionNumber && (
                      <span className="font-mono text-xs text-muted-foreground">{submission.submissionNumber}</span>
                    )}
                    <span className="text-sm font-medium truncate">{submission.formTemplate.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {submission.submittedBy?.name || submission.submittedBy?.email || t("forms.anonymous")} ·{" "}
                    {new Date(submission.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {getFormSubmissionStatusMap(t)[submission.status] ?? submission.status}
                  </Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function getSjaStatusMap(t: ReturnType<typeof useTranslations>): Record<string, { label: string; color: string }> {
  return {
    DRAFT: { label: t("status.sja.draft"), color: "bg-gray-100 text-gray-700 border-gray-300" },
    SUBMITTED: { label: t("status.sja.submitted"), color: "bg-blue-100 text-blue-800 border-blue-300" },
    APPROVED: { label: t("status.sja.approved"), color: "bg-green-100 text-green-800 border-green-300" },
    REJECTED: { label: t("status.sja.rejected"), color: "bg-red-100 text-red-800 border-red-300" },
  };
}

function getInspectionStatusMap(t: ReturnType<typeof useTranslations>): Record<string, { label: string; color: string }> {
  return {
    PLANNED: { label: t("status.inspection.planned"), color: "bg-blue-100 text-blue-800 border-blue-300" },
    IN_PROGRESS: { label: t("status.inspection.inProgress"), color: "bg-amber-100 text-amber-800 border-amber-300" },
    COMPLETED: { label: t("status.inspection.completed"), color: "bg-green-100 text-green-800 border-green-300" },
    CANCELLED: { label: t("status.inspection.cancelled"), color: "bg-gray-100 text-gray-700 border-gray-300" },
  };
}

function getMeasureStatusMap(t: ReturnType<typeof useTranslations>): Record<string, { label: string; color: string }> {
  return {
    PENDING: { label: t("status.measure.pending"), color: "bg-gray-100 text-gray-700 border-gray-300" },
    IN_PROGRESS: { label: t("status.measure.inProgress"), color: "bg-blue-100 text-blue-800 border-blue-300" },
    DONE: { label: t("status.measure.done"), color: "bg-green-100 text-green-800 border-green-300" },
    CANCELLED: { label: t("status.measure.cancelled"), color: "bg-gray-100 text-gray-500 border-gray-200" },
  };
}

function getFormSubmissionStatusMap(t: ReturnType<typeof useTranslations>): Record<string, string> {
  return {
    DRAFT: t("status.form.draft"),
    SUBMITTED: t("status.form.submitted"),
    APPROVED: t("status.form.approved"),
    REJECTED: t("status.form.rejected"),
  };
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
      <div className="mb-2 opacity-40">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
