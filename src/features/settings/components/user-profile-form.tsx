"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateUserProfile, updateUserPassword } from "@/server/actions/settings.actions";
import { useToast } from "@/hooks/use-toast";
import { User, Lock } from "lucide-react";
import type { User as PrismaUser } from "@prisma/client";

interface UserProfileFormProps {
  user: PrismaUser;
}

export function UserProfileForm({ user }: UserProfileFormProps) {
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
    };

    const result = await updateUserProfile(data);

    if (result.success) {
      toast({
        title: "✅ Profil oppdatert",
        description: "Endringene dine er lagret",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke oppdatere profil",
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
        title: "Feil",
        description: "Nye passord stemmer ikke overens",
      });
      setLoadingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Passord må være minst 8 tegn",
      });
      setLoadingPassword(false);
      return;
    }

    const result = await updateUserPassword({ currentPassword, newPassword });

    if (result.success) {
      toast({
        title: "✅ Passord endret",
        description: "Ditt passord er oppdatert",
        className: "bg-green-50 border-green-200",
      });
      (e.target as HTMLFormElement).reset();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke endre passord",
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
              Brukerinformasjon
            </CardTitle>
            <CardDescription>
              Oppdater din personlige informasjon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ditt navn"
                disabled={loadingProfile}
                defaultValue={user.name || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="din@epost.no"
                required
                disabled={loadingProfile}
                defaultValue={user.email}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile ? "Lagrer..." : "Lagre endringer"}
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
              Endre passord
            </CardTitle>
            <CardDescription>
              Oppdater ditt passord for økt sikkerhet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Nåværende passord</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                disabled={loadingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nytt passord</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                disabled={loadingPassword}
                minLength={8}
              />
              <p className="text-sm text-muted-foreground">
                Minimum 8 tegn
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft nytt passord</Label>
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
                {loadingPassword ? "Endrer..." : "Endre passord"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

