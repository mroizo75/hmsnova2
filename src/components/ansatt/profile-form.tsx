"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, User } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.image ? `/api/files/${user.image}` : null
  );

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Kunne ikke oppdatere profil");
      }

      toast({
        title: "✅ Profil oppdatert",
        description: "Dine endringer er lagret",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "❌ Feil",
        description: "Kunne ikke oppdatere profil. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsChangingPassword(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "❌ Feil",
        description: "Nye passord matcher ikke",
        variant: "destructive",
      });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kunne ikke endre passord");
      }

      toast({
        title: "✅ Passord endret",
        description: "Ditt nye passord er lagret",
      });

      // Reset skjema
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "❌ Feil",
        description: error.message || "Kunne ikke endre passord. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profilbilde-seksjon */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {avatarPreview ? (
              // Bruk vanlig img tag for både storage og blob URLs
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Profilbilde"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <Label
            htmlFor="avatar"
            className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 shadow-lg"
          >
            <Camera className="h-5 w-5" />
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Klikk på kamera-ikonet for å endre profilbilde
        </p>
      </div>

      {/* Profil-skjema */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="sr-only"
        />

        {/* Navn */}
        <div className="space-y-2">
          <Label htmlFor="name">Navn *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={user.name || ""}
            required
            className="h-12"
          />
        </div>

        {/* E-post (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            value={user.email}
            disabled
            className="h-12 bg-gray-50"
          />
          <p className="text-xs text-muted-foreground">
            E-postadressen kan ikke endres
          </p>
        </div>

        {/* Telefon */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={user.phone || ""}
            placeholder="+47 999 99 999"
            className="h-12"
          />
        </div>

        {/* Adresse */}
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            name="address"
            defaultValue={user.address || ""}
            placeholder="Eksempel: Storgata 1"
            className="h-12"
          />
        </div>

        {/* Postnummer og Sted */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postnummer</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={user.postalCode || ""}
              placeholder="0000"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Poststed</Label>
            <Input
              id="city"
              name="city"
              defaultValue={user.city || ""}
              placeholder="Oslo"
              className="h-12"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Lagrer...
            </>
          ) : (
            "💾 Lagre endringer"
          )}
        </Button>
      </form>

      {/* Passord-seksjon */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold mb-4">Endre passord</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Nåværende passord *</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nytt passord *</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 tegn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Bekreft nytt passord *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={isChangingPassword}
            variant="outline"
            className="w-full h-12"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Endrer...
              </>
            ) : (
              "🔒 Endre passord"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

