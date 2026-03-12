"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Smartphone, Calendar, ClipboardCheck, AlertCircle, Target, TestTube } from "lucide-react";
import type { Role, User, UserTenant } from "@prisma/client";
import { updateNotificationSettings } from "@/server/actions/notification-settings.actions";
import Link from "next/link";

interface NotificationSettingsProps {
  user: User;
  userTenant: UserTenant;
  tenant: {
    constructionDailyCheckAlertsEnabled: boolean;
    constructionDailyCheckAlertRole: Role;
  };
  isAdmin: boolean;
}

export function NotificationSettings({ user, userTenant, tenant, isAdmin }: NotificationSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Bruk innstillinger fra UserTenant (tenant-spesifikk)
  const [notifyByEmail, setNotifyByEmail] = useState(userTenant.notifyByEmail);
  const [notifyBySms, setNotifyBySms] = useState(userTenant.notifyBySms);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(userTenant.reminderDaysBefore);
  const [notifyMeetings, setNotifyMeetings] = useState(userTenant.notifyMeetings);
  const [notifyInspections, setNotifyInspections] = useState(userTenant.notifyInspections);
  const [notifyAudits, setNotifyAudits] = useState(userTenant.notifyAudits);
  const [notifyMeasures, setNotifyMeasures] = useState(userTenant.notifyMeasures);
  const [constructionDailyCheckAlertsEnabled, setConstructionDailyCheckAlertsEnabled] = useState(
    tenant.constructionDailyCheckAlertsEnabled
  );
  const [constructionDailyCheckAlertRole, setConstructionDailyCheckAlertRole] = useState<Role>(
    tenant.constructionDailyCheckAlertRole
  );

  // Sjekk telefonnummer fra både UserTenant og User (fallback)
  const hasPhoneNumber = !!userTenant.phone || !!user.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (notifyBySms && !hasPhoneNumber) {
      toast({
        variant: "destructive",
        title: "Mangler telefonnummer",
        description: "Du må legge til telefonnummer i profilen for å motta SMS-varsler",
      });
      setLoading(false);
      return;
    }

    const result = await updateNotificationSettings({
      notifyByEmail,
      notifyBySms,
      reminderDaysBefore,
      notifyMeetings,
      notifyInspections,
      notifyAudits,
      notifyMeasures,
      constructionDailyCheckAlertsEnabled,
      constructionDailyCheckAlertRole,
    });

    if (result.success) {
      toast({
        title: "✅ Innstillinger lagret",
        description: "Varslingsinnstillingene dine er oppdatert",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke lagre innstillinger",
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Varslingsinnstillinger</CardTitle>
              <CardDescription>
                Velg hvordan og når du vil motta påminnelser
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Bygg/anlegg-varsler (tenant)</CardTitle>
            <CardDescription>
              Styr daglig varsel om manglende kontroll av elektronisk oversiktsliste.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="constructionDailyCheckAlertsEnabled">
                  Aktiver daglig bygg/anlegg-varsel
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sender varsel når prosjekt har aktive personer, men ingen daglig kontroll i dag.
                </p>
              </div>
              <Switch
                id="constructionDailyCheckAlertsEnabled"
                checked={constructionDailyCheckAlertsEnabled}
                onCheckedChange={setConstructionDailyCheckAlertsEnabled}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionDailyCheckAlertRole">Hvilken rolle skal varsles?</Label>
              <Select
                value={constructionDailyCheckAlertRole}
                onValueChange={(value) => setConstructionDailyCheckAlertRole(value as Role)}
                disabled={loading}
              >
                <SelectTrigger id="constructionDailyCheckAlertRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HMS">HMS-ansvarlig</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="LEDER">Leder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Varslingsmetoder */}
      <Card>
        <CardHeader>
          <CardTitle>Varslingsmetoder</CardTitle>
          <CardDescription>
            Hvordan vil du motta varsler?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* E-post */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyByEmail">E-postvarsler</Label>
                <p className="text-sm text-muted-foreground">
                  Motta påminnelser på e-post ({user.email})
                </p>
              </div>
            </div>
            <Switch
              id="notifyByEmail"
              checked={notifyByEmail}
              onCheckedChange={setNotifyByEmail}
              disabled={loading}
            />
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyBySms">SMS-varsler</Label>
                <p className="text-sm text-muted-foreground">
                  {hasPhoneNumber
                    ? `Motta påminnelser på SMS (${userTenant.phone || user.phone})`
                    : "Legg til telefonnummer i profilen for å aktivere SMS"}
                </p>
                {notifyBySms && !hasPhoneNumber && (
                  <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    SMS krever telefonnummer
                  </p>
                )}
              </div>
            </div>
            <Switch
              id="notifyBySms"
              checked={notifyBySms}
              onCheckedChange={setNotifyBySms}
              disabled={loading || !hasPhoneNumber}
            />
          </div>

          {/* Påminnelsestid */}
          <div className="space-y-3">
            <Label htmlFor="reminderDaysBefore">Når vil du ha påminnelser?</Label>
            <Select
              value={reminderDaysBefore.toString()}
              onValueChange={(value) => setReminderDaysBefore(parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Samme dag</SelectItem>
                <SelectItem value="1">1 dag før</SelectItem>
                <SelectItem value="2">2 dager før</SelectItem>
                <SelectItem value="3">3 dager før</SelectItem>
                <SelectItem value="7">1 uke før</SelectItem>
                <SelectItem value="14">2 uker før</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Du vil motta varsler {reminderDaysBefore === 0 ? "samme dag" : `${reminderDaysBefore} dag${reminderDaysBefore > 1 ? "er" : ""} før`} planlagte hendelser
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hva vil du få varsler om */}
      <Card>
        <CardHeader>
          <CardTitle>Hva vil du få varsler om?</CardTitle>
          <CardDescription>
            Velg hvilke typer hendelser du vil bli varslet om
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Møter */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyMeetings">Møter</Label>
                <p className="text-sm text-muted-foreground">
                  AMU/VO møter, BHT møter, ledelsens gjennomgang
                </p>
              </div>
            </div>
            <Switch
              id="notifyMeetings"
              checked={notifyMeetings}
              onCheckedChange={setNotifyMeetings}
              disabled={loading}
            />
          </div>

          {/* Vernerunder/Inspeksjoner */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyInspections">Vernerunder & Inspeksjoner</Label>
                <p className="text-sm text-muted-foreground">
                  Planlagte vernerunder, HMS-inspeksjoner, sikkerhetsvandringer
                </p>
              </div>
            </div>
            <Switch
              id="notifyInspections"
              checked={notifyInspections}
              onCheckedChange={setNotifyInspections}
              disabled={loading}
            />
          </div>

          {/* Revisjoner */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyAudits">Revisjoner</Label>
                <p className="text-sm text-muted-foreground">
                  Internrevisjoner, eksterne revisjoner, sertifiseringsrevisjoner
                </p>
              </div>
            </div>
            <Switch
              id="notifyAudits"
              checked={notifyAudits}
              onCheckedChange={setNotifyAudits}
              disabled={loading}
            />
          </div>

          {/* Tiltak */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-red-600" />
              <div className="space-y-0.5">
                <Label htmlFor="notifyMeasures">Tiltak som forfaller</Label>
                <p className="text-sm text-muted-foreground">
                  Korrigerende tiltak, handlingsplaner, oppgaver du er ansvarlig for
                </p>
              </div>
            </div>
            <Switch
              id="notifyMeasures"
              checked={notifyMeasures}
              onCheckedChange={setNotifyMeasures}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info om SMS */}
      {notifyBySms && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900">
                  Om SMS-varsler
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>SMS sendes via norsk leverandør (Link Mobility)</li>
                  <li>Du mottar kun de viktigste påminnelsene på SMS</li>
                  <li>Alle varsler sendes også på e-post</li>
                  <li>Du kan når som helst slå av SMS-varsler</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Link href="/dashboard/settings/test-notifications">
          <Button type="button" variant="outline">
            <TestTube className="mr-2 h-4 w-4" />
            Test e-postvarsling
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : "Lagre innstillinger"}
        </Button>
      </div>
    </form>
  );
}

