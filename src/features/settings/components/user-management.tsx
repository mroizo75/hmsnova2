"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, Shield, User, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  inviteUser,
  updateUserRole,
  removeUserFromTenant,
  importUsersFromFile,
  activateUserInTenant,
  activateAllPendingUsers,
  updateEmployeeNumber,
  updateUserManager,
  updateUserPosition,
  assignManagerToUsers,
} from "@/server/actions/settings.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Send, HelpCircle, Pencil, Check, X } from "lucide-react";

interface UserManagementProps {
  users: Array<{
    userId: string;
    role: string;
    invitationSentAt: Date | null;
    employeeNumber: string | null;
    position: string | null;
    managerId: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      createdAt: Date;
    };
  }>;
  currentUserId: string;
  isAdmin: boolean;
  pricingTier: string | null;
  maxUsers: number;
}

const NO_MANAGER_VALUE = "__no_manager__";

export function UserManagement({ users, currentUserId, isAdmin, pricingTier, maxUsers }: UserManagementProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [activatingAll, setActivatingAll] = useState(false);
  const [editingEmployeeNumber, setEditingEmployeeNumber] = useState<string | null>(null);
  const [employeeNumberDraft, setEmployeeNumberDraft] = useState("");
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [positionDraft, setPositionDraft] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkManagerId, setBulkManagerId] = useState(NO_MANAGER_VALUE);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingActivationCount = users.filter(
    (u) => !u.invitationSentAt && u.userId !== currentUserId
  ).length;

  const currentUserCount = users.length;
  const remainingSlots = maxUsers - currentUserCount;
  const hasReachedLimit = currentUserCount >= maxUsers;

  const filteredUsers = searchQuery.trim().length > 0
    ? users.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          (u.user.name?.toLowerCase().includes(q)) ||
          u.user.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          (u.employeeNumber?.toLowerCase().includes(q)) ||
          (u.position?.toLowerCase().includes(q))
        );
      })
    : users;

  const userLabelById = new Map(
    users.map((u) => [u.userId, u.user.name || u.user.email] as const)
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Sjekk brukergrense FØR vi sender
    if (hasReachedLimit) {
      toast({
        variant: "destructive",
        title: "❌ Brukergrense nådd",
        description: `Du har nådd maks antall brukere (${maxUsers}) for din pakke. Oppgrader abonnementet for å legge til flere.`,
      });
      return;
    }

    setInviteLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      role: formData.get("role") as string,
    };

    const result = await inviteUser(data);

    if (result.success) {
      toast({
        title: "✅ Bruker invitert",
        description: `${data.email} er lagt til`,
        className: "bg-green-50 border-green-200",
      });
      setInviteOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke invitere bruker",
      });
    }

    setInviteLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(userId);
    const result = await updateUserRole(userId, newRole);

    if (result.success) {
      toast({
        title: "✅ Rolle oppdatert",
        description: "Brukerens rolle er endret",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere rolle",
      });
    }

    setLoading(null);
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Er du sikker på at du vil fjerne ${userName} fra bedriften?`)) {
      return;
    }

    setLoading(userId);
    const result = await removeUserFromTenant(userId);

    if (result.success) {
      toast({
        title: "🗑️ Bruker fjernet",
        description: `${userName} er fjernet fra bedriften`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke fjerne bruker",
      });
    }

    setLoading(null);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "Velg fil",
        description: "Velg en CSV- eller Excel-fil først.",
      });
      return;
    }
    if (hasReachedLimit) {
      toast({
        variant: "destructive",
        title: "Brukergrense nådd",
        description: `Du har nådd maks antall brukere (${maxUsers}). Oppgrader for å importere flere.`,
      });
      return;
    }
    setImportLoading(true);
    const formData = new FormData();
    formData.set("file", importFile);
    const result = await importUsersFromFile(formData);
    setImportLoading(false);
    setImportFile(null);

    if (!result.success) {
      const errMsg = "error" in result ? result.error : "Kunne ikke importere";
      toast({
        variant: "destructive",
        title: "Import feilet",
        description: errMsg,
      });
      return;
    }

    const baseMsg =
      result.skipped > 0
        ? `${result.imported} importert, ${result.skipped} allerede medlem. Aktiver brukere under Handlinger når du vil sende invitasjon.`
        : `${result.imported} brukere importert. Aktiver under Handlinger for å sende invitasjon.`;
    const warningMsg =
      result.errors.length > 0
        ? ` ${result.errors.length} rad${result.errors.length === 1 ? "" : "er"} fikk ikke leder: ${result.errors[0]}`
        : "";
    toast({
      title: "Import fullført",
      description: baseMsg + warningMsg,
      className: "bg-green-50 border-green-200",
    });
    router.refresh();
  };

  const handleActivate = async (userId: string) => {
    setActivatingUserId(userId);
    const result = await activateUserInTenant(userId);
    setActivatingUserId(null);
    if (result.success) {
      toast({
        title: "Bruker aktivert",
        description: "Invitasjon med passord er sendt på e-post.",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Kunne ikke aktivere",
        description: "error" in result ? result.error : "Kunne ikke aktivere bruker",
      });
    }
  };

  const handleActivateAll = async () => {
    if (pendingActivationCount === 0) return;
    if (
      !confirm(
        `Aktiver ${pendingActivationCount} bruker${pendingActivationCount === 1 ? "" : "e"}? Invitasjon med passord sendes til alle på e-post.`
      )
    ) {
      return;
    }
    setActivatingAll(true);
    const result = await activateAllPendingUsers();
    setActivatingAll(false);
    if (result.success) {
      const msg =
        result.failed > 0
          ? `${result.activated} aktivert, ${result.failed} feilet.${result.errors.length > 0 ? ` ${result.errors[0]}` : ""}`
          : `${result.activated} brukere aktivert – invitasjon sendt på e-post.`;
      toast({
        title: "Aktivering fullført",
        description: msg,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Kunne ikke aktivere",
        description: "error" in result ? result.error : "Kunne ikke aktivere",
      });
    }
  };

  const handleEmployeeNumberSave = async (userId: string) => {
    const result = await updateEmployeeNumber(userId, employeeNumberDraft);
    if (result.success) {
      toast({
        title: "Ansattnummer oppdatert",
        className: "bg-green-50 border-green-200",
      });
      setEditingEmployeeNumber(null);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere ansattnummer",
      });
    }
  };

  const handlePositionSave = async (userId: string) => {
    const result = await updateUserPosition(userId, positionDraft);
    if (result.success) {
      toast({
        title: "Stilling oppdatert",
        className: "bg-green-50 border-green-200",
      });
      setEditingPosition(null);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere stilling",
      });
    }
  };

  const handleManagerChange = async (userId: string, value: string) => {
    setLoading(userId);
    const result = await updateUserManager(
      userId,
      value === NO_MANAGER_VALUE ? null : value
    );
    setLoading(null);

    if (result.success) {
      toast({
        title: "Nærmeste leder oppdatert",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere nærmeste leder",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const toggleAllVisibleSelection = () => {
    const visibleIds = paginatedUsers.map((u) => u.userId);
    const allSelected = visibleIds.every((id) => selectedUserIds.includes(id));
    setSelectedUserIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const handleBulkManagerAssign = async () => {
    setBulkAssigning(true);
    const result = await assignManagerToUsers(
      selectedUserIds,
      bulkManagerId === NO_MANAGER_VALUE ? null : bulkManagerId
    );
    setBulkAssigning(false);

    if (result.success) {
      toast({
        title: "Nærmeste leder tildelt",
        description: `${result.updated} ansatt${result.updated === 1 ? "" : "e"} oppdatert`,
        className: "bg-green-50 border-green-200",
      });
      setSelectedUserIds([]);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke tildele nærmeste leder",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">⚙️ Admin</Badge>;
      case "LEDER":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">👔 Leder</Badge>;
      case "HMS":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">🦺 HMS-ansvarlig</Badge>;
      case "VERNEOMBUD":
        return <Badge className="bg-green-100 text-green-800 border-green-200">🛡️ Verneombud</Badge>;
      case "BHT":
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200">🩺 BHT</Badge>;
      case "REVISOR":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">📋 Revisor</Badge>;
      case "ANSATT":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">👤 Ansatt</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Finn pakkenavn basert på pricing tier
  const getPlanName = (tier: string | null) => {
    switch (tier) {
      case "MICRO":
        return "Små bedrifter (1-20 ansatte)";
      case "SMALL":
        return "Mellomstore bedrifter (21-50 ansatte)";
      case "MEDIUM":
      case "LARGE":
        return "Store bedrifter (51+ ansatte)";
      default:
        return "Standard pakke";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Brukere ({currentUserCount} / {maxUsers === 999 ? "∞" : maxUsers})
            </CardTitle>
            <CardDescription>
              Administrer brukere og deres tilgang • {getPlanName(pricingTier)}. Importer uten å sende invitasjon; aktiver under Handlinger for å sende e-post.
            </CardDescription>
          </div>
        </div>

          {isAdmin && (
            <div className="flex flex-col items-end gap-3">
              {remainingSlots <= 3 && remainingSlots > 0 && maxUsers !== 999 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{remainingSlots} ledig{remainingSlots === 1 ? '' : 'e'} plass{remainingSlots === 1 ? '' : 'er'}</span>
                </div>
              )}
              {maxUsers === 999 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <span>Ubegrenset brukere ✓</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="max-w-[180px] text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:hover:bg-primary/90"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    disabled={importLoading || (hasReachedLimit && maxUsers !== 999)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleImport}
                    disabled={importLoading || !importFile || (hasReachedLimit && maxUsers !== 999)}
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    {importLoading ? "Importerer..." : "Importer"}
                  </Button>
                  <a
                    href="/api/users/import-example"
                    download="bruker-import-eksempel.xlsx"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Last ned Excel-eksempel
                  </a>
                </div>

                <details className="group rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <HelpCircle className="h-4 w-4" />
                    Hvordan importere brukere?
                  </summary>
                  <div className="mt-3 space-y-2 border-t pt-3 text-muted-foreground">
                    <p><strong>1. Last ned eksempelfil</strong> – Klikk «Last ned Excel-eksempel» for å få en ferdig mal.</p>
                    <p><strong>2. Fyll ut Excel-filen</strong> – Bruk kolonnene <code className="rounded bg-muted px-1">email</code>, <code className="rounded bg-muted px-1">navn</code> og <code className="rounded bg-muted px-1">rolle</code>. Gyldige roller: ANSATT, LEDER, HMS, VERNEOMBUD, BHT, REVISOR, ADMIN.</p>
                    <p><strong>2b. Valgfritt: stilling og leder</strong> – Kolonnen <code className="rounded bg-muted px-1">stilling</code> tar en fritekst som «Tømrer», og <code className="rounded bg-muted px-1">leder</code> tar e-postadressen til nærmeste leder. Lederen kan stå hvor som helst i filen; koblingen gjøres etter at alle radene er lest. Ukjent leder-e-post gir en advarsel, men stopper ikke importen.</p>
                    <p><strong>3. Importer filen</strong> – Velg din fil og klikk «Importer». Brukere legges til uten invitasjon.</p>
                    <p><strong>4. Aktiver brukere</strong> – Klikk «Aktiver alle» for å sende invitasjon med passord til alle importerte brukere, eller aktiver en og en under Handlinger.</p>
                    <p className="text-xs pt-1">Støtter både .csv og .xlsx (Excel). Maks 500 brukere per import, filstørrelse inntil 2 MB.</p>
                  </div>
                </details>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button disabled={hasReachedLimit && maxUsers !== 999}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inviter bruker
                  </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inviter ny bruker</DialogTitle>
                  <DialogDescription>
                    Legg til en ny bruker i bedriften
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Navn *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Fornavn Etternavn"
                      required
                      disabled={inviteLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-post *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="bruker@bedrift.no"
                      required
                      disabled={inviteLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rolle *</Label>
                    <Select name="role" required disabled={inviteLoading} defaultValue="ANSATT">
                      <SelectTrigger>
                        <SelectValue placeholder="Velg rolle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANSATT">👤 Ansatt</SelectItem>
                        <SelectItem value="LEDER">👔 Leder</SelectItem>
                        <SelectItem value="HMS">🦺 HMS-ansvarlig</SelectItem>
                        <SelectItem value="VERNEOMBUD">🛡️ Verneombud</SelectItem>
                        <SelectItem value="BHT">🩺 Bedriftshelsetjeneste</SelectItem>
                        <SelectItem value="REVISOR">📋 Revisor</SelectItem>
                        <SelectItem value="ADMIN">⚙️ Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                      disabled={inviteLoading}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit" disabled={inviteLoading}>
                      {inviteLoading ? "Inviterer..." : "Inviter bruker"}
                    </Button>
                  </div>
                </form>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          )}
      </CardHeader>
      <CardContent>
        {pendingActivationCount > 0 && isAdmin && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              {pendingActivationCount} bruker{pendingActivationCount === 1 ? "" : "e"} venter på aktivering (invitasjon med passord)
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={handleActivateAll}
              disabled={activatingAll}
            >
              <Send className="mr-2 h-4 w-4" />
              {activatingAll ? "Aktiverer..." : "Aktiver alle"}
            </Button>
          </div>
        )}

        {users.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Søk etter navn, e-post, rolle..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Vis</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>per side</span>
            </div>
          </div>
        )}

        {isAdmin && selectedUserIds.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-blue-900">
              {selectedUserIds.length} ansatt{selectedUserIds.length === 1 ? "" : "e"} valgt.
              Sett nærmeste leder for alle på én gang.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={bulkManagerId} onValueChange={setBulkManagerId}>
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue placeholder="Velg nærmeste leder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MANAGER_VALUE}>Fjern nærmeste leder</SelectItem>
                  {users
                    .filter((candidate) => !selectedUserIds.includes(candidate.userId))
                    .map((candidate) => (
                      <SelectItem key={candidate.userId} value={candidate.userId}>
                        {candidate.user.name || candidate.user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkManagerAssign} disabled={bulkAssigning}>
                {bulkAssigning ? "Lagrer..." : "Sett nærmeste leder for valgte"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent text-foreground"
                onClick={() => setSelectedUserIds([])}
                disabled={bulkAssigning}
              >
                Nullstill valg
              </Button>
            </div>
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {searchQuery.trim().length > 0
              ? `Ingen brukere funnet for "${searchQuery}"`
              : "Ingen brukere funnet"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          paginatedUsers.length > 0 &&
                          paginatedUsers.every((u) => selectedUserIds.includes(u.userId))
                        }
                        onCheckedChange={toggleAllVisibleSelection}
                        aria-label="Velg alle synlige ansatte"
                      />
                    </TableHead>
                  )}
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Ansattnr.</TableHead>
                  <TableHead>Stilling</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Nærmeste leder</TableHead>
                  <TableHead>Medlem siden</TableHead>
                  {isAdmin && <TableHead className="text-right">Handlinger</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((userTenant) => {
                  const isCurrentUser = userTenant.userId === currentUserId;

                  return (
                    <TableRow key={userTenant.userId}>
                      {isAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(userTenant.userId)}
                            onCheckedChange={() => toggleUserSelection(userTenant.userId)}
                            aria-label={`Velg ${userTenant.user.name || userTenant.user.email}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {userTenant.user.name || "Ingen navn"}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2">
                            Deg
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{userTenant.user.email}</TableCell>
                      <TableCell>
                        {isAdmin && editingEmployeeNumber === userTenant.userId ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={employeeNumberDraft}
                              onChange={(e) => setEmployeeNumberDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEmployeeNumberSave(userTenant.userId);
                                if (e.key === "Escape") setEditingEmployeeNumber(null);
                              }}
                              placeholder="f.eks. A-0042"
                              className="h-7 w-28 text-xs"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEmployeeNumberSave(userTenant.userId)}
                            >
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingEmployeeNumber(null)}
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className={`group flex items-center gap-1.5 text-sm ${isAdmin ? "cursor-pointer hover:text-foreground" : "cursor-default"}`}
                            onClick={() => {
                              if (!isAdmin) return;
                              setEmployeeNumberDraft(userTenant.employeeNumber ?? "");
                              setEditingEmployeeNumber(userTenant.userId);
                            }}
                            title={isAdmin ? "Klikk for å redigere" : undefined}
                          >
                            <span className={userTenant.employeeNumber ? "font-mono text-xs" : "text-muted-foreground text-xs italic"}>
                              {userTenant.employeeNumber || (isAdmin ? "Sett nr." : "—")}
                            </span>
                            {isAdmin && (
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingPosition === userTenant.userId ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={positionDraft}
                              onChange={(e) => setPositionDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handlePositionSave(userTenant.userId);
                                if (e.key === "Escape") setEditingPosition(null);
                              }}
                              placeholder="f.eks. Tømrer"
                              className="h-7 w-32 text-xs"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handlePositionSave(userTenant.userId)}
                            >
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingPosition(null)}
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className={`group flex items-center gap-1.5 text-sm ${isAdmin ? "cursor-pointer hover:text-foreground" : "cursor-default"}`}
                            onClick={() => {
                              if (!isAdmin) return;
                              setPositionDraft(userTenant.position ?? "");
                              setEditingPosition(userTenant.userId);
                            }}
                            title={isAdmin ? "Klikk for å redigere" : undefined}
                          >
                            <span className={userTenant.position ? "text-xs" : "text-muted-foreground text-xs italic"}>
                              {userTenant.position || (isAdmin ? "Sett stilling" : "—")}
                            </span>
                            {isAdmin && (
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isCurrentUser ? (
                          <Select
                            value={userTenant.role}
                            onValueChange={(value) =>
                              handleRoleChange(userTenant.userId, value)
                            }
                            disabled={loading === userTenant.userId}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ANSATT">👤 Ansatt</SelectItem>
                              <SelectItem value="LEDER">👔 Leder</SelectItem>
                              <SelectItem value="HMS">🦺 HMS-ansvarlig</SelectItem>
                              <SelectItem value="VERNEOMBUD">🛡️ Verneombud</SelectItem>
                              <SelectItem value="BHT">🩺 Bedriftshelsetjeneste</SelectItem>
                              <SelectItem value="REVISOR">📋 Revisor</SelectItem>
                              <SelectItem value="ADMIN">⚙️ Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getRoleBadge(userTenant.role)
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={userTenant.managerId ?? NO_MANAGER_VALUE}
                            onValueChange={(value) =>
                              handleManagerChange(userTenant.userId, value)
                            }
                            disabled={loading === userTenant.userId}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_MANAGER_VALUE}>Ingen leder satt</SelectItem>
                              {users
                                .filter((candidate) => candidate.userId !== userTenant.userId)
                                .map((candidate) => (
                                  <SelectItem key={candidate.userId} value={candidate.userId}>
                                    {candidate.user.name || candidate.user.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {userTenant.managerId
                              ? userLabelById.get(userTenant.managerId) ?? "—"
                              : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(userTenant.user.createdAt).toLocaleDateString("nb-NO")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {!isCurrentUser && (
                            <div className="flex items-center justify-end gap-2">
                              {!userTenant.invitationSentAt && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleActivate(userTenant.userId)}
                                  disabled={activatingUserId === userTenant.userId || loading === userTenant.userId}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  {activatingUserId === userTenant.userId ? "Aktiverer..." : "Aktiver"}
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleRemove(
                                    userTenant.userId,
                                    userTenant.user.name || userTenant.user.email
                                  )
                                }
                                disabled={loading === userTenant.userId}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredUsers.length > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Viser {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredUsers.length)} av {filteredUsers.length} brukere
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - safePage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={item}
                      variant={safePage === item ? "default" : "outline"}
                      size="sm"
                      className="min-w-[32px]"
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!isAdmin && (
          <Card className="bg-amber-50 border-amber-200 mt-4">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800">
                ℹ️ Kun administratorer kan administrere brukere
              </p>
            </CardContent>
          </Card>
        )}

        {isAdmin && hasReachedLimit && (
          <Card className="bg-red-50 border-red-200 mt-4">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Brukergrense nådd
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Du har nådd maks antall brukere ({maxUsers}) for din abonnementspakke. 
                    Kontakt support for å oppgradere til en større pakke.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

