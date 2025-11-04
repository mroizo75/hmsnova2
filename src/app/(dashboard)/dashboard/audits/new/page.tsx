"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function NewAuditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    auditType: "INTERNAL",
    scope: "",
    criteria: "",
    scheduledDate: "",
    area: "",
    department: "",
    leadAuditorId: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/users`);
        const data = await response.json();

        if (response.ok && data.users) {
          setUsers(data.users);
          // Sett current user som default
          if (session.user.id) {
            setFormData((prev) => ({ ...prev, leadAuditorId: session.user.id || "" }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session?.user?.tenantId, session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke opprette revisjon");
      }

      toast({
        title: "Revisjon opprettet",
        description: "Revisjonen er nå opprettet og klar for gjennomføring",
      });

      router.push(`/dashboard/audits/${data.data.audit.id}`);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/audits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny revisjon</h1>
          <p className="text-muted-foreground">
            Opprett en ny internrevisjon eller ISO-revisjon
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revisjonsdetaljer</CardTitle>
          <CardDescription>
            Fyll ut informasjonen nedenfor i henhold til ISO 9001 krav
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Tittel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="F.eks. Q1 2025 Internrevisjon - Produksjon"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditType">
                  Type revisjon <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.auditType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, auditType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internrevisjon</SelectItem>
                    <SelectItem value="EXTERNAL">Eksternrevisjon</SelectItem>
                    <SelectItem value="CERTIFICATION">Sertifisering</SelectItem>
                    <SelectItem value="SUPPLIER">Leverandørrevisjon</SelectItem>
                    <SelectItem value="FOLLOW_UP">Oppfølging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadAuditorId">
                  Hovedrevisor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.leadAuditorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, leadAuditorId: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Velg revisor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user.id} value={u.user.id}>
                        {u.user.name || u.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledDate">
                  Planlagt dato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">
                  Område <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                  placeholder="F.eks. HMS, Kvalitet, Miljø"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Avdeling</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="F.eks. Produksjon, Lager"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">
                Omfang (ISO 9001) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                placeholder="Beskriv revisjonens omfang..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Hva skal revideres? Hvilke prosesser/områder?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria">
                Kriterier (ISO 9001) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="criteria"
                value={formData.criteria}
                onChange={(e) =>
                  setFormData({ ...formData, criteria: e.target.value })
                }
                placeholder="F.eks. ISO 9001:2015 krav 7.1-7.5..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Hvilke krav skal vurderes? ISO-klausuler, lover, interne krav?
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/audits">
                <Button type="button" variant="outline">
                  Avbryt
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Oppretter..." : "Opprett revisjon"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
