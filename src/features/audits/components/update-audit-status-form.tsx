"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { updateAudit } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";

interface UpdateAuditStatusFormProps {
  auditId: string;
  currentStatus: string;
  trigger?: React.ReactNode;
}

export function UpdateAuditStatusForm({
  auditId,
  currentStatus,
  trigger,
}: UpdateAuditStatusFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newStatus = formData.get("status") as string;

    const data = {
      id: auditId,
      status: newStatus as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
    };

    const result = await updateAudit(data);

    if (result.success) {
      toast({
        title: "✅ Status oppdatert",
        description: `Revisjonsstatusen er endret til "${getStatusLabel(newStatus)}"`,
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere status",
      });
    }

    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PLANNED: "Planlagt",
      IN_PROGRESS: "Pågår",
      COMPLETED: "Fullført",
      CANCELLED: "Avbrutt",
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Endre status
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Endre revisjonsstatus</DialogTitle>
          <DialogDescription>
            Oppdater statusen for revisjonen
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Ny status *</Label>
            <Select name="status" required disabled={loading} defaultValue={currentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Velg status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Planlagt</SelectItem>
                <SelectItem value="IN_PROGRESS">Pågår</SelectItem>
                <SelectItem value="COMPLETED">Fullført</SelectItem>
                <SelectItem value="CANCELLED">Avbrutt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900">
                <strong>Tips:</strong> Bruk "Fullfør revisjon"-knappen for å legge til
                oppsummering og konklusjon når revisjonen er ferdig.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Oppdaterer..." : "Oppdater status"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

