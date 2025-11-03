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
import { Card, CardContent } from "@/components/ui/card";
import { createFinding } from "@/server/actions/audit.actions";
import { ISO_9001_CLAUSES } from "@/features/audits/schemas/audit.schema";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface FindingFormProps {
  auditId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  trigger?: React.ReactNode;
}

export function FindingForm({ auditId, users, trigger }: FindingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      auditId,
      findingType: formData.get("findingType") as string,
      clause: formData.get("clause") as string,
      description: formData.get("description") as string,
      evidence: formData.get("evidence") as string,
      requirement: formData.get("requirement") as string,
      responsibleId: formData.get("responsibleId") as string,
      dueDate: formData.get("dueDate") as string || undefined,
    };

    const result = await createFinding(data);

    if (result.success) {
      toast({
        title: "✅ Funn registrert",
        description: "Revisjonsfunnet er dokumentert",
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke registrere funn",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Registrer funn
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrer revisjonsfunn</DialogTitle>
          <DialogDescription>
            ISO 9001: Dokumenter funn, avvik og observasjoner fra revisjonen
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="findingType">Type funn *</Label>
              <Select name="findingType" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAJOR_NC">Større avvik (Major NC)</SelectItem>
                  <SelectItem value="MINOR_NC">Mindre avvik (Minor NC)</SelectItem>
                  <SelectItem value="OBSERVATION">Observasjon</SelectItem>
                  <SelectItem value="STRENGTH">Styrke (god praksis)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clause">ISO 9001 Klausul *</Label>
              <Select name="clause" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg klausul" />
                </SelectTrigger>
                <SelectContent>
                  {ISO_9001_CLAUSES.map((c) => (
                    <SelectItem key={c.clause} value={c.clause}>
                      {c.clause} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse av funn *</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Beskriv hva som ble observert..."
              required
              disabled={loading}
              minLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence">Bevis/Observasjon (ISO 9001) *</Label>
            <Textarea
              id="evidence"
              name="evidence"
              rows={3}
              placeholder="Konkret bevis for funnet. F.eks. 'Gjennomgang av opplæringsoversikten viste at 3 av 8 ansatte mangler obligatorisk HMS-opplæring'"
              required
              disabled={loading}
              minLength={10}
            />
            <p className="text-sm text-muted-foreground">
              ISO 9001: Dokumenter objektive observasjoner
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirement">Krav som ikke er oppfylt *</Label>
            <Textarea
              id="requirement"
              name="requirement"
              rows={2}
              placeholder="Hvilket krav i ISO 9001 eller interne prosedyrer er ikke oppfylt?"
              required
              disabled={loading}
              minLength={10}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsibleId">Ansvarlig for lukking *</Label>
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
              <Label htmlFor="dueDate">Frist for lukking</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                disabled={loading}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                💡 Typer av funn:
              </p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li><strong>Større avvik:</strong> Kritisk avvik fra ISO 9001 krav</li>
                <li><strong>Mindre avvik:</strong> Mindre alvorlig avvik som må lukkes</li>
                <li><strong>Observasjon:</strong> Potensielt problem som bør følges opp</li>
                <li><strong>Styrke:</strong> God praksis som bør deles</li>
              </ul>
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
              {loading ? "Registrerer..." : "Registrer funn"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

