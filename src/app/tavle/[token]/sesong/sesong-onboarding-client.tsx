"use client";

/**
 * Sesongarbeider HMS-intro – klient-komponent
 * 5 skjermbilder: Brann · Ulykke · Nærmeste leder · HMS-kontakt · Signatur
 * Tilgjengelig på 4 språk: norsk (nb), engelsk (en), polsk (pl), tysk (de)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Phone,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Globe,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Lang = "nb" | "en" | "pl" | "de";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "nb", label: "Norsk", flag: "🇳🇴" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

type TranslationKey =
  | "welcome"
  | "welcomeSub"
  | "fire"
  | "fireSub"
  | "fireNumber"
  | "fireEvac"
  | "fireRule1"
  | "fireRule2"
  | "fireRule3"
  | "accident"
  | "accidentSub"
  | "accidentNumber"
  | "accidentRule1"
  | "accidentRule2"
  | "accidentRule3"
  | "supervisor"
  | "supervisorSub"
  | "hmsContact"
  | "hmsContactSub"
  | "signTitle"
  | "signSub"
  | "namePlaceholder"
  | "signBtn"
  | "next"
  | "back"
  | "complete"
  | "doneTitle"
  | "doneSub";

const T: Record<Lang, Record<TranslationKey, string>> = {
  nb: {
    welcome: "HMS-intro for sesongansatte",
    welcomeSub: "5 korte skjermbilder om helse, miljø og sikkerhet på arbeidsplassen",
    fire: "Brann og evakuering",
    fireSub: "Hva gjør du ved brann?",
    fireNumber: "Nødnummer: 110",
    fireEvac: "Mønstringssted: se oppslagstavlen",
    fireRule1: "Alarm straks – trykk på brannvarsler eller rop BRANN",
    fireRule2: "Hjelp skadde ut – ikke gå inn igjen",
    fireRule3: "Ring 110 og meld fra til nærmeste leder",
    accident: "Ulykke og skade",
    accidentSub: "Hva gjør du ved ulykke?",
    accidentNumber: "AMK: 113 · Politi: 112",
    accidentRule1: "Sikre skadestedet – hold folk unna",
    accidentRule2: "Ring 113 ved personskade",
    accidentRule3: "Meld alltid fra til leder – selv ved småskader",
    supervisor: "Nærmeste leder",
    supervisorSub: "Din første kontakt ved spørsmål og hendelser",
    hmsContact: "HMS-kontakt",
    hmsContactSub: "Kontakt ved spørsmål om helse, miljø og sikkerhet",
    signTitle: "Bekreft at du har lest",
    signSub: "Skriv inn navn for å bekrefte at du har mottatt HMS-introen",
    namePlaceholder: "Ditt fulle navn",
    signBtn: "Bekreft og fullfør",
    next: "Neste",
    back: "Tilbake",
    complete: "Se HMS-tavlen",
    doneTitle: "Ferdig!",
    doneSub: "Din signatur er registrert. Lykke til på jobb!",
  },
  en: {
    welcome: "HSE Intro for Seasonal Workers",
    welcomeSub: "5 short screens about health, safety and environment at work",
    fire: "Fire and Evacuation",
    fireSub: "What to do in case of fire?",
    fireNumber: "Emergency: 110",
    fireEvac: "Assembly point: see notice board",
    fireRule1: "Raise the alarm immediately – press fire alarm or shout FIRE",
    fireRule2: "Help injured out – do not go back inside",
    fireRule3: "Call 110 and report to your nearest supervisor",
    accident: "Accidents and Injuries",
    accidentSub: "What to do in case of an accident?",
    accidentNumber: "Ambulance: 113 · Police: 112",
    accidentRule1: "Secure the scene – keep people away",
    accidentRule2: "Call 113 for personal injuries",
    accidentRule3: "Always report to supervisor – even minor injuries",
    supervisor: "Your Direct Supervisor",
    supervisorSub: "Your first contact for questions and incidents",
    hmsContact: "HSE Contact",
    hmsContactSub: "Contact for questions about health, safety and environment",
    signTitle: "Confirm You've Read",
    signSub: "Enter your name to confirm you have received the HSE intro",
    namePlaceholder: "Your full name",
    signBtn: "Confirm and Finish",
    next: "Next",
    back: "Back",
    complete: "View HMS Board",
    doneTitle: "Done!",
    doneSub: "Your signature has been recorded. Good luck at work!",
  },
  pl: {
    welcome: "Wprowadzenie BHP dla pracowników sezonowych",
    welcomeSub: "5 krótkich ekranów o zdrowiu, bezpieczeństwie i środowisku pracy",
    fire: "Pożar i ewakuacja",
    fireSub: "Co robić w przypadku pożaru?",
    fireNumber: "Straż pożarna: 110",
    fireEvac: "Miejsce zbiórki: patrz tablica informacyjna",
    fireRule1: "Natychmiast alarm – naciśnij czujnik pożarowy lub krzycz POŻAR",
    fireRule2: "Pomagaj rannym wyjść – nie wracaj do środka",
    fireRule3: "Zadzwoń pod 110 i poinformuj przełożonego",
    accident: "Wypadki i obrażenia",
    accidentSub: "Co robić w przypadku wypadku?",
    accidentNumber: "Pogotowie: 113 · Policja: 112",
    accidentRule1: "Zabezpiecz miejsce zdarzenia – odsuń ludzi",
    accidentRule2: "Zadzwoń 113 przy obrażeniach ciała",
    accidentRule3: "Zawsze informuj przełożonego – nawet przy drobnych urazach",
    supervisor: "Bezpośredni przełożony",
    supervisorSub: "Twój pierwszy kontakt przy pytaniach i incydentach",
    hmsContact: "Specjalista BHP",
    hmsContactSub: "Kontakt w sprawach zdrowia, bezpieczeństwa i środowiska",
    signTitle: "Potwierdź przeczytanie",
    signSub: "Wpisz swoje imię i nazwisko, aby potwierdzić odbiór instrukcji BHP",
    namePlaceholder: "Twoje pełne imię i nazwisko",
    signBtn: "Potwierdź i zakończ",
    next: "Dalej",
    back: "Wstecz",
    complete: "Tablica HMS",
    doneTitle: "Gotowe!",
    doneSub: "Twój podpis został zarejestrowany. Powodzenia w pracy!",
  },
  de: {
    welcome: "Arbeitssicherheits-Einführung für Saisonarbeiter",
    welcomeSub: "5 kurze Bildschirme zu Gesundheit, Sicherheit und Umwelt am Arbeitsplatz",
    fire: "Brand und Evakuierung",
    fireSub: "Was tun bei Brand?",
    fireNumber: "Notruf Feuerwehr: 110",
    fireEvac: "Sammelplatz: siehe Aushang",
    fireRule1: "Sofort Alarm schlagen – Feuermelder drücken oder FEUER rufen",
    fireRule2: "Verletzte raushelfen – nicht zurückgehen",
    fireRule3: "110 anrufen und Vorgesetzten informieren",
    accident: "Unfälle und Verletzungen",
    accidentSub: "Was tun bei einem Unfall?",
    accidentNumber: "Rettungsdienst: 113 · Polizei: 112",
    accidentRule1: "Unfallstelle sichern – Personen fernhalten",
    accidentRule2: "Bei Personenschäden 113 anrufen",
    accidentRule3: "Immer dem Vorgesetzten melden – auch bei kleinen Verletzungen",
    supervisor: "Direkter Vorgesetzter",
    supervisorSub: "Ihr erster Ansprechpartner bei Fragen und Vorfällen",
    hmsContact: "Sicherheitsbeauftragter",
    hmsContactSub: "Kontakt bei Fragen zu Gesundheit, Sicherheit und Umwelt",
    signTitle: "Bestätigung der Kenntnisnahme",
    signSub: "Geben Sie Ihren Namen ein, um den Empfang der Sicherheitseinweisung zu bestätigen",
    namePlaceholder: "Ihr vollständiger Name",
    signBtn: "Bestätigen und abschließen",
    next: "Weiter",
    back: "Zurück",
    complete: "HMS-Tafel anzeigen",
    doneTitle: "Fertig!",
    doneSub: "Ihre Unterschrift wurde erfasst. Viel Erfolg bei der Arbeit!",
  },
};

interface SesongOnboardingClientProps {
  tavleId: string;
  tavleNavn: string;
  tenantNavn: string;
  tenantLogoUrl?: string | null;
  bransje: string;
  hmsContactName?: string | null;
  hmsContactPhone?: string | null;
  evacuationPoint?: string | null;
}

const STEPS = 5; // brann, ulykke, leder, hms-kontakt, signatur

export function SesongOnboardingClient({
  tavleId,
  tavleNavn,
  tenantNavn,
  tenantLogoUrl,
  bransje,
  hmsContactName,
  hmsContactPhone,
  evacuationPoint,
}: SesongOnboardingClientProps) {
  const [lang, setLang] = useState<Lang>("nb");
  const [step, setStep] = useState(0); // 0 = language select, 1-5 = screens, 6 = done
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const t = T[lang];

  async function handleSign() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavleId}/sesong-signatur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), lang }),
      });
      if (res.ok) {
        setDone(true);
        setStep(6);
      } else {
        toast({ title: "Feil", description: "Kunne ikke registrere signatur. Prøv igjen.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Feil", description: "Nettverksfeil. Prøv igjen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 gap-6">
        <div className="flex flex-col items-center gap-3 text-white text-center">
          {tenantLogoUrl ? (
            <img src={tenantLogoUrl} alt={tenantNavn} className="h-12 w-auto bg-white rounded-lg px-3 py-1" />
          ) : (
            <div className="text-2xl font-black text-green-400">HMS Nova</div>
          )}
          <h1 className="text-xl font-bold">{tenantNavn}</h1>
          <p className="text-slate-400 text-sm max-w-xs">Velg ditt språk / Select your language / Wybierz język / Sprache wählen</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setStep(1); }}
              className="flex items-center gap-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white p-4 text-left transition-colors border border-slate-700"
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="font-medium text-sm">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
          <Check className="h-10 w-10 text-white" />
        </div>
        <div className="text-white space-y-2">
          <h1 className="text-3xl font-black">{t.doneTitle}</h1>
          <p className="text-slate-300">{t.doneSub}</p>
        </div>
        <Button asChild variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
          <a href={`/tavle/${tavleId}`}>{t.complete}</a>
        </Button>
      </div>
    );
  }

  const progress = ((step - 1) / (STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-white/60 text-xs">{tenantNavn}</div>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="flex items-center gap-1 text-white/40 hover:text-white/60 text-xs"
        >
          <Globe className="h-3 w-3" />
          {LANGS.find((l) => l.code === lang)?.flag}
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <Progress value={progress} className="h-1 bg-slate-700" />
        <p className="text-white/40 text-xs mt-1.5">{step} / {STEPS}</p>
      </div>

      {/* Innhold */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">

        {/* Skjerm 1 – Brann */}
        {step === 1 && (
          <ScreenCard
            icon={<Flame className="h-8 w-8" />}
            iconBg="bg-red-500"
            title={t.fire}
            subtitle={t.fireSub}
          >
            <EmergencyNumber number={t.fireNumber} />
            {evacuationPoint && (
              <div className="rounded-lg bg-slate-800 px-4 py-3 text-white text-sm">
                <span className="text-slate-400">Mønstringssted: </span>
                {evacuationPoint}
              </div>
            )}
            <RuleList rules={[t.fireRule1, t.fireRule2, t.fireRule3]} />
          </ScreenCard>
        )}

        {/* Skjerm 2 – Ulykke */}
        {step === 2 && (
          <ScreenCard
            icon={<AlertTriangle className="h-8 w-8" />}
            iconBg="bg-orange-500"
            title={t.accident}
            subtitle={t.accidentSub}
          >
            <EmergencyNumber number={t.accidentNumber} />
            <RuleList rules={[t.accidentRule1, t.accidentRule2, t.accidentRule3]} />
          </ScreenCard>
        )}

        {/* Skjerm 3 – Nærmeste leder */}
        {step === 3 && (
          <ScreenCard
            icon={<User className="h-8 w-8" />}
            iconBg="bg-blue-500"
            title={t.supervisor}
            subtitle={t.supervisorSub}
          >
            <ContactCard name={null} phone={null} placeholder />
          </ScreenCard>
        )}

        {/* Skjerm 4 – HMS-kontakt */}
        {step === 4 && (
          <ScreenCard
            icon={<ShieldCheck className="h-8 w-8" />}
            iconBg="bg-green-500"
            title={t.hmsContact}
            subtitle={t.hmsContactSub}
          >
            <ContactCard name={hmsContactName} phone={hmsContactPhone} />
          </ScreenCard>
        )}

        {/* Skjerm 5 – Signatur */}
        {step === 5 && (
          <ScreenCard
            icon={<Check className="h-8 w-8" />}
            iconBg="bg-green-600"
            title={t.signTitle}
            subtitle={t.signSub}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sigName" className="text-white/70 text-sm">{t.namePlaceholder}</Label>
                <Input
                  id="sigName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  autoComplete="name"
                />
              </div>
              <Button
                onClick={handleSign}
                disabled={loading || !name.trim()}
                className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t.signBtn}
              </Button>
            </div>
          </ScreenCard>
        )}
      </div>

      {/* Navigasjon */}
      {step < 5 && (
        <div className="flex items-center justify-between px-4 pb-6 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="text-white/60 hover:text-white hover:bg-slate-800 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.back}
          </Button>
          <Button
            size="sm"
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="bg-green-600 hover:bg-green-500 text-white gap-1"
          >
            {t.next}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Sub-komponenter ───────────────────────────────────────────────────────────

function ScreenCard({ icon, iconBg, title, subtitle, children }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmergencyNumber({ number }: { number: string }) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 flex items-center gap-3">
      <Phone className="h-5 w-5 text-green-400 shrink-0" />
      <span className="text-white font-bold text-lg">{number}</span>
    </div>
  );
}

function RuleList({ rules }: { rules: string[] }) {
  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5">
            {i + 1}
          </span>
          <span className="text-white/90 text-sm">{rule}</span>
        </div>
      ))}
    </div>
  );
}

function ContactCard({ name, phone, placeholder }: { name: string | null; phone: string | null; placeholder?: boolean }) {
  if (placeholder) {
    return (
      <div className="rounded-xl bg-slate-800 border border-slate-600 p-4 space-y-2">
        <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
        <p className="text-slate-500 text-xs mt-2">Se oppslagstavlen / Check the notice board</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600 p-4">
      <p className="text-white font-bold text-lg">{name ?? "–"}</p>
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 mt-2 text-green-400 hover:text-green-300">
          <Phone className="h-4 w-4" />
          <span className="text-base font-medium">{phone}</span>
        </a>
      )}
    </div>
  );
}
