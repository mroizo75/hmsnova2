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

export default function NewInspectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "VERNERUNDE",
    scheduledDate: "",
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
          // Sett current user som default
          if (session.user.id) {
            setFormData((prev) => ({ ...prev, conductedBy: session.user.id || "" }));
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
      const response = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke opprette inspeksjon");
      }

      toast({
        title: "Inspeksjon opprettet",
        description: "Inspeksjonen er nå opprettet og klar for gjennomføring",
      });

      router.push(`/dashboard/inspections/${data.data.inspection.id}`);
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
        <Link href="/dashboard/inspections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny inspeksjon</h1>
          <p className="text-muted-foreground">
            Opprett en ny vernerunde eller HMS-inspeksjon
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspeksjonsdetaljer</CardTitle>
          <CardDescription>
            Fyll ut informasjonen nedenfor for å planlegge inspeksjonen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Tittel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="F.eks. Kvartalsvis vernerunde - Produksjon"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERNERUNDE">Vernerunde</SelectItem>
                    <SelectItem value="HMS_INSPEKSJON">HMS-inspeksjon</SelectItem>
                    <SelectItem value="BRANNØVELSE">Brannøvelse</SelectItem>
                    <SelectItem value="SHA_PLAN">SHA-plan</SelectItem>
                    <SelectItem value="SIKKERHETSVANDRING">Sikkerhetsvandring</SelectItem>
                    <SelectItem value="ANDRE">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductedBy">
                  Gjennomført av <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.conductedBy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conductedBy: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
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
                placeholder="Beskriv hva som skal inspiseres..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/inspections">
                <Button type="button" variant="outline">
                  Avbryt
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Oppretter..." : "Opprett inspeksjon"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

