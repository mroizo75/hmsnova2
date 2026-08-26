"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Wrench,
  Eye,
  UserPlus,
  Loader2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  inviteGroupUserByEmail,
  updateGroupUserRole,
  removeGroupUser,
} from "@/server/actions/corporate-group.actions";

interface GroupUser {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
}

interface KonsernUserManagementProps {
  initialUsers: GroupUser[];
}

const roleConfig = {
  GROUP_ADMIN: { label: "Administrator", icon: Shield, color: "bg-red-50 text-red-700" },
  GROUP_HMS: { label: "HMS-ansvarlig", icon: Wrench, color: "bg-blue-50 text-blue-700" },
  GROUP_READER: { label: "Leser", icon: Eye, color: "bg-gray-100 text-gray-600" },
} as const;

type RoleKey = keyof typeof roleConfig;

export function KonsernUserManagement({ initialUsers }: KonsernUserManagementProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleKey>("GROUP_HMS");
  const [inviting, startInviting] = useTransition();

  function handleInvite() {
    if (!email.includes("@")) return;
    startInviting(async () => {
      try {
        const result = await inviteGroupUserByEmail(email.trim(), role);
        toast({
          title: "Bruker lagt til",
          description: `${result.userEmail} ble lagt til som ${roleConfig[role].label}`,
        });
        setEmail("");
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleRoleChange(userId: string, newRole: RoleKey) {
    startInviting(async () => {
      try {
        await updateGroupUserRole(userId, newRole);
        toast({ title: "Rolle oppdatert" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleRemove(userId: string, userName: string) {
    if (!confirm(`Fjerne ${userName} fra konsernet?`)) return;
    startInviting(async () => {
      try {
        await removeGroupUser(userId);
        toast({ title: "Bruker fjernet" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Inviter ny bruker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Legg til bruker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">E-postadresse</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bruker@eksempel.no"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInvite();
                  }
                }}
              />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Label>Rolle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP_ADMIN">Administrator</SelectItem>
                  <SelectItem value="GROUP_HMS">HMS-ansvarlig</SelectItem>
                  <SelectItem value="GROUP_READER">Leser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting || !email.includes("@")}>
              {inviting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Legg til
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Brukeren får tilgang til konsernoversikten med valgt rolle. Hvis brukeren ikke eksisterer,
            opprettes en konto automatisk.
          </p>
        </CardContent>
      </Card>

      {/* Brukerliste */}
      {initialUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Brukere ({initialUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {initialUsers.map((user) => {
                const rc = roleConfig[user.role as RoleKey] ?? roleConfig.GROUP_READER;
                const RoleIcon = rc.icon;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${rc.color}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {rc.label}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(Object.keys(roleConfig) as RoleKey[])
                            .filter((r) => r !== user.role)
                            .map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => handleRoleChange(user.userId, r)}
                              >
                                Endre til {roleConfig[r].label}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700"
                            onClick={() => handleRemove(user.userId, user.name)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Fjern fra konsern
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
