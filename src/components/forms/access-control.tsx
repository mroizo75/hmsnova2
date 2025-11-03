"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, User } from "lucide-react";

interface AccessControlProps {
  tenantId: string;
  accessType: string;
  allowedRoles: string[];
  allowedUsers: string[];
  onAccessTypeChange: (type: string) => void;
  onAllowedRolesChange: (roles: string[]) => void;
  onAllowedUsersChange: (users: string[]) => void;
}

const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "HMS", label: "HMS-ansvarlig" },
  { value: "LEDER", label: "Leder" },
  { value: "VERNEOMBUD", label: "Verneombud" },
  { value: "ANSATT", label: "Ansatt" },
  { value: "BHT", label: "BHT" },
  { value: "REVISOR", label: "Revisor" },
];

export function AccessControl({
  tenantId,
  accessType,
  allowedRoles,
  allowedUsers,
  onAccessTypeChange,
  onAllowedRolesChange,
  onAllowedUsersChange,
}: AccessControlProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hent brukere for denne tenanten
    fetch(`/api/tenants/${tenantId}/users`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tenantId]);

  function toggleRole(role: string) {
    if (allowedRoles.includes(role)) {
      onAllowedRolesChange(allowedRoles.filter((r) => r !== role));
    } else {
      onAllowedRolesChange([...allowedRoles, role]);
    }
  }

  function toggleUser(userId: string) {
    if (allowedUsers.includes(userId)) {
      onAllowedUsersChange(allowedUsers.filter((u) => u !== userId));
    } else {
      onAllowedUsersChange([...allowedUsers, userId]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Access type selector */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-lg mb-4 block">Hvem skal ha tilgang?</Label>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => onAccessTypeChange("ALL")}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${accessType === "ALL" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    accessType === "ALL" ? "border-primary" : "border-gray-300"
                  }`}>
                    {accessType === "ALL" && (
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="font-medium">Alle ansatte</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Alle i bedriften kan fylle ut skjemaet
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onAccessTypeChange("ROLES")}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${accessType === "ROLES" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    accessType === "ROLES" ? "border-primary" : "border-gray-300"
                  }`}>
                    {accessType === "ROLES" && (
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="font-medium">Spesifikke roller</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kun utvalgte roller kan fylle ut
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onAccessTypeChange("USERS")}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${accessType === "USERS" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    accessType === "USERS" ? "border-primary" : "border-gray-300"
                  }`}>
                    {accessType === "USERS" && (
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <p className="font-medium">Spesifikke brukere</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kun utvalgte personer kan fylle ut
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onAccessTypeChange("ROLES_AND_USERS")}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${accessType === "ROLES_AND_USERS" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    accessType === "ROLES_AND_USERS" ? "border-primary" : "border-gray-300"
                  }`}>
                    {accessType === "ROLES_AND_USERS" && (
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="font-medium">Roller + spesifikke brukere</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kombinasjon av roller og utvalgte personer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role selection */}
      {(accessType === "ROLES" || accessType === "ROLES_AND_USERS") && (
        <Card>
          <CardContent className="p-6">
            <Label className="text-base mb-4 block">Velg roller</Label>
            <div className="space-y-3">
              {ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={allowedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <Label htmlFor={`role-${role.value}`} className="cursor-pointer flex-1">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
            {allowedRoles.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Valgte roller:</p>
                <div className="flex flex-wrap gap-2">
                  {allowedRoles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {ROLES.find((r) => r.value === role)?.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User selection */}
      {(accessType === "USERS" || accessType === "ROLES_AND_USERS") && (
        <Card>
          <CardContent className="p-6">
            <Label className="text-base mb-4 block">Velg brukere</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laster brukere...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen brukere funnet</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.userId} className="flex items-center space-x-3">
                    <Checkbox
                      id={`user-${user.userId}`}
                      checked={allowedUsers.includes(user.userId)}
                      onCheckedChange={() => toggleUser(user.userId)}
                    />
                    <Label htmlFor={`user-${user.userId}`} className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">{user.user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.user.email}</p>
                      </div>
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {allowedUsers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {allowedUsers.length} bruker{allowedUsers.length !== 1 ? "e" : ""} valgt
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

