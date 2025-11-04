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
import { ArrowLeft, Save, Calendar } from "lucide-react";
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

export default function NewMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    type: "AMU",
    title: "",
    scheduledDate: "",
    location: "",
    meetingLink: "",
    agenda: "",
    organizer: "",
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
      const payload: any = {
        type: formData.type,
        title: formData.title,
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        organizer: formData.organizer,
      };

      if (formData.location) payload.location = formData.location;
      if (formData.meetingLink) payload.meetingLink = formData.meetingLink;
      if (formData.agenda) payload.agenda = formData.agenda;

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke opprette møte");
      }

      toast({
        title: "Møte opprettet",
        description: "Møtet er opprettet",
      });

      router.push(`/dashboard/meetings/${data.data.id}`);
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
        <Link href="/dashboard/meetings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nytt møte</h1>
          <p className="text-muted-foreground">
            Opprett et nytt AMU/VO møte eller HMS-komitémøte
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Møtedetaljer</CardTitle>
            <CardDescription>Fyll inn grunnleggende informasjon om møtet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Møtetype <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMU">Arbeidsmiljøutvalg (AMU)</SelectItem>
                    <SelectItem value="VO">Verneombudsmøte</SelectItem>
                    <SelectItem value="BHT">Bedriftshelsetjeneste</SelectItem>
                    <SelectItem value="HMS_COMMITTEE">HMS-utvalg</SelectItem>
                    <SelectItem value="OTHER">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer">
                  Møteleder <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.organizer}
                  onValueChange={(value) => setFormData({ ...formData, organizer: value })}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Velg møteleder"} />
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

            <div className="space-y-2">
              <Label htmlFor="title">
                Møtetittel <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="F.eks. AMU-møte Q4 2024"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">
                  Dato og tid <span className="text-destructive">*</span>
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
                <Label htmlFor="location">Sted</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="F.eks. Møterom A eller Online"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Møtelenke</Label>
              <Input
                id="meetingLink"
                type="url"
                value={formData.meetingLink}
                onChange={(e) =>
                  setFormData({ ...formData, meetingLink: e.target.value })
                }
                placeholder="F.eks. Teams eller Zoom lenke"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                value={formData.agenda}
                onChange={(e) =>
                  setFormData({ ...formData, agenda: e.target.value })
                }
                placeholder="Skriv inn dagsorden for møtet..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Tips: Skriv hvert agendapunkt på egen linje
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/meetings">
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Oppretter..." : "Opprett møte"}
          </Button>
        </div>
      </form>
    </div>
  );
}

