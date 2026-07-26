"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HmsTavlePlan, HmsTavleSectionType, TavleDisplayMode } from "@prisma/client";
import { cn } from "@/lib/utils";
import { toImageUrl } from "@/features/hms-tavle/lib/image-url";
import {
  Shield,
  Phone,
  FileText,
  Users,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  CheckSquare,
  ExternalLink,
  Cloud,
  BookOpen,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  QrCode,
  Flame,
  Siren,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Map,
  Wind,
  Droplets,
  MapPin,
  UserCheck,
  FolderOpen,
  FlaskConical,
  GraduationCap,
  Gauge,
  Wrench,
  Bell,
  Search,
  MessageSquare,
  X,
  Send,
  type LucideIcon,
} from "lucide-react";
import {
  ALLE_SNARVEIER,
  DEFAULT_SNARVEIER_CONFIG,
  type SnarveiConfig,
} from "@/features/hms-tavle/lib/snarveier-config";
import { getLovkravItems } from "@/features/hms-tavle/lib/bransje-config";

// ─── Klokke ──────────────────────────────────────────────────────
function LiveClock({ large = false }: { large?: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (large) {
    return (
      <div className="text-right">
        <div className="font-mono tabular-nums text-4xl font-bold text-white leading-none">
          {time.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-blue-200 text-sm mt-1 capitalize">
          {time.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    );
  }
  return (
    <span className="font-mono tabular-nums">
      {time.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

// ─── Vær-hook ────────────────────────────────────────────────────
interface WeatherData {
  location: string;
  current: {
    temp: number;
    emoji: string;
    label: string;
    windSpeed: number;
    humidity: number;
    symbolCode: string;
  };
  forecast: Array<{
    date: string;
    tempMin: number | null;
    tempMax: number | null;
    emoji: string;
    label: string;
    symbolCode: string;
    precipitation: number;
  }>;
}

function useWeather(location: string | null | undefined): { data: WeatherData | null; loading: boolean } {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location?.trim()) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/weather?q=${encodeURIComponent(location.trim())}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && !json.error) setData(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [location]);

  return { data, loading };
}

// ─── Liten værvideo i header ──────────────────────────────────────
function WeatherMini({ data, location }: { data: WeatherData | null; location?: string | null }) {
  if (!data) return null;
  // Vis kun første del av stedsnavnet (f.eks. "Oslo, Norge" → "Oslo")
  const stedsnavn = location?.split(",")[0]?.trim();
  return (
    <div className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
      <span className="text-2xl leading-none">{data.current.emoji}</span>
      <div>
        {stedsnavn && (
          <div className="text-blue-300/80 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">
            {stedsnavn}
          </div>
        )}
        <div className="text-white font-black text-xl tabular-nums leading-none">{data.current.temp}°</div>
        <div className="text-white/50 text-[10px] leading-none mt-0.5">{data.current.label}</div>
      </div>
    </div>
  );
}

// ─── Logo med fallback ────────────────────────────────────────────
function TavleLogo({ logoUrl, name }: { logoUrl?: string | null; name?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Logo"}
        className="object-contain"
        style={{ maxHeight: "84px", maxWidth: "280px", width: "auto", height: "auto" }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
        <Shield className="h-6 w-6 text-white" />
      </div>
      <span className="text-white font-bold text-sm leading-tight">
        DIGITAL<br /><span className="text-blue-300 font-normal">HMS Tavle</span>
      </span>
    </div>
  );
}

// ─── Hjelper: finn seksjon etter type ────────────────────────────
function getSectionConfig(tavle: any, type: HmsTavleSectionType): Record<string, any> {
  const section = (tavle.sections ?? []).find((s: any) => s.type === type);
  return (section?.config as Record<string, any>) ?? {};
}

// ─── Fast venstre kolonne (alltid synlig) ─────────────────────────
function FixedSidebar({
  tavle,
  checkins,
  isAddon,
  publicToken,
  plan,
  appUrl,
}: {
  tavle: any;
  checkins: any[];
  isAddon: boolean;
  publicToken: string;
  plan: HmsTavlePlan;
  appUrl: string;
}) {
  // Kontakter: fra KONTAKTINFO-seksjonens config, med fallback til manualContacts
  const kontaktCfg = getSectionConfig(tavle, "KONTAKTINFO");
  const contacts: any[] = kontaktCfg.contacts ?? tavle.manualContacts ?? [];

  // SHA-plan: fra SHA_PLAN-seksjonens config (standalone), eller HMS Nova (addon)
  const shaCfg = getSectionConfig(tavle, "SHA_PLAN");
  const shaPlan = tavle.project?.constructionShaPlan;
  const shaStatusAddon = isAddon ? shaPlan?.status : null;
  const shaStatusManual = shaCfg.status as string | undefined;

  const shaStatus = isAddon
    ? (shaStatusAddon === "ACTIVE" ? "godkjent" : shaStatusAddon ? "under-arbeid" : null)
    : shaStatusManual;

  return (
    <div className="space-y-3">

      {/* ── Nødetater – alltid øverst ─────────────────────────── */}
      <div className="bg-red-900/90 rounded-xl border border-red-700 p-3">
        <p className="text-red-300 text-[10px] font-bold uppercase tracking-widest mb-2">
          🚨 Nødetater
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Brann", nr: "110", icon: Flame, color: "text-orange-400" },
            { label: "Ambulanse", nr: "113", icon: Siren, color: "text-green-400" },
            { label: "Politi", nr: "112", icon: ShieldAlert, color: "text-blue-400" },
          ].map((e) => {
            const Icon = e.icon;
            return (
              <a key={e.nr} href={`tel:${e.nr}`} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5", e.color)} />
                  <span className="text-white text-xs">{e.label}</span>
                </div>
                <span className={cn("font-mono font-black text-lg tabular-nums group-hover:scale-110 transition-transform", e.color)}>
                  {e.nr}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── SHA-plan status ───────────────────────────────────── */}
      <div className="bg-white/10 rounded-xl p-3 border border-white/20">
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <ClipboardList className="h-3 w-3" /> SHA-plan
        </p>
        {shaStatus === "godkjent" ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-green-300 text-xs font-semibold leading-tight">Godkjent</span>
          </div>
        ) : shaStatus === "under-arbeid" ? (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <span className="text-yellow-300 text-xs font-semibold leading-tight">Under arbeid</span>
          </div>
        ) : (
          <span className="text-white/40 text-xs italic">Ikke satt</span>
        )}
        {shaCfg.pdfUrl && (
          <a href={shaCfg.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-blue-300 text-xs hover:text-white transition-colors border border-blue-500/30 rounded-lg px-2 py-1.5 bg-blue-900/20">
            <FileText className="h-3.5 w-3.5 shrink-0" /> Åpne SHA-plan (PDF)
          </a>
        )}
      </div>

      {/* ── Kontaktpersoner (scrollbar om mange) ─────────────── */}
      <div className="bg-white/10 rounded-xl p-3 border border-white/20">
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          Kontaktpersoner
        </p>
        {contacts.length === 0 ? (
          <p className="text-white/50 text-xs italic">Ingen kontakter registrert</p>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {contacts.map((c: any, i: number) => (
              <div key={i} className="flex flex-col gap-0.5 pb-2.5 border-b border-white/10 last:border-0 last:pb-0">
                <p className="text-white text-sm font-semibold leading-tight">{c.name}</p>
                <p className="text-blue-300 text-xs">{c.role}</p>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="text-blue-200 font-mono text-sm hover:text-white">
                    {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-blue-300/70 text-xs hover:text-white truncate block">
                    {c.email}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}

// ─── Ikon-oppslag for snarveier ──────────────────────────────────
const SNARVEI_ICONS: Record<string, LucideIcon> = {
  AlertTriangle, Shield, ClipboardList, Search, UserCheck,
  FolderOpen, FlaskConical, GraduationCap, Gauge, Wrench, Clock, Bell,
};

// ─── Roterende seksjonskomponenter ───────────────────────────────

function SectionCard({
  type, title, config, tavle, checkins, plan, appUrl, publicToken, weatherData, locale,
}: {
  type: HmsTavleSectionType;
  title: string | null;
  config: any;
  tavle: any;
  checkins: any[];
  plan: HmsTavlePlan;
  appUrl: string;
  publicToken: string;
  weatherData: WeatherData | null;
  locale?: "nb" | "en";
}) {
  const isAddon = plan === "ADDON";
  switch (type) {
    case "KONTAKTINFO":
      return <KontaktDetaljerSection title={title} config={config} tavle={tavle} />;
    case "BEREDSKAPSPLAN":
      return <BeredskapsSection title={title} config={config} />;
    case "SHA_PLAN":
      return <ShaPlanSection title={title} config={config} tavle={tavle} isAddon={isAddon} />;
    case "MANNSKAPSLISTE":
      return <MannskapslisteSection title={title} checkins={checkins} tavle={tavle} appUrl={appUrl} publicToken={publicToken} />;
    case "AVVIK_STATISTIKK":
    case "RUH_LISTE":
      return <AvvikSection title={title} config={config} isAddon={isAddon} />;
    case "DOKUMENT_HUB":
      return <DokumentHubSection title={title} config={config} tavle={tavle} />;
    case "EKSTERN_LENKE":
      return <EksternLenkeSection title={title} tavle={tavle} />;
    case "VAERMELDING":
      return <VaermeldingSection title={title} location={config?.location ?? tavle.project?.location} weatherData={weatherData} />;
    case "NYHETER_MELDINGER":
      return <NyheterSection title={title} config={config} />;
    case "LOVKRAV_SJEKKLISTE":
      return <LovkravSection title={title} tavle={tavle} isAddon={isAddon} />;
    case "KPI_DASHBOARD":
      return <KpiSection title={title} />;
    case "FREMDRIFTSPLAN":
      return <FremdriftsplanSection title={title} config={config} />;
    case "RIGGPLAN":
      return <RiggplanSection title={title} config={config} />;
    case "RISIKOMATRISE":
      return <RisikomatriseSection title={title} config={config} />;
    case "SNARVEIER":
      return <SnarveierSection title={title} config={config} isAddon={isAddon} publicToken={publicToken} appUrl={appUrl} />;
    case "GJEST_SKJEMA":
      return <GjestSkjemaSection title={title} config={config} publicToken={publicToken} tavle={tavle} locale={locale} />;
    default:
      return <Wrapper icon={<BarChart3 className="h-6 w-6" />} title={title ?? type}><p className="text-white/50">Ingen data</p></Wrapper>;
  }
}

function SnarveierSection({ title, config, isAddon, publicToken, appUrl }: {
  title: string | null; config: any; isAddon: boolean; publicToken: string; appUrl: string;
}) {
  const shortcuts: SnarveiConfig[] = config?.shortcuts?.length > 0
    ? config.shortcuts
    : DEFAULT_SNARVEIER_CONFIG;
  const synlige = shortcuts.filter((s) => s.isVisible);
  const getUrl = (s: SnarveiConfig): string | null => {
    const def = ALLE_SNARVEIER.find((d) => d.id === s.id);
    if (!def) return null;
    if (def.id === "innsjekk") return `/tavle/${publicToken}/innsjekk`;
    if (s.externalUrl) return s.externalUrl;
    if (isAddon && def.hmsFunksjon) return def.hmsFunksjon; // relativ sti — samme domene
    return null;
  };
  const custom: Array<{ id: string; label: string; url: string; color: string; emoji?: string }> =
    config?.customShortcuts ?? [];
  const aktive = synlige.filter((s) => getUrl(s) !== null);
  const harNoe = aktive.length > 0 || custom.length > 0;

  return (
    <Wrapper icon={<CheckSquare className="h-6 w-6" />} title={title ?? "Hurtigtilganger"}>
      {!harNoe ? (
        <p className="text-white/50 text-sm">Ingen snarveier aktivert.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {aktive.map((s) => {
            const def = ALLE_SNARVEIER.find((d) => d.id === s.id);
            if (!def) return null;
            const url = getUrl(s)!;
            const label = s.customLabel || def.label;
            const Icon = SNARVEI_ICONS[def.icon] ?? Shield;
            return (
              <a key={s.id} href={url} target={s.externalUrl ? "_blank" : "_self"} rel="noopener noreferrer">
                <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center cursor-pointer ${def.color}`}>
                  <Icon className={`h-7 w-7 ${def.textColor}`} />
                  <span className="text-xs font-semibold leading-tight text-white">{label}</span>
                  {def.lovRef && <span className="text-[9px] text-white/50">{def.lovRef}</span>}
                </div>
              </a>
            );
          })}
          {custom.map((c) => {
            const col = CUSTOM_COLOR_MAP[c.color] ?? CUSTOM_COLOR_MAP.blue;
            return (
              <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer">
                <div className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center cursor-pointer", col.cls)}>
                  <span className="text-3xl leading-none">{c.emoji || "🔗"}</span>
                  <span className="text-xs font-semibold leading-tight text-white">{c.label}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </Wrapper>
  );
}

const CUSTOM_COLOR_MAP: Record<string, { cls: string; text: string }> = {
  blue:   { cls: "bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/40",     text: "text-blue-300" },
  green:  { cls: "bg-green-500/20 hover:bg-green-500/40 border-green-500/40",   text: "text-green-300" },
  red:    { cls: "bg-red-500/20 hover:bg-red-500/40 border-red-500/40",         text: "text-red-300" },
  orange: { cls: "bg-orange-500/20 hover:bg-orange-500/40 border-orange-500/40",text: "text-orange-300" },
  purple: { cls: "bg-purple-500/20 hover:bg-purple-500/40 border-purple-500/40",text: "text-purple-300" },
  yellow: { cls: "bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500/40",text: "text-yellow-300" },
  slate:  { cls: "bg-slate-500/20 hover:bg-slate-500/40 border-slate-500/40",   text: "text-slate-300" },
};

/** Kompakt snarveier-bar — full bredde, ikoner i en rad, brukt i kiosk-topp */
function SnarveierKompaktBar({ config, isAddon, publicToken, appUrl: _appUrl }: {
  config: any; isAddon: boolean; publicToken: string; appUrl: string;
}) {
  const shortcuts: SnarveiConfig[] = config?.shortcuts?.length > 0
    ? config.shortcuts
    : DEFAULT_SNARVEIER_CONFIG;
  const custom: Array<{ id: string; label: string; url: string; color: string; emoji?: string }> =
    config?.customShortcuts ?? [];

  const synlige = shortcuts.filter((s) => s.isVisible);
  const getUrl = (s: SnarveiConfig): string | null => {
    const def = ALLE_SNARVEIER.find((d) => d.id === s.id);
    if (!def) return null;
    if (def.id === "innsjekk") return `/tavle/${publicToken}/innsjekk`;
    if (s.externalUrl) return s.externalUrl;
    if (isAddon && def.hmsFunksjon) return def.hmsFunksjon;
    return null;
  };
  const aktive = synlige.filter((s) => getUrl(s) !== null);
  const harNoe = aktive.length > 0 || custom.length > 0;
  if (!harNoe) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-1">
      {/* Forhåndsdefinerte */}
      {aktive.map((s) => {
        const def = ALLE_SNARVEIER.find((d) => d.id === s.id);
        if (!def) return null;
        const url = getUrl(s)!;
        const label = s.customLabel || def.label;
        const Icon = SNARVEI_ICONS[def.icon] ?? Shield;
        return (
          <a key={s.id} href={url} target={s.externalUrl ? "_blank" : "_self"} rel="noopener noreferrer">
            <div className={cn(
              "flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl border transition-all text-center min-w-[80px] hover:scale-105",
              def.color
            )}>
              <Icon className={cn("h-6 w-6", def.textColor)} />
              <span className="text-[11px] font-semibold leading-tight whitespace-nowrap text-white">{label}</span>
            </div>
          </a>
        );
      })}
      {/* Egendefinerte */}
      {custom.map((c) => {
        const col = CUSTOM_COLOR_MAP[c.color] ?? CUSTOM_COLOR_MAP.blue;
        return (
          <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer">
            <div className={cn(
              "flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl border transition-all text-center min-w-[80px] hover:scale-105",
              col.cls
            )}>
              <span className="text-2xl leading-none">{c.emoji || "🔗"}</span>
              <span className="text-[11px] font-semibold leading-tight whitespace-nowrap text-white">{c.label}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function Wrapper({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white/10 rounded-2xl border border-white/20 p-5 gap-3 overflow-hidden">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        <h3 className="text-white font-bold text-base leading-tight">{title}</h3>
        {badge && <span className="ml-auto text-blue-300 text-xs border border-blue-400/40 rounded px-2 py-0.5 shrink-0">{badge}</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

function KontaktDetaljerSection({ title, config, tavle }: { title: string | null; config: any; tavle: any }) {
  const contacts: any[] = config?.contacts ?? tavle.manualContacts ?? [];
  return (
    <Wrapper icon={<Phone className="h-6 w-6" />} title={title ?? "Alle kontaktpersoner"}>
      {contacts.length === 0 ? (
        <p className="text-white/50">Ingen kontakter registrert — legg til via innstillinger</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {contacts.map((c: any, i: number) => (
            <div key={i} className="bg-white/10 rounded-xl p-3 space-y-0.5">
              <p className="text-white font-semibold leading-tight">{c.name}</p>
              <p className="text-blue-300 text-sm">{c.role}</p>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-blue-200 font-mono text-sm hover:text-white">
                  <Phone className="h-3 w-3" />{c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-blue-300/80 text-xs hover:text-white truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />{c.email}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  );
}

function BeredskapsSection({ title, config }: { title: string | null; config: any }) {
  const steps: string[] = config?.customSteps ?? [
    "1. Varsle berørte – ring 113",
    "2. Sikre ulykkesstedet",
    "3. Varsle arbeidsgiver og Arbeidstilsynet",
  ];
  return (
    <Wrapper icon={<Shield className="h-6 w-6" />} title={title ?? "Beredskapsplan"} badge="AML § 5-2">
      <div className="space-y-4">
        <div className="bg-red-900/50 border border-red-700/50 rounded-xl p-4 space-y-2">
          <p className="text-red-300 font-semibold">Ved ulykke:</p>
          {steps.map((step, i) => (
            <p key={i} className="text-white text-sm">{step}</p>
          ))}
        </div>
        {config?.pdfUrl && (
          <a href={config.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors">
            <FileText className="h-5 w-5" /> Se beredskapsplan (PDF)
          </a>
        )}
        {config?.imageUrl && (
          <img src={toImageUrl(config.imageUrl)} alt="Beredskapsplan" className="w-full rounded-xl object-contain max-h-48" />
        )}
      </div>
    </Wrapper>
  );
}

function ShaPlanSection({ title, config, tavle, isAddon }: { title: string | null; config: any; tavle: any; isAddon: boolean }) {
  const shaPlan = tavle.project?.constructionShaPlan;
  const status = isAddon
    ? (shaPlan?.status === "ACTIVE" ? "godkjent" : shaPlan ? "under-arbeid" : null)
    : (config?.status as string | undefined);

  return (
    <Wrapper icon={<ClipboardList className="h-6 w-6" />} title={title ?? "SHA-plan"} badge="§ 7+8">
      <div className="space-y-3">
        {/* Status */}
        {status === "godkjent" ? (
          <div className="flex items-center gap-3 text-xl font-bold rounded-xl p-3 bg-green-900/50 text-green-300">
            <CheckCircle2 className="h-7 w-7" /> Godkjent og aktiv
            {config?.version && <span className="ml-auto text-white/50 text-sm font-normal">v{config.version}</span>}
          </div>
        ) : status === "under-arbeid" ? (
          <div className="flex items-center gap-3 text-xl font-bold rounded-xl p-3 bg-yellow-900/50 text-yellow-300">
            <AlertTriangle className="h-7 w-7" /> Under arbeid
          </div>
        ) : (
          <div className="flex items-center gap-3 text-lg rounded-xl p-3 bg-white/10 text-white/60">
            <ClipboardList className="h-6 w-6" /> Ikke koblet til
          </div>
        )}

        {/* PDF-lenke alltid synlig, OVER bildet */}
        {config?.pdfUrl && (
          <a href={config.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
            <FileText className="h-4 w-4 shrink-0" /> Åpne SHA-plan (PDF)
          </a>
        )}

        {config?.approvedDate && (
          <p className="text-white/50 text-xs">Godkjent: {new Date(config.approvedDate).toLocaleDateString("nb-NO")}</p>
        )}

      </div>
    </Wrapper>
  );
}

/** Kompakt mannskap-blokk til header-baren — alltid synlig */
function HeaderMannskapsBlock({
  checkins,
  publicToken,
  appUrl,
}: {
  checkins: any[];
  publicToken: string;
  appUrl: string;
}) {
  const checkinUrl = `${appUrl}/tavle/${publicToken}/innsjekk`;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(checkinUrl, {
        width: 96,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then(setQrDataUrl);
    });
  }, [checkinUrl]);

  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl border border-white/20 px-4 py-2">
      {/* QR */}
      <a href={checkinUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
        {qrDataUrl ? (
          <div className="bg-white rounded-lg p-1 group-hover:scale-105 transition-transform">
            <img src={qrDataUrl} alt="QR innsjekk" className="w-12 h-12 block" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-white/10 rounded-lg animate-pulse" />
        )}
      </a>

      {/* Teller + label */}
      <div className="flex flex-col items-start">
        <span className="text-white text-3xl font-black tabular-nums leading-none">{checkins.length}</span>
        <span className="text-blue-300 text-xs leading-tight">innsjekket i dag</span>
        <span className="text-white/40 text-[10px] leading-tight">Skann QR for innsjekk</span>
      </div>

    </div>
  );
}

function MannskapslisteSection({ title, checkins, tavle, appUrl, publicToken }: {
  title: string | null; checkins: any[]; tavle: any; appUrl: string; publicToken: string;
}) {
  const checkinUrl = `${appUrl}/tavle/${publicToken}/innsjekk`;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(checkinUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then(setQrDataUrl);
    });
  }, [checkinUrl]);

  return (
    <Wrapper icon={<Users className="h-6 w-6" />} title={title ?? "Mannskapsliste"} badge="§ 15">
      <div className="flex gap-4 h-full">
        {/* Venstre: teller + navn */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-white text-5xl font-black tabular-nums">{checkins.length}</span>
            <span className="text-blue-300 text-sm mb-1.5">innsjekket i dag</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 overflow-hidden max-h-40">
            {checkins.slice(0, 10).map((c: any) => (
              <div key={c.id} className="bg-white/10 rounded-lg px-2.5 py-1 text-sm flex items-center gap-2">
                <span className="text-white font-medium truncate">{c.name}</span>
                {c.employer && <span className="text-blue-300 text-xs truncate shrink-0">· {c.employer}</span>}
              </div>
            ))}
          </div>
          {checkins.length > 10 && (
            <p className="text-white/50 text-xs">+{checkins.length - 10} til registrert</p>
          )}
        </div>

        {/* Høyre: QR-kode */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          {qrDataUrl ? (
            <a href={checkinUrl} target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-white rounded-xl p-2 shadow-lg group-hover:scale-105 transition-transform">
                <img src={qrDataUrl} alt="QR innsjekk" className="w-28 h-28 block" />
              </div>
            </a>
          ) : (
            <div className="w-28 h-28 bg-white/10 rounded-xl animate-pulse" />
          )}
          <p className="text-white/60 text-xs text-center leading-tight">Skann for<br />innsjekk</p>
        </div>
      </div>
    </Wrapper>
  );
}

function AvvikSection({ title, config, isAddon }: { title: string | null; config: any; isAddon: boolean }) {
  if (isAddon) {
    return (
      <Wrapper icon={<AlertTriangle className="h-6 w-6" />} title={title ?? "Avvik og RUH"} badge="HMS Nova">
        <p className="text-white/50 text-sm">Live avviksstatistikk fra HMS Nova lastes her.</p>
      </Wrapper>
    );
  }
  const { openCount, criticalCount, closedThisMonth, lastUpdated } = config ?? {};
  const hasData = openCount !== undefined || criticalCount !== undefined || closedThisMonth !== undefined;
  return (
    <Wrapper icon={<AlertTriangle className="h-6 w-6" />} title={title ?? "Avvik og RUH"}>
      {!hasData ? (
        <p className="text-white/50 text-sm">Ingen statistikk registrert ennå — oppdater via innstillinger.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-900/50 border border-red-700/40 rounded-xl p-3 text-center">
              <p className="text-red-300 text-3xl font-black tabular-nums">{openCount ?? 0}</p>
              <p className="text-white/60 text-xs mt-1">Åpne avvik</p>
            </div>
            <div className="bg-orange-900/50 border border-orange-700/40 rounded-xl p-3 text-center">
              <p className="text-orange-300 text-3xl font-black tabular-nums">{criticalCount ?? 0}</p>
              <p className="text-white/60 text-xs mt-1">Kritiske</p>
            </div>
            <div className="bg-green-900/50 border border-green-700/40 rounded-xl p-3 text-center">
              <p className="text-green-300 text-3xl font-black tabular-nums">{closedThisMonth ?? 0}</p>
              <p className="text-white/60 text-xs mt-1">Lukket mnd.</p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-white/40 text-xs text-right">
              Oppdatert: {new Date(lastUpdated).toLocaleDateString("nb-NO")}
            </p>
          )}
        </div>
      )}
    </Wrapper>
  );
}

function DokumentHubSection({ title, config, tavle }: { title: string | null; config: any; tavle: any }) {
  const links = tavle.externalLinks ?? [];
  // config kan ha imageUrl/pdfUrl for riggplan e.l., resten hentes fra externalLinks
  const items = links.slice(0, 8).map((l: any) => ({ key: l.id, href: l.url, label: l.title }));
  return (
    <Wrapper icon={<BookOpen className="h-6 w-6" />} title={title ?? "Dokumenthub"}>
      <div className="space-y-3">
        {config?.imageUrl && (
          <img src={toImageUrl(config.imageUrl)} alt="Dokument" className="w-full rounded-xl object-contain max-h-48 border border-white/10" />
        )}
        <div className="grid grid-cols-2 gap-3">
          {config?.pdfUrl && (
            <a href={config.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-blue-200 hover:text-white hover:bg-white/20 transition-colors">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium truncate">{config.description ?? "Dokument"}</span>
            </a>
          )}
          {items.map((item: any) => (
            <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-blue-200 hover:text-white hover:bg-white/20 transition-colors">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </a>
          ))}
          {!config?.pdfUrl && items.length === 0 && (
            <p className="text-white/50 col-span-2">Ingen dokumenter lagt til</p>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

function EksternLenkeSection({ title, tavle }: { title: string | null; tavle: any }) {
  const links = tavle.externalLinks ?? [];
  return (
    <Wrapper icon={<ExternalLink className="h-6 w-6" />} title={title ?? "Systemer og lenker"}>
      <div className="grid grid-cols-2 gap-3">
        {links.map((l: any) => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-blue-200 hover:text-white hover:bg-white/20 transition-colors">
            <ExternalLink className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium truncate">{l.title}</span>
          </a>
        ))}
        {links.length === 0 && <p className="text-white/50 col-span-2">Ingen lenker konfigurert</p>}
      </div>
    </Wrapper>
  );
}

function VaermeldingSection({ title, location, weatherData }: {
  title: string | null; location?: string; weatherData: WeatherData | null;
}) {
  const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  if (!location) {
    return (
      <Wrapper icon={<Cloud className="h-6 w-6" />} title={title ?? "Værvarsling"}>
        <p className="text-white/50 text-sm">Legg til sted i innstillinger for å vise værvarsling.</p>
      </Wrapper>
    );
  }

  if (!weatherData) {
    return (
      <Wrapper icon={<Cloud className="h-6 w-6" />} title={title ?? `Værvarsling – ${location}`}>
        <div className="flex items-center gap-3 text-white/50">
          <Cloud className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Henter værdata...</span>
        </div>
      </Wrapper>
    );
  }

  const { current, forecast } = weatherData;
  const today = forecast[0];
  const nextDays = forecast.slice(1, 4);

  return (
    <Wrapper icon={<Cloud className="h-6 w-6" />} title={title ?? `Værvarsling – ${location}`}>
      <div className="space-y-4">
        {/* Nåværende vær */}
        <div className="bg-sky-900/50 border border-sky-700/40 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sky-300 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {location}
              </p>
              <div className="flex items-end gap-3">
                <span className="text-5xl">{current.emoji}</span>
                <div>
                  <p className="text-white text-4xl font-black tabular-nums leading-none">{current.temp}°C</p>
                  <p className="text-sky-300 text-sm mt-1">{current.label}</p>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-1.5 text-white/60 text-sm justify-end">
                <Wind className="h-4 w-4 text-sky-400" />
                <span>{current.windSpeed} m/s</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60 text-sm justify-end">
                <Droplets className="h-4 w-4 text-sky-400" />
                <span>{current.humidity} %</span>
              </div>
              {today && (
                <div className="text-white/60 text-xs">
                  {today.tempMin}° – {today.tempMax}°
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-dagers varsel */}
        {nextDays.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {nextDays.map((day) => {
              const dayName = DAY_NAMES[new Date(day.date).getDay()] ?? day.date;
              return (
                <div key={day.date} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-blue-300 text-xs font-semibold uppercase">{dayName}</p>
                  <p className="text-3xl my-1">{day.emoji}</p>
                  <p className="text-white text-xs font-medium leading-tight">{day.label}</p>
                  <p className="text-white font-bold text-sm mt-1 tabular-nums">
                    {day.tempMin}° / {day.tempMax}°
                  </p>
                  {day.precipitation > 0 && (
                    <p className="text-sky-400 text-xs mt-0.5 flex items-center justify-center gap-0.5">
                      <Droplets className="h-3 w-3" />{day.precipitation} mm
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

// ─── Rullende meldingsticker ─────────────────────────────────
interface TickerItem { label: string; text: string; color: string }

function MeldingsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  // Dupliser for sømløs loop
  const doubled = [...items, ...items];
  // Hastighet: ~120px per sekund, mer innhold = mer tid
  const duration = Math.max(20, items.length * 12);

  return (
    <div className="border-t border-white/10 bg-slate-900/60 overflow-hidden shrink-0" style={{ height: "36px" }}>
      <style>{`
        @keyframes hms-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .hms-ticker-track {
          animation: hms-ticker ${duration}s linear infinite;
          will-change: transform;
        }
        .hms-ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="hms-ticker-track flex items-center h-full whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6">
            <span className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${item.color}`}>
              {item.label}
            </span>
            <span className="text-white/80 text-sm">{item.text}</span>
            <span className="text-white/20 ml-4">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NyheterSection({ title, config }: { title: string | null; config: any }) {
  const messages: string[] = config?.messages ?? [];
  return (
    <Wrapper icon={<BarChart3 className="h-6 w-6" />} title={title ?? "Meldinger fra ledelsen"}>
      {messages.length === 0 ? (
        <p className="text-white/50">Ingen meldinger</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li key={i} className="flex gap-3 text-white bg-white/10 rounded-xl px-4 py-3">
              <span className="text-blue-300 font-bold">•</span> {m}
            </li>
          ))}
        </ul>
      )}
    </Wrapper>
  );
}

function LovkravSection({ title, tavle, isAddon }: { title: string | null; tavle: any; isAddon: boolean }) {
  const bransje = tavle?.bransje ?? null;
  const items = getLovkravItems(bransje, isAddon, tavle);
  return (
    <Wrapper icon={<CheckSquare className="h-6 w-6" />} title={title ?? "Lovkrav-sjekkliste"}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={cn("flex items-center gap-3 rounded-xl px-4 py-3",
            item.ok === true ? "bg-green-900/50 border border-green-700/50"
            : item.ok === false ? "bg-red-900/50 border border-red-700/50"
            : "bg-white/10 border border-white/10")}>
            {item.ok === true && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
            {item.ok === false && <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
            {item.ok === null && <div className="h-5 w-5 rounded-full border-2 border-white/30 shrink-0" />}
            <span className={cn("font-medium flex-1",
              item.ok === true ? "text-green-300" : item.ok === false ? "text-red-300" : "text-white/80")}>
              {item.label}
            </span>
            {item.ref && <span className="text-white/30 text-xs shrink-0">{item.ref}</span>}
            {item.ok === null && !item.ref && <span className="ml-auto text-white/40 text-sm">Manuell</span>}
          </div>
        ))}
      </div>
    </Wrapper>
  );
}

function KpiSection({ title }: { title: string | null }) {
  return (
    <Wrapper icon={<BarChart3 className="h-6 w-6" />} title={title ?? "KPI og H-verdi"}>
      <p className="text-white/50">Live KPI krever HMS Nova add-on</p>
    </Wrapper>
  );
}

function FremdriftsplanSection({ title, config }: { title: string | null; config: any }) {
  return (
    <Wrapper icon={<Map className="h-6 w-6" />} title={title ?? "Fremdriftsplan"}>
      <div className="space-y-3">
        {config?.imageUrl ? (
          <img src={toImageUrl(config.imageUrl)} alt="Fremdriftsplan" className="w-full rounded-xl object-contain max-h-64 border border-white/10" />
        ) : config?.pdfUrl ? null : (
          <p className="text-white/50 text-sm">Last opp fremdriftsplan under innstillinger.</p>
        )}
        {config?.description && (
          <p className="text-white/70 text-sm">{config.description}</p>
        )}
        {config?.startDate && config?.endDate && (
          <p className="text-blue-300 text-xs">
            {new Date(config.startDate).toLocaleDateString("nb-NO")} – {new Date(config.endDate).toLocaleDateString("nb-NO")}
          </p>
        )}
        {config?.pdfUrl && !config?.imageUrl && (
          <a href={config.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-white text-sm">
            <FileText className="h-4 w-4" /> Åpne fremdriftsplan (PDF)
          </a>
        )}
      </div>
    </Wrapper>
  );
}

function RisikomatriseSection({ title, config }: { title: string | null; config: any }) {
  return (
    <Wrapper icon={<AlertTriangle className="h-6 w-6" />} title={title ?? "Risikomatrise"}>
      <div className="space-y-3">
        {config?.imageUrl ? (
          <img src={toImageUrl(config.imageUrl)} alt="Risikomatrise" className="w-full rounded-xl object-contain max-h-64 border border-white/10" />
        ) : config?.pdfUrl ? (
          <a href={config.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-300 hover:text-white text-sm">
            <FileText className="h-4 w-4" /> Åpne risikomatrise (PDF)
          </a>
        ) : (
          <p className="text-white/50 text-sm">Last opp risikomatrise under innstillinger.</p>
        )}
        {config?.description && <p className="text-white/60 text-sm">{config.description}</p>}
      </div>
    </Wrapper>
  );
}

// ─── Gjesteskjema ────────────────────────────────────────────────
// Hjemmel: IK-HMS § 5 (avvik), Matlovforskriften (matforgiftning), intern KPI (klager)

type GuestType = "AVVIK" | "KLAGE" | "MATFORGIFTNING" | "SPORSMAAL" | "TILBAKEMELDING";

const GUEST_TYPES: { value: GuestType; label: string; emoji: string; color: string }[] = [
  { value: "AVVIK",          label: "Avvik / hendelse",    emoji: "⚠️",  color: "bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30" },
  { value: "KLAGE",          label: "Klage",               emoji: "📣",  color: "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30" },
  { value: "MATFORGIFTNING", label: "Matforgiftning",      emoji: "🤒",  color: "bg-red-700/20 border-red-700/40 text-red-200 hover:bg-red-700/30" },
  { value: "SPORSMAAL",      label: "Spørsmål",            emoji: "❓",  color: "bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30" },
  { value: "TILBAKEMELDING", label: "Tilbakemelding",      emoji: "💬",  color: "bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30" },
];

function GjestSkjemaSection({ title, config, publicToken, tavle, locale = "nb" }: {
  title: string | null; config: any; publicToken: string; tavle: any; locale?: "nb" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "form" | "sent">("type");
  const [selectedType, setSelectedType] = useState<GuestType | null>(null);
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [roomOrTable, setRoomOrTable] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEn = locale === "en";
  const welcomeText: string = config?.welcomeText ?? (isEn ? "We want to make your experience as good as possible. Send us a message below." : "Vi ønsker å gjøre din opplevelse best mulig. Send oss en melding nedenfor.");
  const showRoomField: boolean = config?.showRoomField ?? false;
  const roomLabel: string = config?.roomLabel ?? (isEn ? "Room / table" : "Rom / bord");
  const activeTypes: GuestType[] = config?.activeTypes ?? ["AVVIK", "KLAGE", "MATFORGIFTNING", "SPORSMAAL", "TILBAKEMELDING"];
  const synligeTyper = GUEST_TYPES.filter((t) => activeTypes.includes(t.value));

  function reset() {
    setStep("type");
    setSelectedType(null);
    setMessage("");
    setGuestName("");
    setGuestEmail("");
    setRoomOrTable("");
    setError(null);
    setSending(false);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  async function handleSend() {
    if (!selectedType || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/hms-tavle/public/${publicToken}/gjest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim(),
          guestName: guestName.trim() || null,
          guestEmail: guestEmail.trim() || null,
          roomOrTable: roomOrTable.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Innsending feilet");
      }
      setStep("sent");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const selectedTypeCfg = GUEST_TYPES.find((t) => t.value === selectedType);

  return (
    <>
      <Wrapper icon={<MessageSquare className="h-6 w-6" />} title={title ?? "Send melding"}>
        <div className="flex flex-col items-center justify-center gap-4 h-full py-4">
          <p className="text-white/70 text-sm text-center leading-relaxed">{welcomeText}</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            {isEn ? "Report / Leave feedback" : "Meld fra / Send tilbakemelding"}
          </button>
          <p className="text-white/30 text-xs">{isEn ? "No login required" : "Ingen innlogging nødvendig"}</p>
        </div>
      </Wrapper>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modalheader */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                <span className="text-white font-semibold text-base">
                  {step === "sent" ? "Takk!" : step === "form" && selectedTypeCfg ? `${selectedTypeCfg.emoji} ${selectedTypeCfg.label}` : "Hva vil du melde?"}
                </span>
              </div>
              <button onClick={handleClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {/* Steg 1: Velg type */}
              {step === "type" && (
                <div className="space-y-3">
                  <p className="text-white/60 text-sm">{welcomeText}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {synligeTyper.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => { setSelectedType(t.value); setStep("form"); }}
                        className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border font-medium text-sm transition-colors", t.color)}
                      >
                        <span className="text-xl">{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steg 2: Fyll inn skjema */}
              {step === "form" && (
                <div className="space-y-4">
                  <button onClick={() => setStep("type")} className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
                    ← Endre type
                  </button>

                  <div>
                    <label className="text-white/70 text-xs font-medium mb-1 block">Din melding *</label>
                    <textarea
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-blue-400"
                      rows={4}
                      placeholder={selectedType === "MATFORGIFTNING" ? "Beskriv symptomer og hva du spiste..." : "Beskriv hva som skjedde..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={2000}
                    />
                  </div>

                  {showRoomField && (
                    <div>
                      <label className="text-white/70 text-xs font-medium mb-1 block">{roomLabel}</label>
                      <input
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-400"
                        placeholder={roomLabel}
                        value={roomOrTable}
                        onChange={(e) => setRoomOrTable(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-white/70 text-xs font-medium mb-1 block">Ditt navn (valgfritt)</label>
                    <input
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-400"
                      placeholder="Navn"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-xs font-medium mb-1 block">E-post (valgfritt – for svar)</label>
                    <input
                      type="email"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-400"
                      placeholder="din@epost.no"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs">{error}</p>}

                  <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-xl transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sender..." : "Send melding"}
                  </button>
                </div>
              )}

              {/* Steg 3: Kvittering */}
              {step === "sent" && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">Meldingen er mottatt!</p>
                    <p className="text-white/60 text-sm mt-1">Takk for at du tok kontakt. Vi behandler henvendelsen din.</p>
                    {selectedType === "MATFORGIFTNING" && (
                      <p className="text-red-400 text-xs mt-2 font-medium">Ved alvorlige symptomer – ring 113 umiddelbart</p>
                    )}
                  </div>
                  <button onClick={handleClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm transition-colors">
                    Lukk
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RiggplanSection({ title, config }: { title: string | null; config: any }) {
  // Normaliser til images-array: ny multi-format, eller eldre enkeltbilde
  const rawImages: { url: string; caption?: string }[] =
    config?.images && config.images.length > 0
      ? config.images
      : config?.imageUrl
        ? [{ url: config.imageUrl, caption: config.caption }]
        : [];

  const images = rawImages.map((img) => ({ ...img, url: toImageUrl(img.url) })).filter((img) => !!img.url);

  // Karusell-state (kun brukt når 3+ bilder)
  const [activeImg, setActiveImg] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length < 3) return;
    timerRef.current = setInterval(() => {
      setActiveImg((i) => (i + 1) % images.length);
    }, 9000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length]);

  if (images.length === 0 && !config?.pdfUrl) {
    return (
      <Wrapper icon={<Map className="h-6 w-6" />} title={title ?? "Riggplan / situasjonskart"}>
        <p className="text-white/50 text-sm">Last opp riggplan under innstillinger (⚙-knappen).</p>
      </Wrapper>
    );
  }

  // ─── Felles header (alltid synlig) ───────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Map className="h-4 w-4 text-blue-300 shrink-0" />
        <span className="text-white font-semibold text-sm truncate">{title ?? "Riggplan / situasjonskart"}</span>
        {images.length > 1 && (
          <span className="text-blue-300/60 text-xs shrink-0">{images.length} bilder</span>
        )}
        {images.length === 1 && images[0].caption && (
          <span className="text-blue-300/70 text-xs truncate hidden sm:block">— {images[0].caption}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {config?.updatedDate && (
          <span className="text-white/40 text-xs hidden md:block">
            Rev. {new Date(config.updatedDate).toLocaleDateString("nb-NO")}
          </span>
        )}
        {config?.pdfUrl && (
          <a
            href={config.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-300 hover:text-white text-xs border border-blue-500/40 rounded px-2 py-1 bg-blue-900/30 transition-colors"
          >
            <FileText className="h-3 w-3" /> Åpne PDF
          </a>
        )}
      </div>
    </div>
  );

  // ─── Ingen bilder, kun PDF ────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-white/40 text-sm text-center">Klikk «Åpne PDF» for å se riggplan</p>
        </div>
      </div>
    );
  }

  // ─── 1 bilde — full bredde ────────────────────────────────────────
  if (images.length === 1) {
    return (
      <div className="h-full flex flex-col bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        {header}
        <div className="flex-1 relative min-h-0 bg-white/5">
          <img
            src={images[0].url}
            alt={images[0].caption ?? "Riggplan"}
            className="absolute inset-0 w-full h-full object-contain p-2"
          />
        </div>
      </div>
    );
  }

  // ─── 2 bilder — side om side ──────────────────────────────────────
  if (images.length === 2) {
    return (
      <div className="h-full flex flex-col bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        {header}
        <div className="flex-1 grid grid-cols-2 gap-0.5 min-h-0 bg-white/5">
          {images.map((img, i) => (
            <div key={i} className="relative min-h-0 overflow-hidden">
              {img.caption && (
                <span className="absolute top-2 left-2 text-white/70 text-xs bg-black/50 px-2 py-0.5 rounded z-10">
                  {img.caption}
                </span>
              )}
              <img
                src={img.url}
                alt={img.caption ?? `Riggplan ${i + 1}`}
                className="w-full h-full object-contain p-1.5"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── 3+ bilder — karusell med auto-rotasjon ───────────────────────
  return (
    <div className="h-full flex flex-col bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
      {header}
      <div className="flex-1 relative min-h-0 bg-white/5">
        {images.map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.caption ?? `Riggplan ${i + 1}`}
            className={cn(
              "absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-700",
              i === activeImg ? "opacity-100" : "opacity-0"
            )}
          />
        ))}

        {/* Bildetittel for aktivt bilde */}
        {images[activeImg]?.caption && (
          <span className="absolute top-3 left-3 text-white/80 text-xs bg-black/50 px-2 py-0.5 rounded z-10">
            {images[activeImg].caption}
          </span>
        )}

        {/* Prikk-navigasjon */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveImg(i);
                if (timerRef.current) { clearInterval(timerRef.current); }
                timerRef.current = setInterval(() => setActiveImg((idx) => (idx + 1) % images.length), 9000);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === activeImg ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>

        {/* Bilde-teller */}
        <span className="absolute top-3 right-3 text-white/50 text-xs bg-black/40 px-2 py-0.5 rounded z-10">
          {activeImg + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}

// ─── Bygg ticker-meldinger fra alle seksjoner ────────────────────
const HMS_SIKKERHETSMELDINGER = [
  "Bruk påkrevd verneutstyr til enhver tid",
  "Meld fra om farlige forhold umiddelbart",
  "Følg arbeidsinstrukser og prosedyrer",
  "Ryddet arbeidsområde er et trygt arbeidsområde",
  "Ingen jobber alene ved farlig arbeid",
  "Stopp arbeidet ved usikre forhold — sikkerhet går foran fremdrift",
];

function buildTickerItems(allSections: any[]): TickerItem[] {
  const items: TickerItem[] = [];

  // HMS-sikkerhets meldinger (alltid med)
  for (const msg of HMS_SIKKERHETSMELDINGER) {
    items.push({ label: "⚠ HMS", text: msg, color: "text-yellow-400" });
  }

  // Meldinger fra NYHETER_MELDINGER-seksjon
  const nyheterSection = allSections.find((s: any) => s.type === "NYHETER_MELDINGER");
  const msgs: string[] = nyheterSection?.config?.messages ?? [];
  for (const msg of msgs) {
    if (msg?.trim()) items.push({ label: "📢 Melding", text: msg.trim(), color: "text-blue-400" });
  }

  // Beredskapsplan-trinn om konfigurert
  const beredskapsSection = allSections.find((s: any) => s.type === "BEREDSKAPSPLAN");
  const steps: string[] = beredskapsSection?.config?.customSteps ?? [];
  for (const step of steps) {
    if (step?.trim()) items.push({ label: "🆘 Beredskap", text: step.trim(), color: "text-red-400" });
  }

  return items;
}

// ─── Hoved-display ───────────────────────────────────────────────
interface TavleDisplayProps {
  tavle: any;
  checkins: any[];
  plan: HmsTavlePlan;
  publicToken: string;
  forceKiosk: boolean;
  appUrl: string;
}

export function TavlePublicDisplay({ tavle, checkins, plan, publicToken, forceKiosk, appUrl }: TavleDisplayProps) {
  const router = useRouter();
  const [kioskActive, setKioskActive] = useState(forceKiosk);
  const [activeIdx, setActiveIdx] = useState(0);
  const [locale, setLocale] = useState<"nb" | "en">("nb");

  // ─── SSE: sanntidsoppdatering ────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(`/api/hms-tavle/public/${publicToken}/events`);

    es.addEventListener("update", () => {
      router.refresh();
    });

    es.onerror = () => {
      // Nettleser prøver automatisk å koble til igjen — ingen ekstra håndtering
    };

    return () => {
      es.close();
    };
  }, [publicToken, router]);

  // Seksjonpartisjonering basert på displayMode (bakoverkompatibel)
  const allSections = tavle.sections ?? [];

  function resolveMode(s: any): TavleDisplayMode {
    if (s.displayMode) return s.displayMode as TavleDisplayMode;
    // Bakoverkompatibilitet for eksisterende tavler uten displayMode
    if (["KONTAKTINFO", "MANNSKAPSLISTE", "SHA_PLAN", "NYHETER_MELDINGER"].includes(s.type)) return "SIDEBAR";
    if (["SNARVEIER", "RIGGPLAN"].includes(s.type)) return "FAST";
    return "KARUSELL";
  }

  const visibleSections = allSections.filter((s: any) => s.isVisible !== false);
  const fokusSection = visibleSections.find((s: any) => resolveMode(s) === "FOKUS");
  const snarveierSection = visibleSections.find((s: any) => s.type === "SNARVEIER" && resolveMode(s) === "FAST");
  const riggplanSection = visibleSections.find((s: any) => s.type === "RIGGPLAN" && resolveMode(s) === "FAST");
  const otherFastSections = visibleSections.filter((s: any) =>
    resolveMode(s) === "FAST" && s.type !== "SNARVEIER" && s.type !== "RIGGPLAN"
  );
  const rotatingSections = visibleSections.filter((s: any) => resolveMode(s) === "KARUSELL");

  const isAddon = plan === "ADDON";

  // Finn værlokasjon fra VAERMELDING-seksjon
  const vaerSection = allSections.find((s: any) => s.type === "VAERMELDING");
  const weatherLocation = vaerSection?.config?.location ?? tavle.project?.location ?? null;
  const { data: weatherData } = useWeather(weatherLocation);

  // Auto-roter hvert 15. sekund i kiosk-modus
  useEffect(() => {
    if (!kioskActive || rotatingSections.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % rotatingSections.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [kioskActive, rotatingSections.length]);

  const canKiosk = plan === "AVANSERT" || plan === "ADDON";

  /* ── KIOSK-MODUS ── */
  if (kioskActive) {
    return (
      <div className="h-screen overflow-hidden select-none flex flex-col" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e1b4b 100%)" }}>

        {/* Header-bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10">
          {/* Logo + navn */}
          <div className="flex items-center gap-4 shrink-0">
            <TavleLogo logoUrl={tavle.logoUrl} name={tavle.name} />
            <div className="border-l border-white/15 pl-4">
              <h1 className="text-white font-black text-xl leading-tight tracking-tight">{tavle.name}</h1>
              {tavle.project?.name ? (
                <p className="text-blue-300/80 text-xs font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                  {tavle.project.name}
                </p>
              ) : (
                <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Digital HMS Tavle</p>
              )}
            </div>
          </div>

          {/* Mannskap + QR — midt i headeren */}
          {plan !== "ENKEL" && (
            <div className="flex-1 flex items-center justify-center gap-4">
              <HeaderMannskapsBlock
                checkins={checkins}
                publicToken={publicToken}
                appUrl={appUrl}
              />
            </div>
          )}

          {/* Høyre: vær, klokke, knapper */}
          <div className="flex items-center gap-4 shrink-0">
            {tavle.subcontractorPortal && (
              <Link href={`/tavle/${publicToken}/rapporter`}
                className="text-blue-300 border border-blue-500/50 rounded-lg px-3 py-1.5 text-sm hover:bg-white/10">
                Meld avvik
              </Link>
            )}
            <WeatherMini data={weatherData} location={weatherLocation} />
            <LiveClock large />
            <button onClick={() => setKioskActive(false)}
              className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Hoved-layout: fast venstre sidebar + grid hoveddel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Fast venstre kolonne — sidebar */}
          <div className="w-56 shrink-0 p-3 border-r border-white/10 overflow-y-auto flex flex-col gap-0">
            <FixedSidebar
              tavle={tavle} checkins={checkins} isAddon={isAddon}
              publicToken={publicToken} plan={plan} appUrl={appUrl}
            />
          </div>

          {/* Hoveddel: 4-sone layout — Snarveier (topp), Fokus, Fast+Roterende (bunn) */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden pt-2 pb-3 gap-3">

            {/* SONE 1: Snarveier — kompakt ikonbar øverst, full bredde */}
            {snarveierSection && (
              <div className="shrink-0">
                <SnarveierKompaktBar
                  config={snarveierSection.config}
                  isAddon={isAddon}
                  publicToken={publicToken}
                  appUrl={appUrl}
                />
              </div>
            )}

            {/* SONE FOKUS: fremhevet seksjon, full bredde */}
            {fokusSection && (
              <div className="shrink-0 px-3" style={{ maxHeight: "38%" }}>
                <SectionCard
                  type={fokusSection.type}
                  title={fokusSection.title}
                  config={fokusSection.config}
                  tavle={tavle} checkins={checkins}
                  plan={plan} appUrl={appUrl} publicToken={publicToken}
                  weatherData={weatherData} locale={locale}
                />
              </div>
            )}

            {/* Andre FAST seksjoner */}
            {otherFastSections.length > 0 && (
              <div className={cn("shrink-0 px-3 grid gap-3", otherFastSections.length > 1 ? "grid-cols-2" : "grid-cols-1")} style={{ maxHeight: "25%" }}>
                {otherFastSections.map((s: any) => (
                  <SectionCard key={s.id} type={s.type} title={s.title} config={s.config}
                    tavle={tavle} checkins={checkins} plan={plan} appUrl={appUrl}
                    publicToken={publicToken} weatherData={weatherData} locale={locale}
                  />
                ))}
              </div>
            )}

            {/* SONE 2+3: Riggplan (venstre) + Roterende (høyre) — deler resten */}
            <div className="flex-1 flex gap-3 px-3 min-h-0 overflow-hidden">

              {/* Riggplan — alltid synlig, venstre del */}
              {riggplanSection && (
                <div className={cn("h-full overflow-hidden", rotatingSections.length > 0 ? "w-[55%] shrink-0" : "flex-1")}>
                  <SectionCard
                    type="RIGGPLAN"
                    title={riggplanSection.title}
                    config={riggplanSection.config}
                    tavle={tavle} checkins={checkins}
                    plan={plan} appUrl={appUrl} publicToken={publicToken}
                    weatherData={weatherData} locale={locale}
                  />
                </div>
              )}

              {/* Roterende seksjon — høyre del */}
              {rotatingSections.length > 0 && (
                <div className={cn("flex flex-col min-h-0 overflow-hidden", riggplanSection ? "flex-1" : "flex-1")}>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {rotatingSections[activeIdx] ? (
                      <SectionCard
                        type={rotatingSections[activeIdx].type}
                        title={rotatingSections[activeIdx].title}
                        config={rotatingSections[activeIdx].config}
                        tavle={tavle} checkins={checkins}
                        plan={plan} appUrl={appUrl} publicToken={publicToken}
                        weatherData={weatherData} locale={locale}
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {/* Fallback om ingen seksjoner i det hele tatt */}
              {!riggplanSection && rotatingSections.length === 0 && !fokusSection && otherFastSections.length === 0 && (
                <div className="flex-1 h-full flex items-center justify-center text-white/20 text-base">
                  Legg til seksjoner i admin-panelet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rullende meldingsticker */}
        <MeldingsTicker items={buildTickerItems(allSections)} />
      </div>
    );
  }

  /* ── NORMAL MODUS ── */
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e1b4b 100%)" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 backdrop-blur bg-slate-900/80">
        {/* Logo + navn */}
        <div className="flex items-center gap-2 shrink-0">
          <TavleLogo logoUrl={tavle.logoUrl} name={tavle.name} />
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">{tavle.name}</h1>
            {tavle.project?.name && <p className="text-blue-300 text-xs">{tavle.project.name}</p>}
          </div>
        </div>

        {/* Mannskap + QR — midt i headeren */}
        {plan !== "ENKEL" && (
          <div className="flex-1 flex items-center justify-center">
            <HeaderMannskapsBlock
              checkins={checkins}
              publicToken={publicToken}
              appUrl={appUrl}
            />
          </div>
        )}

        {/* Høyre: vær, klokke, knapper */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Språkvelger */}
          <div className="flex rounded-lg border border-white/20 overflow-hidden text-xs">
            <button onClick={() => setLocale("nb")} className={`px-2 py-1 transition-colors ${locale === "nb" ? "bg-white/20 text-white font-semibold" : "text-white/50 hover:bg-white/10"}`}>NO</button>
            <button onClick={() => setLocale("en")} className={`px-2 py-1 transition-colors ${locale === "en" ? "bg-white/20 text-white font-semibold" : "text-white/50 hover:bg-white/10"}`}>EN</button>
          </div>
          {weatherData && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 border border-white/10">
              <span className="text-xl leading-none">{weatherData.current.emoji}</span>
              <span className="text-white font-bold text-sm tabular-nums">{weatherData.current.temp}°</span>
              {weatherLocation && <span className="text-blue-300 text-xs hidden sm:block">{weatherLocation}</span>}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Clock className="h-3.5 w-3.5" />
            <LiveClock />
          </div>
          {tavle.subcontractorPortal && (
            <Link href={`/tavle/${publicToken}/rapporter`} className="text-blue-300 border border-blue-500/50 rounded px-2 py-1 text-xs hover:bg-white/10">Meld avvik</Link>
          )}
          {canKiosk && (
            <button onClick={() => setKioskActive(true)} className="p-1 rounded text-white/60 hover:bg-white/10 hover:text-white" title="Kiosk-modus">
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* To-kolonner: fast venstre + grid høyre */}
      <div className="flex gap-4 p-4 max-w-7xl mx-auto">
        <div className="w-64 shrink-0">
          <FixedSidebar
            tavle={tavle} checkins={checkins} isAddon={isAddon}
            publicToken={publicToken} plan={plan} appUrl={appUrl}
          />
        </div>
        <div className="flex-1 space-y-4">
          {/* Fokus-seksjon øverst */}
          {fokusSection && (
            <SectionCard
              type={fokusSection.type} title={fokusSection.title} config={fokusSection.config}
              tavle={tavle} checkins={checkins} plan={plan} appUrl={appUrl}
              publicToken={publicToken} weatherData={weatherData} locale={locale}
            />
          )}
          {/* Fast-seksjoner */}
          {otherFastSections.length > 0 && (
            <div className={cn("grid gap-4", otherFastSections.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
              {otherFastSections.map((s: any) => (
                <SectionCard key={s.id} type={s.type} title={s.title} config={s.config}
                  tavle={tavle} checkins={checkins} plan={plan} appUrl={appUrl}
                  publicToken={publicToken} weatherData={weatherData} locale={locale}
                />
              ))}
            </div>
          )}
          {/* Karusell-seksjoner (alle synlige) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
          {rotatingSections.map((section: any) => (
            <div
              key={section.id}
              className={section.type === "RIGGPLAN" ? "sm:col-span-2" : ""}
            >
              <SectionCard
                type={section.type} title={section.title} config={section.config}
                tavle={tavle} checkins={checkins} plan={plan} appUrl={appUrl}
                publicToken={publicToken} weatherData={weatherData} locale={locale}
              />
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-3 text-center text-xs text-white/30">
        Digital HMS Tavle · HMS Nova · {new Date().toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}
