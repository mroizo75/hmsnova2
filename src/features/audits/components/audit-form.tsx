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
import { Card, CardContent } from "@/components/ui/card";
import { createAudit, updateAudit } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck } from "lucide-react";
import type { Audit } from "@prisma/client";

interface AuditFormProps {
  tenantId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  audit?: Audit;
  mode?: "create" | "edit";
}

export function AuditForm({ tenantId, users, audit, mode = "create" }: AuditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>(
    audit?.teamMemberIds ? JSON.parse(audit.teamMemberIds) : []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const status = formData.get("status") as string;
    
    const data = {
      tenantId,
      title: formData.get("title") as string,
      auditType: formData.get("auditType") as string,
      scope: formData.get("scope") as string,
      criteria: formData.get("criteria") as string,
      leadAuditorId: formData.get("leadAuditorId") as string,
      teamMemberIds: selectedTeamMembers,
      scheduledDate: formData.get("scheduledDate") as string,
      area: formData.get("area") as string,
      department: formData.get("department") as string || undefined,
      status,
      // Sett completedAt automatisk når status endres til COMPLETED
      ...(status === "COMPLETED" && !audit?.completedAt ? { completedAt: new Date() } : {}),
      summary: formData.get("summary") as string || undefined,
      conclusion: formData.get("conclusion") as string || undefined,
    };

    try {
      const result =
        mode === "edit" && audit
          ? await updateAudit({ id: audit.id, ...data })
          : await createAudit(data);

      if (result.success) {
        toast({
          title: mode === "edit" ? "✅ Revisjon oppdatert" : "✅ Revisjon opprettet",
          description: mode === "edit" ? "Endringene er lagret" : "Revisjonen er planlagt",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/audits");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre revisjon",
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Q1 2025 Internrevisjon HMS"
              required
              disabled={loading}
              defaultValue={audit?.title}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="auditType">Type revisjon *</Label>
              <Select
                name="auditType"
                required
                disabled={loading}
                defaultValue={audit?.auditType || "INTERNAL"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internrevisjon</SelectItem>
                  <SelectItem value="EXTERNAL">Ekstern revisjon</SelectItem>
                  <SelectItem value="SUPPLIER">Leverandørrevisjon</SelectItem>
                  <SelectItem value="CERTIFICATION">Sertifiseringsrevisjon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                name="status"
                required
                disabled={loading}
                defaultValue={audit?.status || "PLANNED"}
              >
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Omfang (ISO 9001) *</Label>
            <Textarea
              id="scope"
              name="scope"
              rows={3}
              placeholder="Beskriv hva som skal revideres. F.eks. 'HMS-system og prosedyrer for avdeling A og B, med fokus på risikovurderinger og opplæring'"
              required
              disabled={loading}
              minLength={20}
              defaultValue={audit?.scope}
            />
            <p className="text-sm text-muted-foreground">
              ISO 9001: Definer tydelig hva som skal dekkes av revisjonen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="criteria">Revisjonskriterier (ISO 9001) *</Label>
            <Textarea
              id="criteria"
              name="criteria"
              rows={3}
              placeholder="Hvilke krav og standarder skal revisjonen vurderes mot? F.eks. 'ISO 9001:2015 kapittel 7.2 (Kompetanse), 8.5 (Produksjon), interne HMS-prosedyrer'"
              required
              disabled={loading}
              minLength={20}
              defaultValue={audit?.criteria}
            />
            <p className="text-sm text-muted-foreground">
              ISO 9001: Spesifiser hvilke krav og standarder som skal brukes
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Område *</Label>
              <Input
                id="area"
                name="area"
                placeholder="F.eks. HMS, Kvalitet, Miljø"
                required
                disabled={loading}
                defaultValue={audit?.area}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Avdeling (valgfritt)</Label>
              <Input
                id="department"
                name="department"
                placeholder="F.eks. Produksjon, Lager"
                disabled={loading}
                defaultValue={audit?.department || ""}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leadAuditorId">Hovedrevisor (ISO 9001) *</Label>
              <Select
                name="leadAuditorId"
                required
                disabled={loading}
                defaultValue={audit?.leadAuditorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg hovedrevisor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                ISO 9001: Sikre objektivitet og upartiskhet
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Planlagt dato *</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                required
                disabled={loading}
                defaultValue={
                  audit?.scheduledDate
                    ? new Date(audit.scheduledDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Revisjonsteam (valgfritt)</Label>
            <div className="border rounded-lg p-4 space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`team-${user.id}`}
                    checked={selectedTeamMembers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTeamMembers([...selectedTeamMembers, user.id]);
                      } else {
                        setSelectedTeamMembers(
                          selectedTeamMembers.filter((id) => id !== user.id)
                        );
                      }
                    }}
                    className="h-4 w-4"
                    disabled={loading}
                  />
                  <Label htmlFor={`team-${user.id}`} className="font-normal">
                    {user.name || user.email}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Velg flere personer som skal delta i revisjonen
            </p>
          </div>

          {mode === "edit" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="summary">Oppsummering (valgfritt)</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  rows={4}
                  placeholder="Oppsummer revisjonen når den er fullført..."
                  disabled={loading}
                  defaultValue={audit?.summary || ""}
                />
                <p className="text-sm text-muted-foreground">
                  Kan også legges til via "Fullfør revisjon"-knappen
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conclusion">Konklusjon (valgfritt)</Label>
                <Textarea
                  id="conclusion"
                  name="conclusion"
                  rows={4}
                  placeholder="Konklusjon og anbefalinger..."
                  disabled={loading}
                  defaultValue={audit?.conclusion || ""}
                />
                <p className="text-sm text-muted-foreground">
                  Kan også legges til via "Fullfør revisjon"-knappen
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-blue-900 mb-2">
            📋 ISO 9001 - 9.2 Internrevisjon
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Definer tydelig omfang og kriterier</li>
            <li>Velg objektive og upartiske revisorer</li>
            <li>Planlegg revisjoner med jevne intervaller</li>
            <li>Dokumenter alle funn og observasjoner</li>
            <li>Rapporter resultatene til relevant ledelse</li>
            <li>Ta korrigerende tiltak uten unødig forsinkelse</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : mode === "edit" ? "Lagre endringer" : "Opprett revisjon"}
        </Button>
      </div>
    </form>
  );
}

