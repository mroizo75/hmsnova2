"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Upload,
  Trash2,
  Loader2,
  Save,
  Bell,
  ImageIcon,
  Mail,
  Plus,
  X,
} from "lucide-react";
import {
  updateGroupInfo,
  updateGroupNotificationSettings,
} from "@/server/actions/corporate-group-settings.actions";

interface KonsernSettingsFormProps {
  initialData: {
    name: string;
    orgNumber: string;
    contactEmail: string;
    contactPhone: string;
    logoUrl: string | null;
    notifications: {
      scoreThreshold: number;
      incidentAlertDays: number;
      emailRecipients: string[];
    };
  };
}

export function KonsernSettingsForm({ initialData }: KonsernSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData.name);
  const [orgNumber, setOrgNumber] = useState(initialData.orgNumber);
  const [contactEmail, setContactEmail] = useState(initialData.contactEmail);
  const [contactPhone, setContactPhone] = useState(initialData.contactPhone);

  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [scoreThreshold, setScoreThreshold] = useState(initialData.notifications.scoreThreshold);
  const [incidentAlertDays, setIncidentAlertDays] = useState(initialData.notifications.incidentAlertDays);
  const [emailRecipients, setEmailRecipients] = useState(initialData.notifications.emailRecipients);
  const [newEmail, setNewEmail] = useState("");

  const [savingInfo, startSavingInfo] = useTransition();
  const [savingNotifications, startSavingNotifications] = useTransition();

  function handleSaveInfo() {
    startSavingInfo(async () => {
      try {
        await updateGroupInfo({
          name,
          orgNumber: orgNumber || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
        });
        toast({ title: "Lagret", description: "Konserninfo oppdatert" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/konsern/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setLogoUrl(data.logoUrl);
        toast({ title: "Logo lastet opp" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: data.error, variant: "destructive" });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/konsern/logo", { method: "DELETE" });
      if (res.ok) {
        setLogoUrl(null);
        toast({ title: "Logo fjernet" });
        router.refresh();
      }
    } finally {
      setRemoving(false);
    }
  }

  function addRecipient() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (emailRecipients.includes(email)) return;
    setEmailRecipients([...emailRecipients, email]);
    setNewEmail("");
  }

  function removeRecipient(email: string) {
    setEmailRecipients(emailRecipients.filter((e) => e !== email));
  }

  function handleSaveNotifications() {
    startSavingNotifications(async () => {
      try {
        await updateGroupNotificationSettings({
          scoreThreshold,
          incidentAlertDays,
          emailRecipients,
        });
        toast({ title: "Lagret", description: "Varslingsinnstillinger oppdatert" });
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Konsern-info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Konsern-informasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Konsern-navn *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nordfjord Hotellkjede AS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgNumber">Org.nr</Label>
              <Input
                id="orgNumber"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Kontakt e-post</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="post@konsern.no"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefon</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+47 xx xx xx xx"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveInfo} disabled={savingInfo || !name.trim()}>
              {savingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lagre endringer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Konsern-logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Konsern-logo"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-8 w-8 text-gray-300" />
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Logoen vises i sidemenyen og i konsern-relaterte rapporter. Maks 2 MB, PNG/JPG/WebP/SVG.
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  {logoUrl ? "Bytt logo" : "Last opp logo"}
                </Button>
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={removing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {removing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                    Fjern
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Varslingsinnstillinger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Varslingsinnstillinger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scoreThreshold">Varsle når HMS-score faller under (%)</Label>
              <Input
                id="scoreThreshold"
                type="number"
                min={0}
                max={100}
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-gray-400">
                Du mottar e-post når en bedrift har HMS-score under denne grensen
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentAlertDays">Varsle om ubehandlede hendelser eldre enn (dager)</Label>
              <Input
                id="incidentAlertDays"
                type="number"
                min={1}
                max={365}
                value={incidentAlertDays}
                onChange={(e) => setIncidentAlertDays(Number(e.target.value))}
              />
              <p className="text-xs text-gray-400">
                Hendelser som ikke er lukket innen dette antall dager genererer et varsel
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>E-postmottakere for varsler</Label>
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="epost@eksempel.no"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addRecipient} disabled={!newEmail.includes("@")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {emailRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emailRecipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    <Mail className="h-3 w-3" />
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1 rounded-full p-0.5 hover:bg-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {emailRecipients.length === 0 && (
              <p className="text-xs text-gray-400">Ingen mottakere lagt til ennå</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
              {savingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lagre varslingsinnstillinger
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
