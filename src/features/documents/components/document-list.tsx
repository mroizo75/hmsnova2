"use client";

import { Document } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, CheckCircle, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { deleteDocument, getDocumentDownloadUrl, approveDocument } from "@/server/actions/document.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DocumentListProps {
  documents: Document[];
  tenantId: string;
  currentUserId?: string;
}

const kindLabels: Record<string, string> = {
  LAW: "Lov",
  PROCEDURE: "Prosedyre",
  CHECKLIST: "Sjekkliste",
  FORM: "Skjema",
  SDS: "Sikkerhetsdatablad",
  PLAN: "Plan",
  OTHER: "Annet",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  ARCHIVED: "destructive",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Utkast",
  APPROVED: "Godkjent",
  ARCHIVED: "Arkivert",
};

export function DocumentList({ documents, tenantId, currentUserId }: DocumentListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    const result = await getDocumentDownloadUrl(id);
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
      toast({
        title: "Dokument lastes ned",
        description: "Filen åpnes i en ny fane",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Nedlasting feilet",
        description: result.error || "Kunne ikke laste ned dokument",
      });
    }
  };

  const handleApprove = async (id: string, title: string) => {
    if (!confirm(`Godkjenn "${title}"?\n\nDette vil aktivere dokumentet for bruk.`)) {
      return;
    }

    setLoading(id);
    const result = await approveDocument({
      id,
      approvedBy: currentUserId || "system",
    });

    if (result.success) {
      toast({
        title: "✅ Dokument godkjent",
        description: `"${title}" er nå aktivert for bruk`,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Godkjenning feilet",
        description: result.error || "Kunne ikke godkjenne dokument",
      });
    }
    setLoading(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteDocument(id);
    if (result.success) {
      toast({
        title: "🗑️ Dokument slettet",
        description: `"${title}" er permanent fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette dokument",
      });
    }
    setLoading(null);
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">Ingen dokumenter</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Last opp ditt første dokument for å komme i gang
        </p>
        <Button asChild>
          <Link href={`/dashboard/documents/new`}>Last opp dokument</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tittel</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Versjon</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Godkjent</TableHead>
            <TableHead>Opprettet</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{kindLabels[doc.kind]}</Badge>
              </TableCell>
              <TableCell>{doc.version}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[doc.status]}>
                  {statusLabels[doc.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {doc.approvedAt ? (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(doc.approvedAt).toLocaleDateString("no-NO")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {new Date(doc.createdAt).toLocaleDateString("no-NO")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.id)}
                    title="Last ned"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  {doc.status === "DRAFT" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(doc.id, doc.title)}
                      disabled={loading === doc.id}
                      title="Godkjenn dokument"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}

                  {doc.status === "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Last opp ny versjon"
                    >
                      <Link href={`/dashboard/documents/${doc.id}/new-version`}>
                        <Upload className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    disabled={doc.kind === "LAW" || loading === doc.id}
                    title={doc.kind === "LAW" ? "Lovdokumenter kan ikke slettes" : "Slett"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
