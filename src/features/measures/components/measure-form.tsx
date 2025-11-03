"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createMeasure } from "@/server/actions/measure.actions";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface MeasureFormProps {
  tenantId: string;
  riskId?: string;
  incidentId?: string;
  auditId?: string;
  goalId?: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  trigger?: React.ReactNode;
}

export function MeasureForm({ tenantId, riskId, incidentId, auditId, goalId, users, trigger }: MeasureFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tenantId,
      riskId,
      incidentId,
      auditId,
      goalId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      dueAt: formData.get("dueAt") as string,
      responsibleId: formData.get("responsibleId") as string,
      status: "PENDING",
    };

    try {
      const result = await createMeasure(data);

      if (result.success) {
        toast({
          title: "✅ Tiltak opprettet",
          description: "Tiltaket er lagt til og ansvarlig person vil bli varslet",
          className: "bg-green-50 border-green-200",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke opprette tiltak",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt tiltak
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nytt tiltak</DialogTitle>
          <DialogDescription>
            ISO 9001: Tiltak må ha ansvarlig person, frist og tydelig beskrivelse
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Installere gelender på tak"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Beskriv hva som skal gjøres, hvordan, og eventuelle ressurser som trengs"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsibleId">Ansvarlig person *</Label>
              <Select name="responsibleId" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansvarlig" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueAt">Frist *</Label>
              <Input
                id="dueAt"
                name="dueAt"
                type="date"
                required
                disabled={loading}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">ℹ️ ISO 9001 Compliance</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Alle tiltak må ha en <strong>ansvarlig person</strong></li>
              <li>Tiltak må ha en realistisk <strong>tidsplan/frist</strong></li>
              <li>Tiltak må <strong>dokumenteres</strong> og følges opp</li>
              <li>Tiltak må <strong>evalueres</strong> når de er fullført</li>
            </ul>
          </div>

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
              {loading ? "Oppretter..." : "Opprett tiltak"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

