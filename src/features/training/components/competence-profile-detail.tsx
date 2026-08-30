"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus, Pencil, ArrowLeft } from "lucide-react";
import {
  assignProfileToUser,
  removeProfileFromUser,
  removeRequirement,
} from "@/server/actions/competence.actions";

const LEVEL_LABELS: Record<string, string> = {
  REQUIRED: "Påkrevd",
  RECOMMENDED: "Anbefalt",
  AWARENESS: "Kjennskap",
};

const LEVEL_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  REQUIRED: "destructive",
  RECOMMENDED: "default",
  AWARENESS: "secondary",
};

interface Requirement {
  id: string;
  courseKey: string;
  requiredLevel: string;
  priority: number;
  legalRef: string | null;
  notes: string | null;
}

interface AssignedUser {
  user: { id: string; name: string | null; email: string };
}

interface Profile {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  isDefault: boolean;
  requirements: Requirement[];
  users: AssignedUser[];
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
}

interface CompetenceProfileDetailProps {
  profile: Profile;
  availableUsers: AvailableUser[];
  canEdit: boolean;
}

export function CompetenceProfileDetail({ profile, availableUsers, canEdit }: CompetenceProfileDetailProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const assignedIds = new Set(profile.users.map((u) => u.user.id));
  const unassignedUsers = availableUsers.filter((u) => !assignedIds.has(u.id));

  async function handleAssign() {
    if (!selectedUserId) return;
    setAssigning(true);
    await assignProfileToUser({ userId: selectedUserId, profileId: profile.id });
    setSelectedUserId("");
    setAssigning(false);
    router.refresh();
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm("Fjerne denne ansattes profil?")) return;
    await removeProfileFromUser(userId, profile.id);
    router.refresh();
  }

  async function handleRemoveReq(id: string) {
    if (!confirm("Fjerne dette kravet?")) return;
    await removeRequirement({ id });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/training/profiler">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          {profile.description && (
            <p className="text-muted-foreground mt-1">{profile.description}</p>
          )}
        </div>
        {canEdit && (
          <Link href={`/dashboard/training/profiler/${profile.id}?edit=true`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" /> Rediger
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kompetansekrav ({profile.requirements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ingen krav definert</p>
          ) : (
            <div className="divide-y">
              {profile.requirements.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium text-sm">{req.courseKey}</span>
                    {req.legalRef && (
                      <Badge variant="outline" className="ml-2 text-xs">{req.legalRef}</Badge>
                    )}
                    {req.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{req.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={LEVEL_VARIANT[req.requiredLevel] ?? "default"}>
                      {LEVEL_LABELS[req.requiredLevel] ?? req.requiredLevel}
                    </Badge>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveReq(req.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tildelte ansatte ({profile.users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && unassignedUsers.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Velg ansatt å tildele" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ?? u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!selectedUserId || assigning}>
                <UserPlus className="h-4 w-4 mr-1" />
                {assigning ? "Tildeler..." : "Tildel"}
              </Button>
            </div>
          )}

          {profile.users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ingen ansatte tildelt</p>
          ) : (
            <div className="divide-y">
              {profile.users.map(({ user }) => (
                <div key={user.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium">{user.name ?? "Uten navn"}</span>
                    <span className="text-xs text-muted-foreground ml-2">{user.email}</span>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveUser(user.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
