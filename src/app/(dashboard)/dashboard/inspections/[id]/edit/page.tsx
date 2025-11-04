"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function EditInspectionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "VERNERUNDE",
    status: "PLANNED",
    scheduledDate: "",
    completedDate: "",
    location: "",
    conductedBy: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/users`);
        const data = await response.json();

        if (response.ok && data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session?.user?.tenantId]);

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const response = await fetch(`/api/inspections/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Kunne ikke hente inspeksjon");
        }

        const inspection = data.data.inspection;
        setFormData({
          title: inspection.title || "",
          description: inspection.description || "",
          type: inspection.type || "VERNERUNDE",
          status: inspection.status || "PLANNED",
          scheduledDate: inspection.scheduledDate
            ? new Date(inspection.scheduledDate).toISOString().split("T")[0]
            : "",
          completedDate: inspection.completedDate
            ? new Date(inspection.completedDate).toISOString().split("T")[0]
            : "",
          location: inspection.location || "",
          conductedBy: inspection.conductedBy || "",
        });
      } catch (error: any) {
        toast({
          title: "Feil",
          description: error.message,
          variant: "destructive",
        });
        router.push("/dashboard/inspections");
      } finally {
        setFetching(false);
      }
    };

    fetchInspection();
  }, [params.id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/inspections/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke oppdatere inspeksjon");
      }

      toast({
        title: "Inspeksjon oppdatert",
        description: "Inspeksjonen er nå oppdatert",
      });

      router.push(`/dashboard/inspections/${params.id}`);
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Laster inspeksjon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/inspections/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rediger inspeksjon</h1>
          <p className="text-muted-foreground">
            Oppdater informasjon om inspeksjonen
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspeksjonsdetaljer</CardTitle>
          <CardDescription>
            Oppdater informasjonen nedenfor for å endre inspeksjonen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Tittel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="F.eks. Kvartalsvis vernerunde Q1 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERNERUNDE">Vernerunde</SelectItem>
                    <SelectItem value="HMS_INSPEKSJON">HMS-inspeksjon</SelectItem>
                    <SelectItem value="BRANNØVELSE">Brannøvelse</SelectItem>
                    <SelectItem value="SHA_PLAN">SHA-plan</SelectItem>
                    <SelectItem value="SIKKERHETSVANDRING">
                      Sikkerhetsvandring
                    </SelectItem>
                    <SelectItem value="ANDRE">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planlagt</SelectItem>
                    <SelectItem value="IN_PROGRESS">Pågår</SelectItem>
                    <SelectItem value="COMPLETED">Fullført</SelectItem>
                    <SelectItem value="CANCELLED">Avbrutt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductedBy">Gjennomført av *</Label>
                <Select
                  value={formData.conductedBy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conductedBy: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="conductedBy">
                    <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Velg bruker"} />
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
                <Label htmlFor="scheduledDate">Planlagt dato *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completedDate">Fullført dato</Label>
                <Input
                  id="completedDate"
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, completedDate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Sett kun hvis inspeksjonen er fullført
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasjon</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="F.eks. Produksjonshall A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Skriv en beskrivelse av inspeksjonen..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Lagre endringer
              </Button>
              <Link href={`/dashboard/inspections/${params.id}`}>
                <Button type="button" variant="outline">
                  Avbryt
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

