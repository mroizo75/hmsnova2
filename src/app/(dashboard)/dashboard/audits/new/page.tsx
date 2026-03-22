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
import { useTranslations } from "next-intl";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function NewAuditPage() {
  const t = useTranslations("dashboardAuditNewPage");
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
        title: t("toasts.created.title"),
        description: t("toasts.created.description"),
      });

      router.push(`/dashboard/audits/${data.data.audit.id}`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/audits">
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  {t("fields.title")} <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="auditType">
                  {t("fields.auditType")} <span className="text-destructive">*</span>
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
                    <SelectItem value="INTERNAL">{t("types.internal")}</SelectItem>
                    <SelectItem value="EXTERNAL">{t("types.external")}</SelectItem>
                    <SelectItem value="CERTIFICATION">{t("types.certification")}</SelectItem>
                    <SelectItem value="SUPPLIER">{t("types.supplier")}</SelectItem>
                    <SelectItem value="FOLLOW_UP">{t("types.followUp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadAuditorId">
                  {t("fields.leadAuditor")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.leadAuditorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, leadAuditorId: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? t("loadingUsers") : t("placeholders.selectAuditor")} />
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
                  {t("fields.scheduledDate")} <span className="text-destructive">*</span>
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
                  {t("fields.area")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                  placeholder={t("placeholders.area")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">{t("fields.department")}</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder={t("placeholders.department")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">
                {t("fields.scope")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                placeholder={t("placeholders.scope")}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("hints.scope")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria">
                {t("fields.criteria")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="criteria"
                value={formData.criteria}
                onChange={(e) =>
                  setFormData({ ...formData, criteria: e.target.value })
                }
                placeholder={t("placeholders.criteria")}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("hints.criteria")}
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/audits">
                <Button type="button" variant="outline">
                  {t("actions.cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? t("actions.creating") : t("actions.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
