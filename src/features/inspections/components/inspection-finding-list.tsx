"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MapPin, Calendar, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: number;
  location: string | null;
  status: string;
  dueDate: Date | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  imageKeys: string | null;
}

interface InspectionFindingListProps {
  findings: Finding[];
}

function getSeverityBadge(severity: number) {
  const config: Record<number, { className: string; label: string }> = {
    1: { className: "bg-blue-100 text-blue-900 border-blue-200", label: "Lav" },
    2: { className: "bg-green-100 text-green-900 border-green-200", label: "Moderat" },
    3: { className: "bg-yellow-100 text-yellow-900 border-yellow-200", label: "Betydelig" },
    4: { className: "bg-orange-100 text-orange-900 border-orange-200", label: "Alvorlig" },
    5: { className: "bg-red-100 text-red-900 border-red-200", label: "Kritisk" },
  };
  const severityConfig = config[severity] || config[1];
  return <Badge className={severityConfig.className}>{severityConfig.label}</Badge>;
}

function getStatusBadge(status: string) {
  const config: Record<string, { className: string; label: string }> = {
    OPEN: { className: "bg-red-100 text-red-900 border-red-200", label: "Åpen" },
    IN_PROGRESS: { className: "bg-yellow-100 text-yellow-900 border-yellow-200", label: "Pågår" },
    RESOLVED: { className: "bg-green-100 text-green-900 border-green-200", label: "Løst" },
    CLOSED: { className: "bg-gray-100 text-gray-900 border-gray-200", label: "Lukket" },
  };
  return <Badge className={config[status]?.className || config.OPEN.className}>
    {config[status]?.label || status}
  </Badge>;
}

function UpdateFindingStatusDialog({ finding }: { finding: Finding }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      status: formData.get("status") as string,
      resolutionNotes: formData.get("resolutionNotes") as string,
    };

    try {
      const response = await fetch(`/api/inspections/findings/${finding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Kunne ikke oppdatere funn");
      }

      toast({
        title: "Funn oppdatert",
        description: "Status er nå endret",
      });

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Oppdater
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oppdater funn</DialogTitle>
          <DialogDescription>Endre status og legg til løsningsnotat</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={finding.status} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Åpen</SelectItem>
                <SelectItem value="IN_PROGRESS">Pågår</SelectItem>
                <SelectItem value="RESOLVED">Løst</SelectItem>
                <SelectItem value="CLOSED">Lukket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolutionNotes">Løsningsnotat</Label>
            <Textarea
              id="resolutionNotes"
              name="resolutionNotes"
              defaultValue={finding.resolutionNotes || ""}
              placeholder="Beskriv hvordan funnet er håndtert..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InspectionFindingList({ findings }: InspectionFindingListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${title}"?`)) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/inspections/findings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke slette funn");
      }

      toast({
        title: "Funn slettet",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (findings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => {
        const images = finding.imageKeys ? JSON.parse(finding.imageKeys) : [];
        
        return (
          <Card key={finding.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">{finding.title}</CardTitle>
                  {finding.location && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {finding.location}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getSeverityBadge(finding.severity)}
                  {getStatusBadge(finding.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Beskrivelse:</p>
                <p className="text-sm whitespace-pre-wrap">{finding.description}</p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((imageKey: string, idx: number) => (
                    <img
                      key={idx}
                      src={`/api/inspections/images/${imageKey}`}
                      alt="Bilde fra funn"
                      className="w-full h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              )}

              {finding.resolutionNotes && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Løsning:</p>
                  <p className="text-sm whitespace-pre-wrap text-green-800">
                    {finding.resolutionNotes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {finding.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Frist: {format(new Date(finding.dueDate), "d. MMM yyyy", { locale: nb })}</span>
                    </div>
                  )}

                  {finding.resolvedAt && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Løst: {format(new Date(finding.resolvedAt), "d. MMM yyyy", { locale: nb })}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <UpdateFindingStatusDialog finding={finding} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(finding.id, finding.title)}
                    disabled={deletingId === finding.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Slett
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

