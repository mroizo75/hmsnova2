"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function NewManagementReviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    period: "",
    reviewDate: "",
    conductedBy: "",
    hmsGoalsReview: "",
    incidentStatistics: "",
    riskReview: "",
    auditResults: "",
    trainingStatus: "",
    resourcesReview: "",
    externalChanges: "",
    conclusions: "",
    notes: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/management-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          reviewDate: new Date(formData.reviewDate).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke opprette gjennomgang");
      }

      toast({
        title: "Gjennomgang opprettet",
        description: "Ledelsens gjennomgang er opprettet",
      });

      router.push(`/dashboard/management-reviews/${data.data.id}`);
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
        <Link href="/dashboard/management-reviews">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny ledelsens gjennomgang</h1>
          <p className="text-muted-foreground">
            Opprett en ny periodisk gjennomgang av HMS-systemet
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grunnleggende informasjon */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>
              Fyll inn grunnleggende detaljer om gjennomgangen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                  placeholder="F.eks. Ledelsens gjennomgang Q4 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">
                  Periode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) =>
                    setFormData({ ...formData, period: e.target.value })
                  }
                  placeholder="F.eks. Q4 2024, H2 2024, eller 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewDate">
                  Gjennomgangsdato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reviewDate"
                  type="datetime-local"
                  value={formData.reviewDate}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewDate: e.target.value })
                  }
                  required
                />
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
            </div>
          </CardContent>
        </Card>

        {/* Input data - HMS gjennomgang */}
        <Card>
          <CardHeader>
            <CardTitle>Gjennomgang av HMS-systemet</CardTitle>
            <CardDescription>
              Fyll inn status og resultater fra ulike HMS-områder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hmsGoalsReview">HMS-mål og resultater</Label>
              <Textarea
                id="hmsGoalsReview"
                value={formData.hmsGoalsReview}
                onChange={(e) =>
                  setFormData({ ...formData, hmsGoalsReview: e.target.value })
                }
                placeholder="Gjennomgang av HMS-mål, måloppnåelse og avvik..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incidentStatistics">Avvik og hendelser</Label>
              <Textarea
                id="incidentStatistics"
                value={formData.incidentStatistics}
                onChange={(e) =>
                  setFormData({ ...formData, incidentStatistics: e.target.value })
                }
                placeholder="Statistikk over avvik, hendelser og trender..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskReview">Risikovurderinger</Label>
              <Textarea
                id="riskReview"
                value={formData.riskReview}
                onChange={(e) =>
                  setFormData({ ...formData, riskReview: e.target.value })
                }
                placeholder="Status på risikovurderinger og risikonivå..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditResults">Revisjoner og inspeksjoner</Label>
              <Textarea
                id="auditResults"
                value={formData.auditResults}
                onChange={(e) =>
                  setFormData({ ...formData, auditResults: e.target.value })
                }
                placeholder="Resultater fra revisjoner og vernerunder..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainingStatus">Opplæring og kompetanse</Label>
              <Textarea
                id="trainingStatus"
                value={formData.trainingStatus}
                onChange={(e) =>
                  setFormData({ ...formData, trainingStatus: e.target.value })
                }
                placeholder="Status på opplæring, manglende kompetanse..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resourcesReview">Ressurser og budsjett</Label>
              <Textarea
                id="resourcesReview"
                value={formData.resourcesReview}
                onChange={(e) =>
                  setFormData({ ...formData, resourcesReview: e.target.value })
                }
                placeholder="Vurdering av ressurser, budsjett og behov..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalChanges">Eksterne endringer</Label>
              <Textarea
                id="externalChanges"
                value={formData.externalChanges}
                onChange={(e) =>
                  setFormData({ ...formData, externalChanges: e.target.value })
                }
                placeholder="Endringer i lover, forskrifter, standarder..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Output data - Konklusjoner */}
        <Card>
          <CardHeader>
            <CardTitle>Konklusjoner og oppfølging</CardTitle>
            <CardDescription>
              Oppsummer konklusjoner og nødvendige tiltak
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conclusions">Konklusjoner</Label>
              <Textarea
                id="conclusions"
                value={formData.conclusions}
                onChange={(e) =>
                  setFormData({ ...formData, conclusions: e.target.value })
                }
                placeholder="Overordnede konklusjoner fra gjennomgangen..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Øvrige notater..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/management-reviews">
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Oppretter..." : "Opprett gjennomgang"}
          </Button>
        </div>
      </form>
    </div>
  );
}

