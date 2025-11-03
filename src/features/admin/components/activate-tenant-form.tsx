"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { activateTenant } from "@/server/actions/onboarding.actions";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface ActivateTenantFormProps {
  tenantId: string;
  defaultEmail: string;
  defaultName: string;
}

export function ActivateTenantForm({
  tenantId,
  defaultEmail,
  defaultName,
}: ActivateTenantFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    adminEmail: defaultEmail,
    adminName: defaultName,
    adminPassword: generatePassword(),
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await activateTenant({
        tenantId,
        ...formData,
      });

      if (result.success) {
        toast({
          title: "✅ Tenant aktivert!",
          description: "Admin-bruker er opprettet og e-post er sendt til kunden.",
        });
        router.push("/admin/registrations");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "❌ Feil",
          description: result.error || "Kunne ikke aktivere tenant",
        });
      }
    } catch (error) {
      console.error("Activate tenant error:", error);
      toast({
        variant: "destructive",
        title: "❌ Systemfeil",
        description: "En uventet feil oppstod",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Admin E-post */}
      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin E-post *</Label>
        <Input
          id="adminEmail"
          type="email"
          value={formData.adminEmail}
          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
          required
          placeholder="admin@bedrift.no"
        />
        <p className="text-xs text-muted-foreground">
          E-postadressen admin-brukeren skal logge inn med
        </p>
      </div>

      {/* Admin Navn */}
      <div className="space-y-2">
        <Label htmlFor="adminName">Admin Navn *</Label>
        <Input
          id="adminName"
          type="text"
          value={formData.adminName}
          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
          required
          placeholder="Ola Nordmann"
        />
      </div>

      {/* Admin Passord */}
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Midlertidig passord *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="adminPassword"
              type={showPassword ? "text" : "password"}
              value={formData.adminPassword}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              required
              minLength={8}
              placeholder="Min. 8 tegn"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({ ...formData, adminPassword: generatePassword() })}
          >
            Generer
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Passordet sendes til kunden - de må endre det ved første innlogging
        </p>
      </div>

      {/* Interne notater */}
      <div className="space-y-2">
        <Label htmlFor="notes">Interne notater (valgfritt)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="F.eks. spesielle avtaler, rabatter, etc."
          rows={3}
        />
      </div>

      <div className="pt-4 border-t">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aktiverer...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aktiver tenant og send e-post
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Generer et tilfeldig passord
function generatePassword(): string {
  const length = 12;
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Uten I, O
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; // Uten i, l, o
  const numbers = "23456789"; // Uten 0, 1
  const special = "!@#$%&*";
  const all = uppercase + lowercase + numbers + special;

  let password = "";

  // Garantert minst én av hver type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fyll ut resten
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Bland tegnene
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

