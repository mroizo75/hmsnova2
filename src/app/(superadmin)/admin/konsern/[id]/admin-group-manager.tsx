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
  UserPlus,
  Building2,
  Loader2,
  Trash2,
  Shield,
  Wrench,
  Eye,
  Link2,
} from "lucide-react";
import {
  adminAddUserToGroup,
  adminRemoveUserFromGroup,
  adminAddTenantToGroup,
  adminRemoveTenantFromGroup,
  adminCreateTenantForGroup,
} from "@/server/actions/admin-corporate-group.actions";

interface GroupUser {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

interface GroupTenant {
  id: string;
  tenantId: string;
  status: string;
  tenant: { id: string; name: string; slug: string; orgNumber: string | null; city: string | null };
}

interface AvailableTenant {
  id: string;
  name: string;
  slug: string;
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
}

interface AdminGroupManagerProps {
  groupId: string;
  users: GroupUser[];
  tenants: GroupTenant[];
  availableTenants: AvailableTenant[];
  availableUsers: AvailableUser[];
}

const roleConfig = {
  GROUP_ADMIN: { label: "Administrator", icon: Shield, color: "text-red-700 bg-red-50" },
  GROUP_HMS: { label: "HMS-ansvarlig", icon: Wrench, color: "text-blue-700 bg-blue-50" },
  GROUP_READER: { label: "Leser", icon: Eye, color: "text-gray-600 bg-gray-100" },
} as const;

type RoleKey = keyof typeof roleConfig;

export function AdminGroupManager({
  groupId,
  users,
  tenants,
  availableTenants,
  availableUsers,
}: AdminGroupManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleKey>("GROUP_ADMIN");
  const [userSearch, setUserSearch] = useState("");

  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "", orgNumber: "", contactPerson: "", contactEmail: "",
    contactPhone: "", address: "", city: "", postalCode: "", industry: "",
  });

  const existingUserIds = new Set(users.map((u) => u.userId));
  const existingTenantIds = new Set(tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId));

  const filteredUsers = availableUsers
    .filter((u) => !existingUserIds.has(u.id))
    .filter((u) =>
      !userSearch ||
      (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
       u.email.toLowerCase().includes(userSearch.toLowerCase()))
    )
    .slice(0, 20);

  const filteredTenants = availableTenants
    .filter((t) => !existingTenantIds.has(t.id))
    .filter((t) =>
      !tenantSearch ||
      t.name.toLowerCase().includes(tenantSearch.toLowerCase())
    )
    .slice(0, 20);

  function handleAddUser() {
    if (!selectedUserId) return;
    startTransition(async () => {
      try {
        await adminAddUserToGroup(groupId, selectedUserId, selectedRole);
        toast({ title: "Bruker lagt til konsern" });
        setSelectedUserId("");
        setUserSearch("");
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleRemoveUser(userId: string, name: string) {
    if (!confirm(`Fjerne ${name} fra konsernet?`)) return;
    startTransition(async () => {
      try {
        await adminRemoveUserFromGroup(groupId, userId);
        toast({ title: "Bruker fjernet" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleAddTenant() {
    if (!selectedTenantId) return;
    startTransition(async () => {
      try {
        await adminAddTenantToGroup(groupId, selectedTenantId);
        toast({ title: "Bedrift lagt til konsern" });
        setSelectedTenantId("");
        setTenantSearch("");
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleCreateTenant() {
    if (!newTenant.name.trim()) return;
    startTransition(async () => {
      try {
        const result = await adminCreateTenantForGroup(groupId, {
          name: newTenant.name,
          orgNumber: newTenant.orgNumber || undefined,
          contactPerson: newTenant.contactPerson || undefined,
          contactEmail: newTenant.contactEmail || undefined,
          contactPhone: newTenant.contactPhone || undefined,
          address: newTenant.address || undefined,
          city: newTenant.city || undefined,
          postalCode: newTenant.postalCode || undefined,
          industry: newTenant.industry || undefined,
        });
        const msg = result.emailSent
          ? `${newTenant.name} opprettet — velkomst-e-post sendt til ${newTenant.contactEmail}`
          : `${newTenant.name} opprettet og tilknyttet konsernet`;
        toast({ title: msg });
        setNewTenant({ name: "", orgNumber: "", contactPerson: "", contactEmail: "", contactPhone: "", address: "", city: "", postalCode: "", industry: "" });
        setShowCreateForm(false);
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleRemoveTenant(tenantId: string, name: string) {
    if (!confirm(`Fjerne ${name} fra konsernet?`)) return;
    startTransition(async () => {
      try {
        await adminRemoveTenantFromGroup(groupId, tenantId);
        toast({ title: "Bedrift fjernet" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bedrifter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tilknyttede bedrifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legg til bedrift */}
          <div className="rounded-lg border border-dashed border-gray-300 p-3 space-y-3">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Legg til bedrift</Label>
            <Input
              placeholder="Søk etter bedrift..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />
            {tenantSearch && filteredTenants.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTenantId(t.id); setTenantSearch(t.name); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      selectedTenantId === t.id ? "bg-blue-50 font-medium" : ""
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <Button size="sm" onClick={handleAddTenant} disabled={pending || !selectedTenantId}>
              {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Building2 className="mr-2 h-3.5 w-3.5" />}
              Legg til
            </Button>

            <div className="border-t pt-3 mt-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                {showCreateForm ? "— Skjul opprettelseskjema" : "+ Opprett ny bedrift"}
              </button>
            </div>

            {showCreateForm && (
              <div className="space-y-2 rounded-md border bg-gray-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Bedriftsnavn *"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  />
                  <Input
                    placeholder="Org.nr"
                    value={newTenant.orgNumber}
                    onChange={(e) => setNewTenant({ ...newTenant, orgNumber: e.target.value })}
                  />
                  <Input
                    placeholder="Kontaktperson"
                    value={newTenant.contactPerson}
                    onChange={(e) => setNewTenant({ ...newTenant, contactPerson: e.target.value })}
                  />
                  <Input
                    placeholder="E-post (får innlogging)"
                    type="email"
                    value={newTenant.contactEmail}
                    onChange={(e) => setNewTenant({ ...newTenant, contactEmail: e.target.value })}
                  />
                  <Input
                    placeholder="Telefon"
                    value={newTenant.contactPhone}
                    onChange={(e) => setNewTenant({ ...newTenant, contactPhone: e.target.value })}
                  />
                  <Input
                    placeholder="Bransje"
                    value={newTenant.industry}
                    onChange={(e) => setNewTenant({ ...newTenant, industry: e.target.value })}
                  />
                  <Input
                    placeholder="Adresse"
                    value={newTenant.address}
                    onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Postnr"
                      value={newTenant.postalCode}
                      onChange={(e) => setNewTenant({ ...newTenant, postalCode: e.target.value })}
                    />
                    <Input
                      placeholder="Poststed"
                      value={newTenant.city}
                      onChange={(e) => setNewTenant({ ...newTenant, city: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">
                  Hvis e-post er oppgitt, opprettes admin-bruker og velkomst-e-post sendes automatisk.
                </p>
                <Button size="sm" onClick={handleCreateTenant} disabled={pending || !newTenant.name.trim()}>
                  {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Building2 className="mr-2 h-3.5 w-3.5" />}
                  Opprett og tilknytt
                </Button>
              </div>
            )}
          </div>

          {/* Liste */}
          {tenants.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen bedrifter tilknyttet.</p>
          ) : (
            <div className="space-y-2">
              {tenants.map((gt) => (
                <div key={gt.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <a href={`/admin/tenants/${gt.tenant.id}`} className="font-medium text-blue-600 hover:underline">
                      {gt.tenant.name}
                    </a>
                    <p className="text-xs text-gray-500">
                      {gt.tenant.city}{gt.tenant.orgNumber ? ` · ${gt.tenant.orgNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${gt.status === "ACTIVE" ? "text-green-600" : "text-gray-400"}`}>
                      {gt.status === "ACTIVE" ? "Aktiv" : gt.status}
                    </span>
                    {gt.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => handleRemoveTenant(gt.tenantId, gt.tenant.name)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brukere */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Konsern-brukere</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legg til bruker */}
          <div className="rounded-lg border border-dashed border-gray-300 p-3 space-y-3">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Legg til bruker</Label>
            <Input
              placeholder="Søk etter bruker (navn eller e-post)..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {userSearch && filteredUsers.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUserId(u.id); setUserSearch(u.name ?? u.email); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      selectedUserId === u.id ? "bg-blue-50 font-medium" : ""
                    }`}
                  >
                    <span>{u.name ?? "Ukjent"}</span>
                    <span className="ml-2 text-xs text-gray-400">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as RoleKey)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP_ADMIN">Administrator</SelectItem>
                  <SelectItem value="GROUP_HMS">HMS-ansvarlig</SelectItem>
                  <SelectItem value="GROUP_READER">Leser</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddUser} disabled={pending || !selectedUserId}>
                {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-2 h-3.5 w-3.5" />}
                Legg til
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              <Link2 className="mr-1 inline h-3 w-3" />
              En bruker som allerede har tenant-tilgang vil kunne veksle mellom konsern og bedrift.
            </p>
          </div>

          {/* Liste */}
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen brukere registrert.</p>
          ) : (
            <div className="space-y-2">
              {users.map((gu) => {
                const rc = roleConfig[gu.role as RoleKey] ?? roleConfig.GROUP_READER;
                const RoleIcon = rc.icon;
                return (
                  <div key={gu.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{gu.user.name ?? gu.user.email}</p>
                      <p className="text-xs text-gray-500">{gu.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${rc.color}`}>
                        <RoleIcon className="h-3 w-3" />
                        {rc.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => handleRemoveUser(gu.userId, gu.user.name ?? gu.user.email)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
