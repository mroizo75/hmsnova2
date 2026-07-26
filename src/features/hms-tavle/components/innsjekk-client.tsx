"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Users, LogIn, LogOut, ChevronDown } from "lucide-react";

const LS_KEY = (token: string) => `innsjekk_info_${token}`;
const LS_AKTIV_KEY = (token: string) => `innsjekk_aktiv_${token}`;

interface HmsNovaUser {
  name: string;
  employer: string;
  phone: string;
}

interface AktivInnsjekk {
  checkinId: string;
  date: string;
  name: string;
}

interface Props {
  publicToken: string;
  tenantName: string;
  logoUrl: string | null;
  projectName: string | null | undefined;
  brandColor: string | null;
  todayCount: number;
  hmsNovaUser: HmsNovaUser | null;
}

function iDag(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InnsjekksClient({
  publicToken,
  tenantName,
  logoUrl,
  projectName,
  brandColor,
  todayCount,
  hmsNovaUser,
}: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [count, setCount] = useState(todayCount);
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(!hmsNovaUser);
  const [checkedInAs, setCheckedInAs] = useState<string>("");
  const [aktiv, setAktiv] = useState<AktivInnsjekk | null>(null);

  // Manuelt skjema — laster lagret info fra localStorage
  const [form, setForm] = useState({
    name: "",
    employer: "",
    employerOrgNr: "",
    hmsCardNr: "",
    birthDate: "",
    phone: "",
  });

  useEffect(() => {
    // Aktiv innsjekk gjelder kun inneværende dag, slik at utsjekk aldri
    // tilbys for en liste som allerede er avsluttet.
    try {
      const lagret = localStorage.getItem(LS_AKTIV_KEY(publicToken));
      if (lagret) {
        const parsed = JSON.parse(lagret) as AktivInnsjekk;
        if (parsed.date === iDag()) setAktiv(parsed);
        else localStorage.removeItem(LS_AKTIV_KEY(publicToken));
      }
    } catch {
      // ignorer
    }

    if (hmsNovaUser) return; // HMS Nova-brukere trenger ikke husket info
    try {
      const saved = localStorage.getItem(LS_KEY(publicToken));
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignorer
    }
  }, [publicToken, hmsNovaUser]);

  function lagreAktiv(neste: AktivInnsjekk | null) {
    setAktiv(neste);
    try {
      if (neste) localStorage.setItem(LS_AKTIV_KEY(publicToken), JSON.stringify(neste));
      else localStorage.removeItem(LS_AKTIV_KEY(publicToken));
    } catch {
      // ignorer
    }
  }

  async function doCheckin(data: {
    name: string;
    employer: string;
    employerOrgNr?: string;
    hmsCardNr?: string;
    birthDate?: string;
    phone?: string;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hms-tavle/public/${publicToken}/innsjekk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved innsjekk");
      setCount((prev) => prev + 1);
      setCheckedInAs(data.name);
      const checkinId = json.data?.checkin?.id;
      if (checkinId) lagreAktiv({ checkinId, date: iDag(), name: data.name });
      setStep("success");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckout() {
    if (!aktiv) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hms-tavle/public/${publicToken}/innsjekk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: aktiv.checkinId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved utsjekk");
      lagreAktiv(null);
      toast.success("Du er sjekket ut");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHmsNovaCheckin() {
    if (!hmsNovaUser) return;
    await doCheckin({
      name: hmsNovaUser.name,
      employer: hmsNovaUser.employer,
      phone: hmsNovaUser.phone,
    });
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Navn er påkrevd");

    // Lagre alt inkl. HMS-kortnummer til neste gang
    try {
      localStorage.setItem(LS_KEY(publicToken), JSON.stringify(form));
    } catch {
      // ignorer localStorage-feil
    }

    await doCheckin(form);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain" />}
        <div>
          <p className="font-semibold text-sm">{tenantName}</p>
          {projectName && <p className="text-xs text-muted-foreground">{projectName}</p>}
        </div>
        <Link
          href={`/tavle/${publicToken}`}
          className="ml-auto text-xs text-muted-foreground flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tilbake
        </Link>
      </div>

      <div className="max-w-sm mx-auto p-4 pt-8 space-y-6">
        {/* Tittel */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Innsjekk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Byggherreforskriften § 15 – elektronisk oversiktsliste
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-800 text-sm px-3 py-1 rounded-full border border-green-200">
            <Users className="h-3.5 w-3.5" />
            {count} innsjekket i dag
          </div>
        </div>

        {/* ── Utsjekk av egen innsjekk ────────────────────────── */}
        {aktiv && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm">Du er innsjekket</p>
                <p className="text-xs text-muted-foreground">
                  {aktiv.name} – sjekk ut når du forlater plassen.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleCheckout}
                disabled={submitting}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                {submitting ? "Sjekker ut..." : "Sjekk ut"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "form" && (
          <div className="space-y-4">
            {/* ── HMS Nova ett-klikk ────────────────────────── */}
            {hmsNovaUser && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: brandColor ?? "#16a34a" }}
                    >
                      {hmsNovaUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{hmsNovaUser.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{hmsNovaUser.employer}</p>
                      {hmsNovaUser.phone && (
                        <p className="text-muted-foreground text-xs">{hmsNovaUser.phone}</p>
                      )}
                    </div>
                    <span className="ml-auto text-[10px] bg-green-100 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium shrink-0">
                      HMS Nova
                    </span>
                  </div>

                  <Button
                    className="w-full text-base py-5"
                    style={{ backgroundColor: brandColor ?? undefined }}
                    onClick={handleHmsNovaCheckin}
                    disabled={submitting}
                  >
                    {submitting ? "Sjekker inn..." : "✓ Sjekk inn"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Logg inn-lenke for ikke-påloggede ──────────── */}
            {!hmsNovaUser && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                <LogIn className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-blue-700 flex-1">
                  Har du HMS Nova-konto?
                </p>
                <Link
                  href={`/login?callbackUrl=/tavle/${publicToken}/innsjekk`}
                  className="text-blue-600 font-medium hover:underline whitespace-nowrap"
                >
                  Logg inn →
                </Link>
              </div>
            )}

            {/* ── Skillelinje / vis manuelt skjema ───────────── */}
            {hmsNovaUser && (
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex-1 border-t border-dashed" />
                Sjekk inn som noen andre
                <ChevronDown className={`h-4 w-4 transition-transform ${showManual ? "rotate-180" : ""}`} />
                <span className="flex-1 border-t border-dashed" />
              </button>
            )}

            {/* ── Manuelt skjema ──────────────────────────────── */}
            {showManual && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label>Fullt navn *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Ola Nordmann"
                        autoComplete="name"
                        autoFocus={!hmsNovaUser}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fødselsdato</Label>
                      <Input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                        max={iDag()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Arbeidsgiver / bedrift</Label>
                      <Input
                        value={form.employer}
                        onChange={(e) => setForm({ ...form, employer: e.target.value })}
                        placeholder="Firmanavn"
                        autoComplete="organization"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Organisasjonsnummer</Label>
                      <Input
                        value={form.employerOrgNr}
                        onChange={(e) => setForm({ ...form, employerOrgNr: e.target.value })}
                        placeholder="9 siffer"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>HMS-kortnummer</Label>
                      <Input
                        value={form.hmsCardNr}
                        onChange={(e) => setForm({ ...form, hmsCardNr: e.target.value })}
                        placeholder="HMS-kort nr."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefonnummer</Label>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+47 000 00 000"
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Fødselsdato, arbeidsgiver, organisasjonsnummer og HMS-kortnummer kreves i
                      oversiktslisten etter Byggherreforskriften § 15 bokstav c–e.
                    </p>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full text-base py-6" disabled={submitting}>
                  {submitting ? "Sjekker inn..." : "Sjekk inn"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Opplysningene føres i oversiktslisten for bygge- eller anleggsplassen.
                  Behandlingsgrunnlaget er rettslig forpliktelse etter Byggherreforskriften
                  § 15, jf. GDPR art. 6 nr. 1 bokstav c. Listen oppbevares i seks måneder
                  etter at arbeidet er avsluttet, og kan vises til arbeidsgiver, verneombud,
                  Arbeidstilsynet og skattemyndighetene. Opplysningene huskes på denne enheten.
                </p>
              </form>
            )}
          </div>
        )}

        {/* ── Suksess ─────────────────────────────────────────── */}
        {step === "success" && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold">Innsjekket!</h2>
              <p className="text-muted-foreground mt-2">
                Hei {checkedInAs}, du er registrert for i dag.
              </p>
              <div className="mt-4 bg-green-50 rounded-lg p-4 text-sm text-green-800 border border-green-200">
                {count} person(er) totalt innsjekket i dag
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Husk å sjekke ut når du forlater plassen.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setStep("form");
                  if (!hmsNovaUser) {
                    setForm({
                      name: "",
                      employer: "",
                      employerOrgNr: "",
                      hmsCardNr: "",
                      birthDate: "",
                      phone: "",
                    });
                  }
                }}
                variant="outline"
              >
                Ny innsjekk
              </Button>
              <Button asChild>
                <Link href={`/tavle/${publicToken}`}>Se HMS-tavlen</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
