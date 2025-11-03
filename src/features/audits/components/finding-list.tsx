"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Trash2, Edit } from "lucide-react";
import { deleteFinding, updateFinding, verifyFinding } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import {
  getFindingTypeLabel,
  getFindingTypeColor,
  getFindingStatusLabel,
  getFindingStatusColor,
} from "@/features/audits/schemas/audit.schema";
import type { AuditFinding } from "@prisma/client";

interface FindingListProps {
  findings: AuditFinding[];
}

export function FindingList({ findings }: FindingListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette dette funnet?\n\nDette kan ikke angres.")) {
      return;
    }

    setLoading(id);
    const result = await deleteFinding(id);
    if (result.success) {
      toast({
        title: "🗑️ Funn slettet",
        description: "Revisjonsfunnet er fjernet",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette funn",
      });
    }
    setLoading(null);
  };

  const handleUpdateStatus = async (finding: AuditFinding, status: string) => {
    setLoading(finding.id);
    const result = await updateFinding({ id: finding.id, status });
    if (result.success) {
      toast({
        title: "✅ Status oppdatert",
        description: `Funnet er nå "${getFindingStatusLabel(status)}"`,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere status",
      });
    }
    setLoading(null);
  };

  const handleVerify = async (id: string) => {
    if (!confirm("Er du sikker på at dette funnet er løst og verifisert?")) {
      return;
    }

    setLoading(id);
    const result = await verifyFinding(id);
    if (result.success) {
      toast({
        title: "✅ Funn verifisert",
        description: "Funnet er nå lukket og verifisert",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke verifisere funn",
      });
    }
    setLoading(null);
  };

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
        <h3 className="text-xl font-semibold">Ingen funn registrert</h3>
        <p className="text-muted-foreground">
          Ingen avvik eller observasjoner er dokumentert for denne revisjonen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => {
        const typeLabel = getFindingTypeLabel(finding.findingType);
        const typeColor = getFindingTypeColor(finding.findingType);
        const statusLabel = getFindingStatusLabel(finding.status);
        const statusColor = getFindingStatusColor(finding.status);

        const isOverdue =
          finding.dueDate &&
          new Date(finding.dueDate) < new Date() &&
          finding.status !== "VERIFIED";

        return (
          <Card key={finding.id} className={isOverdue ? "border-red-300" : ""}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={typeColor}>{typeLabel}</Badge>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      <Badge variant="outline">Klausul {finding.clause}</Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Forfalt
                        </Badge>
                      )}
                    </div>
                    {finding.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Frist: {new Date(finding.dueDate).toLocaleDateString("nb-NO")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Oppdater funn</DialogTitle>
                          <DialogDescription>
                            Legg til korrigerende tiltak og årsaksanalyse
                          </DialogDescription>
                        </DialogHeader>
                        <CorrectiveActionForm finding={finding} />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(finding.id)}
                      disabled={loading === finding.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Beskrivelse:</p>
                    <p className="text-sm">{finding.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bevis:</p>
                    <p className="text-sm">{finding.evidence}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Krav:</p>
                    <p className="text-sm">{finding.requirement}</p>
                  </div>
                </div>

                {/* Corrective Action */}
                {finding.correctiveAction && (
                  <div className="space-y-2 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Korrigerende tiltak:
                      </p>
                      <p className="text-sm">{finding.correctiveAction}</p>
                    </div>
                    {finding.rootCause && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Årsaksanalyse:
                        </p>
                        <p className="text-sm">{finding.rootCause}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {finding.status !== "VERIFIED" && (
                  <div className="flex gap-2 border-t pt-4">
                    {finding.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(finding, "IN_PROGRESS")}
                        disabled={loading === finding.id}
                      >
                        Start arbeid
                      </Button>
                    )}
                    {finding.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(finding, "RESOLVED")}
                        disabled={loading === finding.id}
                      >
                        Marker som løst
                      </Button>
                    )}
                    {finding.status === "RESOLVED" && (
                      <Button
                        size="sm"
                        onClick={() => handleVerify(finding.id)}
                        disabled={loading === finding.id}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Verifiser lukking
                      </Button>
                    )}
                  </div>
                )}

                {/* Verified info */}
                {finding.status === "VERIFIED" && finding.verifiedAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900">
                      ✅ Verifisert lukket
                    </p>
                    <p className="text-sm text-green-800">
                      {new Date(finding.verifiedAt).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Corrective Action Form Component
function CorrectiveActionForm({ finding }: { finding: AuditFinding }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: finding.id,
      correctiveAction: formData.get("correctiveAction") as string,
      rootCause: formData.get("rootCause") as string,
    };

    const result = await updateFinding(data);

    if (result.success) {
      toast({
        title: "✅ Funn oppdatert",
        description: "Korrigerende tiltak er dokumentert",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere funn",
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="correctiveAction">Korrigerende tiltak (ISO 9001) *</Label>
        <Textarea
          id="correctiveAction"
          name="correctiveAction"
          rows={4}
          placeholder="Beskriv hvilke tiltak som er/skal iverksettes for å lukke funnet..."
          required
          disabled={loading}
          minLength={20}
          defaultValue={finding.correctiveAction || ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rootCause">Årsaksanalyse (ISO 9001)</Label>
        <Textarea
          id="rootCause"
          name="rootCause"
          rows={3}
          placeholder="Hva er grunnårsaken til avviket?"
          disabled={loading}
          defaultValue={finding.rootCause || ""}
        />
        <p className="text-sm text-muted-foreground">
          ISO 9001: Identifiser og eliminer grunnårsaken
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900">
            ISO 9001: Korrigerende tiltak skal eliminere årsaken til avviket for å forhindre
            gjentakelse.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : "Lagre tiltak"}
        </Button>
      </div>
    </form>
  );
}

