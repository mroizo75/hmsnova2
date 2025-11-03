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
import { UserPlus, Trash2, Shield, User, AlertCircle } from "lucide-react";
import {
  inviteUser,
  updateUserRole,
  removeUserFromTenant,
} from "@/server/actions/settings.actions";
import { useToast } from "@/hooks/use-toast";

interface UserManagementProps {
  users: Array<{
    userId: string;
    role: string;
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

export function UserManagement({ users, currentUserId, isAdmin, pricingTier, maxUsers }: UserManagementProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const currentUserCount = users.length;
  const remainingSlots = maxUsers - currentUserCount;
  const hasReachedLimit = currentUserCount >= maxUsers;

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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Admin</Badge>;
      case "LEDER":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Leder</Badge>;
      case "ANSATT":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Ansatt</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Brukere ({currentUserCount} / {maxUsers})
            </CardTitle>
            <CardDescription>
              Administrer brukere og deres tilgang
            </CardDescription>
          </div>
        </div>

          {isAdmin && (
            <div className="flex flex-col items-end gap-2">
              {remainingSlots <= 3 && remainingSlots > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{remainingSlots} ledig{remainingSlots === 1 ? '' : 'e'} plass{remainingSlots === 1 ? '' : 'er'}</span>
                </div>
              )}
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button disabled={hasReachedLimit}>
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
                        <SelectItem value="ANSATT">Ansatt</SelectItem>
                        <SelectItem value="LEDER">Leder</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
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
          )}
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Ingen brukere funnet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Medlem siden</TableHead>
                  {isAdmin && <TableHead className="text-right">Handlinger</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userTenant) => {
                  const isCurrentUser = userTenant.userId === currentUserId;

                  return (
                    <TableRow key={userTenant.userId}>
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
                              <SelectItem value="ANSATT">Ansatt</SelectItem>
                              <SelectItem value="LEDER">Leder</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getRoleBadge(userTenant.role)
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(userTenant.user.createdAt).toLocaleDateString("nb-NO")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {!isCurrentUser && (
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

