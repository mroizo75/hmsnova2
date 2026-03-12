"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, HardHat, ClipboardCheck, ListTodo, Plus, ExternalLink, ShieldCheck, Clock, Paperclip, Upload, FileImage, FileSpreadsheet, FileText, FileCheck2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getIncidentTypeLabel, getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Incident {
  id: string;
  avviksnummer: string | null;
  title: string;
  type: string;
  severity: number;
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

const sjaStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Utkast", color: "bg-gray-100 text-gray-700 border-gray-300" },
  SUBMITTED: { label: "Innsendt", color: "bg-blue-100 text-blue-800 border-blue-300" },
  APPROVED: { label: "Godkjent", color: "bg-green-100 text-green-800 border-green-300" },
  REJECTED: { label: "Avvist", color: "bg-red-100 text-red-800 border-red-300" },
};

const inspectionStatusMap: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planlagt", color: "bg-blue-100 text-blue-800 border-blue-300" },
  IN_PROGRESS: { label: "Pågår", color: "bg-amber-100 text-amber-800 border-amber-300" },
  COMPLETED: { label: "Fullført", color: "bg-green-100 text-green-800 border-green-300" },
  CANCELLED: { label: "Avlyst", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

const measureStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Venter", color: "bg-gray-100 text-gray-700 border-gray-300" },
  IN_PROGRESS: { label: "Pågår", color: "bg-blue-100 text-blue-800 border-blue-300" },
  DONE: { label: "Fullført", color: "bg-green-100 text-green-800 border-green-300" },
  CANCELLED: { label: "Kansellert", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const formSubmissionStatusMap: Record<string, string> = {
  DRAFT: "Kladd",
  SUBMITTED: "Innsendt",
  APPROVED: "Godkjent",
  REJECTED: "Avvist",
};

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
  const { toast } = useToast();
  const [projectAttachments, setProjectAttachments] = useState<ProjectAttachment[]>(attachments);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const formatFileSize = (size: number | null) => {
    if (!size || size <= 0) return "Ukjent størrelse";
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
        title: "Ingen filer valgt",
        description: "Velg minst én fil før opplasting",
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
        throw new Error(payload?.message || payload?.error || "Kunne ikke laste opp filer");
      }

      const createdAttachments = (payload.attachments || []) as ProjectAttachment[];
      setProjectAttachments((prev) => [...createdAttachments, ...prev]);
      setSelectedFiles([]);
      const input = document.getElementById("project-attachments-upload") as HTMLInputElement | null;
      if (input) input.value = "";

      toast({
        title: "Vedlegg lastet opp",
        description: `${createdAttachments.length} fil(er) er lagt til prosjektet`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Opplasting feilet",
        description: error?.message || "Kunne ikke laste opp vedlegg",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, attachmentName: string) => {
    if (!confirm(`Slette vedlegg "${attachmentName}"?`)) {
      return;
    }

    try {
      setDeletingAttachmentId(attachmentId);
      const response = await fetch(`/api/projects/${projectId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Kunne ikke slette vedlegg");
      }

      setProjectAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
      toast({
        title: "Vedlegg slettet",
        description: `"${attachmentName}" er fjernet fra prosjektet`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: error?.message || "Kunne ikke slette vedlegg",
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
            Bygg/anlegg-compliance
          </Link>
        </Button>
      </div>
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="incidents" className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Avvik
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
          Vernerunder
          {inspections.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{inspections.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="measures" className="flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" />
          Tiltak
          {measures.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{measures.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="time" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Timer
          {timeEntries.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{timeEntries.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="attachments" className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Vedlegg
          {projectAttachments.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{projectAttachments.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="forms" className="flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5" />
          Skjema
          {formSubmissions.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{formSubmissions.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Avvik ── */}
      <TabsContent value="incidents" className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">Avvik og hendelser registrert på dette prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/incidents/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Registrer avvik
            </Link>
          </Button>
        </div>
        {incidents.length === 0 ? (
          <EmptyState icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />} text="Ingen avvik registrert på dette prosjektet" />
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
                    {getIncidentTypeLabel(inc.type as any)} · {new Date(inc.occurredAt).toLocaleDateString("nb-NO")}
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
          <p className="text-sm text-muted-foreground">Sikker Jobb Analyser for dette prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/sja/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ny SJA
            </Link>
          </Button>
        </div>
        {sjaAnalyses.length === 0 ? (
          <EmptyState icon={<HardHat className="h-8 w-8 text-muted-foreground" />} text="Ingen SJA-analyser registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {sjaAnalyses.map((sja) => {
              const sc = sjaStatusMap[sja.status] ?? { label: sja.status, color: "" };
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
                      {sja.workLocation} · {new Date(sja.plannedDate).toLocaleDateString("nb-NO")}
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
          <p className="text-sm text-muted-foreground">Vernerunder og inspeksjoner på prosjektstedet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/inspections/new?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ny vernerunde
            </Link>
          </Button>
        </div>
        {inspections.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />} text="Ingen vernerunder registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {inspections.map((insp) => {
              const sc = inspectionStatusMap[insp.status] ?? { label: insp.status, color: "" };
              return (
                <Link key={insp.id} href={`/dashboard/inspections/${insp.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{insp.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insp.location ?? "—"} · {new Date(insp.scheduledDate).toLocaleDateString("nb-NO")}
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
          <p className="text-sm text-muted-foreground">Tiltak knyttet direkte til prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/actions?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nytt tiltak
            </Link>
          </Button>
        </div>
        {measures.length === 0 ? (
          <EmptyState icon={<ListTodo className="h-8 w-8 text-muted-foreground" />} text="Ingen tiltak registrert direkte på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {measures.map((m) => {
              const sc = measureStatusMap[m.status] ?? { label: m.status, color: "" };
              const overdue = m.status !== "DONE" && m.status !== "CANCELLED" && new Date(m.dueAt) < new Date();
              return (
                <Link key={m.id} href={`/dashboard/actions`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{m.title}</span>
                    <p className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      Frist: {new Date(m.dueAt).toLocaleDateString("nb-NO")}
                      {overdue && " — forfalt"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kilde: {m.incidentId ? "Avvik" : m.riskId ? "Risiko" : "Prosjekt"}
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
          <p className="text-sm text-muted-foreground">Timeregistreringer på prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/time-registration?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Stemple timer
            </Link>
          </Button>
        </div>
        {timeEntries.length === 0 ? (
          <EmptyState icon={<Clock className="h-8 w-8 text-muted-foreground" />} text="Ingen timer registrert på dette prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {entry.user.name || entry.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("nb-NO")} · {entry.timeType}
                    {entry.comment ? ` · ${entry.comment}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold">{Number(entry.hours).toFixed(1)} t</span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="attachments" className="mt-4 space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Last opp prosjektdokumentasjon som skal med i sluttrapporten (bilder, samsvar, målinger, signerte skjema).
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
              {isUploading ? "Laster opp..." : "Last opp"}
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Valgt: {selectedFiles.map((file) => file.name).join(", ")}
            </p>
          )}
        </div>

        {projectAttachments.length === 0 ? (
          <EmptyState icon={<Paperclip className="h-8 w-8 text-muted-foreground" />} text="Ingen vedlegg på prosjektet ennå" />
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
                      {isImage && <Badge variant="outline" className="text-[10px]">Bilde</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(attachment.size)} · {new Date(attachment.createdAt).toLocaleDateString("nb-NO")}
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
          <p className="text-sm text-muted-foreground">Skjemainnsendinger koblet til dette prosjektet</p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/forms?projectId=${projectId}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Fyll ut skjema
            </Link>
          </Button>
        </div>
        {formSubmissions.length === 0 ? (
          <EmptyState icon={<FileCheck2 className="h-8 w-8 text-muted-foreground" />} text="Ingen skjemainnsendinger koblet til prosjektet" />
        ) : (
          <div className="divide-y rounded-lg border">
            {formSubmissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/dashboard/forms/${submission.formTemplateId}/submissions/${submission.id}`}
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
                    {submission.submittedBy?.name || submission.submittedBy?.email || "Anonym"} ·{" "}
                    {new Date(submission.createdAt).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {formSubmissionStatusMap[submission.status] ?? submission.status}
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

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
      <div className="mb-2 opacity-40">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
