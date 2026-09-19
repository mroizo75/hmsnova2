"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle2, FileSpreadsheet, Upload, UserPlus } from "lucide-react";
import {
  importUsersForTenantAsStaff,
  inviteUserForTenantAsStaff,
} from "@/server/actions/admin-user-import.actions";
import { USER_IMPORT_ROLES } from "@/lib/user-import-rows";

interface AdminTenantUsersCardProps {
  tenantId: string;
  users: Array<{
    id: string;
    role: string;
    user: {
      name: string | null;
      email: string;
      emailVerified: Date | null;
      createdAt: Date;
    };
  }>;
}

export function AdminTenantUsersCard({ tenantId, users }: AdminTenantUsersCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPending, startImport] = useTransition();
  const [invitePending, startInvite] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("ANSATT");

  const handleImport = () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "Velg fil",
        description: "Velg en CSV- eller Excel-fil først.",
      });
      return;
    }

    startImport(async () => {
      const formData = new FormData();
      formData.set("tenantId", tenantId);
      formData.set("file", importFile);
      const result = await importUsersForTenantAsStaff(formData);
      setImportFile(null);

      if (result.success === false) {
        toast({
          variant: "destructive",
          title: "Import feilet",
          description: result.error,
        });
        return;
      }

      const baseMsg =
        result.skipped > 0
          ? `${result.imported} importert, ${result.skipped} allerede medlem. Invitasjon er sendt på e-post.`
          : `${result.imported} brukere importert. Invitasjon er sendt på e-post.`;
      const warningMsg =
        result.errors.length > 0
          ? ` ${result.errors.length} merknad${result.errors.length === 1 ? "" : "er"}: ${result.errors[0]}`
          : "";
      toast({
        title: "Import fullført",
        description: baseMsg + warningMsg,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    });
  };

  const handleInvite = () => {
    startInvite(async () => {
      const result = await inviteUserForTenantAsStaff({
        tenantId,
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });

      if (result.success === false) {
        toast({
          variant: "destructive",
          title: "Invitasjon feilet",
          description: result.error,
        });
        return;
      }

      toast({
        title: "Bruker invitert",
        description: `${inviteEmail} er lagt til og får invitasjon på e-post.`,
        className: "bg-green-50 border-green-200",
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("ANSATT");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brukere ({users.length})</CardTitle>
        <CardDescription>
          Importer eller inviter brukere på vegne av bedriften. Samme filformat som bedriftene bruker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <input
              type="file"
              accept=".csv,.xlsx"
              className="max-w-[220px] text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              disabled={importPending}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleImport}
              disabled={importPending || !importFile}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {importPending ? "Importerer..." : "Importer"}
            </Button>
            <a
              href="/api/users/import-example"
              download="bruker-import-eksempel.xlsx"
              className="text-xs text-muted-foreground hover:underline"
            >
              Last ned Excel-eksempel
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Påkrevd: e-post og navn. Valgfritt: rolle, stilling, avdeling, leder og ansattnummer.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Inviter én bruker</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-invite-name">Navn</Label>
              <Input
                id="staff-invite-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Ola Nordmann"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-invite-email">E-post</Label>
              <Input
                id="staff-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="ola@bedrift.no"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_IMPORT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleInvite}
                disabled={invitePending || !inviteEmail || !inviteName}
                className="w-full"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {invitePending ? "Sender..." : "Inviter"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen brukere i bedriften ennå.</p>
          ) : (
            users.map((userTenant) => (
              <div
                key={userTenant.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{userTenant.user.name || "Ukjent"}</p>
                  <p className="text-sm text-muted-foreground">{userTenant.user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opprettet: {new Date(userTenant.user.createdAt).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {userTenant.user.emailVerified && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verifisert
                    </Badge>
                  )}
                  <Badge variant="secondary">{userTenant.role}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
