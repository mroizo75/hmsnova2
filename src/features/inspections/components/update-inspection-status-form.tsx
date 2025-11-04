"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface UpdateInspectionStatusFormProps {
  inspectionId: string;
  currentStatus: string;
}

export function UpdateInspectionStatusForm({
  inspectionId,
  currentStatus,
}: UpdateInspectionStatusFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const status = formData.get("status") as string;
    
    const data: any = { status };
    
    // Hvis status endres til COMPLETED, sett completedDate
    if (status === "COMPLETED") {
      data.completedDate = new Date().toISOString();
    }

    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Kunne ikke oppdatere status");
      }

      toast({
        title: "Status oppdatert",
        description: "Inspeksjonsstatus er nå endret",
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
          <RefreshCw className="mr-2 h-4 w-4" />
          Endre status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Endre inspeksjonsstatus</DialogTitle>
          <DialogDescription>Oppdater status for inspeksjonen</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={currentStatus} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Planlagt</SelectItem>
                <SelectItem value="IN_PROGRESS">Pågår</SelectItem>
                <SelectItem value="COMPLETED">Fullført</SelectItem>
                <SelectItem value="CANCELLED">Avbrutt</SelectItem>
              </SelectContent>
            </Select>
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

