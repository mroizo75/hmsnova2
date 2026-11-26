"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createAssignment } from "@/server/actions/assignment.actions";
import {
  EMPTY_INDUCTION,
  INDUCTION_KEYS,
  INDUCTION_LABELS,
  type InductionChecklist,
} from "@/features/assignments/lib/deployment-gate";
import { assignmentStatuses, assignmentStatusLabels } from "@/features/assignments/schemas/assignment.schema";

const NONE = "__none__";

interface Option {
  id: string;
  name: string | null;
  email?: string;
  address?: string | null;
}

interface AssignmentFormProps {
  users: Option[];
  workplaces: Option[];
  profiles: Option[];
  projects: Option[];
}

export function AssignmentForm({ users, workplaces, profiles, projects }: AssignmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [workplaceId, setWorkplaceId] = useState("");
  const [createWorkplace, setCreateWorkplace] = useState(workplaces.length === 0);
  const [profileId, setProfileId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<(typeof assignmentStatuses)[number]>("PLANLAGT");
  const [induction, setInduction] = useState<InductionChecklist>({ ...EMPTY_INDUCTION });
  const [coordinationNoted, setCoordinationNoted] = useState(false);
  const [clientRiskReceived, setClientRiskReceived] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const result = await createAssignment({
      userId,
      clientWorkplaceId: createWorkplace ? "" : workplaceId,
      newWorkplace: createWorkplace
        ? {
            name: String(form.get("workplaceName") ?? ""),
            orgNumber: String(form.get("orgNumber") ?? ""),
            contactName: String(form.get("contactName") ?? ""),
            contactPhone: String(form.get("contactPhone") ?? ""),
            contactEmail: String(form.get("contactEmail") ?? ""),
            address: String(form.get("address") ?? ""),
            industry: String(form.get("industry") ?? ""),
            siteLeaderName: String(form.get("siteLeaderName") ?? ""),
          }
        : undefined,
      projectId,
      competenceProfileId: profileId,
      roleTitle: String(form.get("roleTitle") ?? ""),
      status,
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      induction,
      coordinationNoted,
      coordinationAt: String(form.get("coordinationAt") ?? ""),
      coordinationContact: String(form.get("coordinationContact") ?? ""),
      clientRiskReceived,
      notes: String(form.get("notes") ?? ""),
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "Oppdraget ble ikke opprettet", description: result.error });
      return;
    }
    router.push(`/dashboard/oppdrag/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Medarbeider og innleier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Medarbeider</Label>
            <Select value={userId || NONE} onValueChange={(value) => setUserId(value === NONE ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Velg medarbeider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Velg medarbeider</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleTitle">Rolle hos kunden</Label>
            <Input id="roleTitle" name="roleTitle" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Prosjekt for timer</Label>
            <Select value={projectId || NONE} onValueChange={(value) => setProjectId(value === NONE ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Valgfritt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen prosjektkobling</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kompetanseprofil</Label>
            <Select value={profileId || NONE} onValueChange={(value) => setProfileId(value === NONE ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Valgfritt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen profil</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Startdato</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Sluttdato</Label>
            <Input id="endDate" name="endDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignmentStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {assignmentStatusLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Innleier og arbeidssted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workplaces.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={createWorkplace} onCheckedChange={(value) => setCreateWorkplace(value === true)} />
              Registrer ny innleier
            </label>
          )}
          {!createWorkplace && (
            <Select value={workplaceId || NONE} onValueChange={(value) => setWorkplaceId(value === NONE ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Velg innleier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Velg innleier</SelectItem>
                {workplaces.map((workplace) => (
                  <SelectItem key={workplace.id} value={workplace.id}>
                    {workplace.name}
                    {workplace.address ? ` · ${workplace.address}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {createWorkplace && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="workplaceName">Navn</Label>
                <Input id="workplaceName" name="workplaceName" required={createWorkplace} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgNumber">Org.nr</Label>
                <Input id="orgNumber" name="orgNumber" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Bransje på stedet</Label>
                <Input id="industry" name="industry" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" name="address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Kontakt hos kunden</Label>
                <Input id="contactName" name="contactName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefon</Label>
                <Input id="contactPhone" name="contactPhone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">E-post</Label>
                <Input id="contactEmail" name="contactEmail" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteLeaderName">Arbeidsleder på stedet</Label>
                <Input id="siteLeaderName" name="siteLeaderName" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Innføring og samordning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {INDUCTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={induction[key]}
                onCheckedChange={(value) => setInduction((current) => ({ ...current, [key]: value === true }))}
              />
              {INDUCTION_LABELS[key]}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={coordinationNoted} onCheckedChange={(value) => setCoordinationNoted(value === true)} />
            Samordning med innleier er avtalt
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={clientRiskReceived} onCheckedChange={(value) => setClientRiskReceived(value === true)} />
            Kundens risikovurdering eller SJA er mottatt
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coordinationAt">Dato for samordning</Label>
              <Input id="coordinationAt" name="coordinationAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinationContact">Kontakt i samordningen</Label>
              <Input id="coordinationContact" name="coordinationContact" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notat</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <p className="text-sm text-muted-foreground">
            Status utplassert krever at påkrevd kompetanse er gyldig og at innføringen er bekreftet.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving || !userId}>
        {saving ? "Lagrer..." : "Opprett oppdrag"}
      </Button>
    </form>
  );
}
