"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { deletePersonnelDocument } from "@/server/actions/personnel.actions";
import {
  PERSONNEL_CATEGORIES,
  PERSONNEL_CATEGORY_LABELS,
  formatFileSize,
  isRetainExpired,
  type PersonnelCategory,
} from "@/features/personnel/lib/personnel-categories";
import type { PersonnelDocumentRow } from "@/server/queries/personnel.queries";

interface PersonnelDocumentListProps {
  documents: PersonnelDocumentRow[];
  canDelete: boolean;
}

export function PersonnelDocumentList({ documents, canDelete }: PersonnelDocumentListProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Slette dokumentet fra personalmappen og Cloudflare R2?")) return;
    startTransition(async () => {
      const result = await deletePersonnelDocument({ id });
      if (!result.success) {
        toast({ title: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Dokument slettet" });
    });
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Ingen dokumenter i personalmappen ennå.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {PERSONNEL_CATEGORIES.map((category) => {
        const items = documents.filter((doc) => doc.category === category);
        if (items.length === 0) return null;
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">
                {PERSONNEL_CATEGORY_LABELS[category as PersonnelCategory]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((doc) => {
                const expired = isRetainExpired(doc.retainUntil);
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{doc.title}</p>
                        {expired && (
                          <Badge variant="outline" className="border-red-300 text-red-700">
                            Slettefrist passert
                          </Badge>
                        )}
                        {doc.legalRef && (
                          <Badge variant="secondary" className="text-xs">
                            {doc.legalRef}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {doc.fileName} · {formatFileSize(doc.fileSize)} · lastet opp{" "}
                        {format(new Date(doc.createdAt), "d. MMM yyyy", { locale: nb })}
                        {doc.uploadedBy.name ? ` av ${doc.uploadedBy.name}` : ""}
                      </p>
                      {doc.retainUntil && (
                        <p className="text-xs text-muted-foreground">
                          Oppbevares til {format(new Date(doc.retainUntil), "d. MMM yyyy", { locale: nb })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/personnel/${doc.id}/download`}>
                          <Download className="mr-2 h-4 w-4" />
                          Last ned
                        </a>
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDelete(doc.id)}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
