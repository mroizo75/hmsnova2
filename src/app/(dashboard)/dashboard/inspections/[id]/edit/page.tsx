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
import { useTranslations } from "next-intl";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function EditInspectionPage() {
  const t = useTranslations("dashboardInspectionEditPage");
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
          throw new Error(data.message || t("errors.fetch"));
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
          title: t("toasts.error.title"),
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
        throw new Error(data.message || t("errors.update"));
      }

      toast({
        title: t("toasts.updated.title"),
        description: t("toasts.updated.description"),
      });

      router.push(`/dashboard/inspections/${params.id}`);
    } catch (error: any) {
      toast({
        title: t("toasts.error.title"),
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
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
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
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("card.title")}</CardTitle>
          <CardDescription>
            {t("card.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t("fields.title")}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("placeholders.title")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t("fields.type")}</Label>
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
                    <SelectItem value="VERNERUNDE">{t("types.vernerunde")}</SelectItem>
                    <SelectItem value="HMS_INSPEKSJON">{t("types.hmsInspection")}</SelectItem>
                    <SelectItem value="SHA_PLAN">{t("types.shaPlan")}</SelectItem>
                    <SelectItem value="SIKKERHETSVANDRING">
                      {t("types.safetyWalk")}
                    </SelectItem>
                    <SelectItem value="ANDRE">{t("types.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("fields.status")}</Label>
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
                    <SelectItem value="PLANNED">{t("status.planned")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
                    <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductedBy">{t("fields.conductedBy")}</Label>
                <Select
                  value={formData.conductedBy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conductedBy: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="conductedBy">
                    <SelectValue placeholder={loadingUsers ? t("loadingUsers") : t("placeholders.selectUser")} />
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
                <Label htmlFor="scheduledDate">{t("fields.scheduledDate")}</Label>
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
                <Label htmlFor="completedDate">{t("fields.completedDate")}</Label>
                <Input
                  id="completedDate"
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, completedDate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("hints.completedDate")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t("fields.location")}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder={t("placeholders.location")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("placeholders.description")}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t("actions.saveChanges")}
              </Button>
              <Link href={`/dashboard/inspections/${params.id}`}>
                <Button type="button" variant="outline">
                  {t("actions.cancel")}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

