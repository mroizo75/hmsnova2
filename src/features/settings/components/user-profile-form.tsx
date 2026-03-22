"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserProfile, updateUserPassword } from "@/server/actions/settings.actions";
import { useToast } from "@/hooks/use-toast";
import { User, Lock } from "lucide-react";
import type { User as PrismaUser } from "@prisma/client";

interface UserProfileFormProps {
  user: PrismaUser;
}

export function UserProfileForm({ user }: UserProfileFormProps) {
  const t = useTranslations("dashboardUserProfileForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingProfile(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string || undefined,
      email: formData.get("email") as string || undefined,
      preferredLocale: formData.get("preferredLocale") as string || undefined,
    };

    const result = await updateUserProfile(data);

    if (result.success) {
      toast({
        title: t("toast.profileSuccess.title"),
        description: t("toast.profileSuccess.description"),
        className: "bg-green-50 border-green-200",
      });
      document.cookie = `NEXT_LOCALE=${data.preferredLocale === "en" ? "en" : "nb"}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toast.error.title"),
        description: result.error || t("toast.error.profileFailed"),
      });
    }

    setLoadingProfile(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingPassword(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t("toast.error.title"),
        description: t("toast.error.passwordMismatch"),
      });
      setLoadingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: t("toast.error.title"),
        description: t("toast.error.passwordTooShort"),
      });
      setLoadingPassword(false);
      return;
    }

    const result = await updateUserPassword({ currentPassword, newPassword });

    if (result.success) {
      toast({
        title: t("toast.passwordSuccess.title"),
        description: t("toast.passwordSuccess.description"),
        className: "bg-green-50 border-green-200",
      });
      (e.target as HTMLFormElement).reset();
    } else {
      toast({
        variant: "destructive",
        title: t("toast.error.title"),
        description: result.error || t("toast.error.passwordFailed"),
      });
    }

    setLoadingPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <form onSubmit={handleProfileSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profile.title")}
            </CardTitle>
            <CardDescription>
              {t("profile.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name.label")}</Label>
              <Input
                id="name"
                name="name"
                placeholder={t("fields.name.placeholder")}
                disabled={loadingProfile}
                defaultValue={user.name || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("fields.email.label")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("fields.email.placeholder")}
                required
                disabled={loadingProfile}
                defaultValue={user.email}
              />
              <p className="text-sm text-amber-600">
                {t("fields.email.help")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredLocale">{t("fields.preferredLocale.label")}</Label>
              <Select name="preferredLocale" defaultValue={user.preferredLocale || "nb"} disabled={loadingProfile}>
                <SelectTrigger id="preferredLocale">
                  <SelectValue placeholder={t("fields.preferredLocale.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nb">{t("fields.preferredLocale.options.nb")}</SelectItem>
                  <SelectItem value="en">{t("fields.preferredLocale.options.en")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile ? t("actions.saving") : t("actions.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Separator />

      {/* Password */}
      <form onSubmit={handlePasswordSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t("password.title")}
            </CardTitle>
            <CardDescription>
              {t("password.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("password.currentPassword")}</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                disabled={loadingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("password.newPassword")}</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                disabled={loadingPassword}
                minLength={8}
              />
              <p className="text-sm text-muted-foreground">
                {t("password.minLength")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("password.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={loadingPassword}
                minLength={8}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loadingPassword}>
                {loadingPassword ? t("actions.changingPassword") : t("actions.changePassword")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

