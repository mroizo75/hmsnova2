"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ImagePlus,
  Lock,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  MAX_GUEST_ATTACHMENTS,
  MAX_GUEST_ATTACHMENT_MB,
  type GjesteserviceConfig,
  type GuestType,
} from "../lib/gjesteservice-config";
import { GUEST_TYPE_EMOJI, getGuestDictionary, type GuestLocale } from "../lib/guest-i18n";

interface Props {
  publicToken: string;
  tenantName: string;
  tavleName: string;
  logoUrl: string | null;
  brandColor: string | null;
  config: GjesteserviceConfig;
  locale: GuestLocale;
  prefilledRoom: string;
}

export function GjestMeldingClient({
  publicToken,
  tenantName,
  tavleName,
  logoUrl,
  brandColor,
  config,
  locale: initialLocale,
  prefilledRoom,
}: Props) {
  const [locale, setLocale] = useState<GuestLocale>(initialLocale);
  const [step, setStep] = useState<"type" | "form" | "sent">("type");
  const [selectedType, setSelectedType] = useState<GuestType | null>(null);
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [roomOrTable, setRoomOrTable] = useState(prefilledRoom);
  const [consentContact, setConsentContact] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const t = useMemo(() => getGuestDictionary(locale), [locale]);
  const isEn = locale === "en";

  const accent = brandColor ?? "#0f172a";
  const welcomeText =
    (isEn ? config.welcomeTextEn ?? config.welcomeText : config.welcomeText) ?? t.pageIntro;
  const roomLabel = (isEn ? config.roomLabelEn ?? config.roomLabel : config.roomLabel) ?? t.roomLabel;
  const servicePromise = isEn
    ? config.servicePromiseEn ?? config.servicePromise
    : config.servicePromise;

  const visibleTypes = config.activeTypes;

  function handleFilesSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;

    const incoming = Array.from(selected);
    const withinSize = incoming.filter((file) => {
      if (file.size > MAX_GUEST_ATTACHMENT_MB * 1024 * 1024) {
        toast.error(
          isEn
            ? `${file.name} is larger than ${MAX_GUEST_ATTACHMENT_MB} MB`
            : `${file.name} er større enn ${MAX_GUEST_ATTACHMENT_MB} MB`
        );
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...withinSize].slice(0, MAX_GUEST_ATTACHMENTS));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedType || message.trim().length < 5) {
      toast.error(isEn ? "Please describe what happened" : "Beskriv gjerne hva som skjedde");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("type", selectedType);
      formData.append("message", message.trim());
      formData.append("locale", locale);
      formData.append("consentContact", consentContact ? "true" : "false");
      if (guestName.trim()) formData.append("guestName", guestName.trim());
      if (guestEmail.trim()) formData.append("guestEmail", guestEmail.trim());
      if (guestPhone.trim()) formData.append("guestPhone", guestPhone.trim());
      if (roomOrTable.trim()) formData.append("roomOrTable", roomOrTable.trim());
      files.forEach((file) => formData.append("images", file));

      const res = await fetch(`/api/hms-tavle/public/${publicToken}/gjest`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message ?? (isEn ? "Submission failed" : "Innsending feilet"));
      }

      setStatusUrl(json?.data?.statusUrl ?? null);
      setStep("sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ukjent feil");
    } finally {
      setSending(false);
    }
  }

  async function copyStatusUrl() {
    if (!statusUrl) return;
    try {
      await navigator.clipboard.writeText(statusUrl);
      setCopied(true);
      toast.success(t.copied);
    } catch {
      toast.error(isEn ? "Could not copy the link" : "Kunne ikke kopiere lenken");
    }
  }

  function startOver() {
    setStep("type");
    setSelectedType(null);
    setMessage("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setRoomOrTable(prefilledRoom);
    setConsentContact(false);
    setFiles([]);
    setStatusUrl(null);
    setCopied(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        {logoUrl && <img src={logoUrl} alt={tenantName} className="h-8 max-w-[120px] object-contain shrink-0" />}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{tenantName}</p>
          <p className="text-xs text-muted-foreground truncate">{tavleName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {(["nb", "en"] as GuestLocale[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                locale === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {value === "nb" ? "NO" : "EN"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-5 pb-16">
        {step !== "sent" && (
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{welcomeText}</p>
            <div className="inline-flex items-start gap-2 text-left bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-3 py-2 text-xs">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t.confidentialNotice}</span>
            </div>
          </div>
        )}

        {step === "type" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t.chooseType}</p>
            {visibleTypes.map((type) => {
              const typeText = t.types[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setStep("form");
                  }}
                  className="w-full flex items-start gap-3 bg-white border rounded-xl px-4 py-3 text-left hover:border-foreground/30 hover:shadow-sm transition-all"
                >
                  <span className="text-xl leading-none mt-0.5">{GUEST_TYPE_EMOJI[type]}</span>
                  <span className="min-w-0">
                    <span className="block font-medium text-sm">{typeText.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {typeText.description}
                    </span>
                  </span>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground text-center pt-2">{t.urgentNotice}</p>
          </div>
        )}

        {step === "form" && selectedType && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("type")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.changeType}
            </button>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <span className="text-xl">{GUEST_TYPE_EMOJI[selectedType]}</span>
                  <span className="font-medium text-sm">{t.types[selectedType].label}</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="guest-message">{t.messageLabel} *</Label>
                  <Textarea
                    id="guest-message"
                    rows={5}
                    maxLength={2000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={t.types[selectedType].placeholder}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">{t.messageHint}</p>
                </div>

                {config.showRoomField && (
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-room">{roomLabel}</Label>
                    <Input
                      id="guest-room"
                      value={roomOrTable}
                      onChange={(event) => setRoomOrTable(event.target.value)}
                      placeholder={roomLabel}
                      maxLength={50}
                    />
                  </div>
                )}

                {config.allowAttachments && (
                  <div className="space-y-2">
                    <Label>
                      {t.attachmentsLabel}{" "}
                      <span className="text-muted-foreground font-normal">({t.optional})</span>
                    </Label>
                    {files.length > 0 && (
                      <ul className="space-y-1.5">
                        {files.map((file, index) => (
                          <li
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2"
                          >
                            <span className="truncate flex-1">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={t.removeAttachment}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {files.length < MAX_GUEST_ATTACHMENTS && (
                      <label className="flex items-center justify-center gap-2 border border-dashed rounded-xl px-3 py-3 text-sm text-muted-foreground cursor-pointer hover:border-foreground/30 hover:text-foreground transition-colors">
                        <ImagePlus className="h-4 w-4" />
                        {t.addAttachment}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handleFilesSelected(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">{t.attachmentsHint}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name">
                      {t.nameLabel}{" "}
                      <span className="text-muted-foreground font-normal">({t.optional})</span>
                    </Label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      autoComplete="name"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-room-number">
                      {t.phoneLabel}{" "}
                      <span className="text-muted-foreground font-normal">({t.optional})</span>
                    </Label>
                    <Input
                      id="guest-room-number"
                      type="tel"
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      autoComplete="tel"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="guest-email">
                    {t.emailLabel}{" "}
                    <span className="text-muted-foreground font-normal">({t.optional})</span>
                  </Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    autoComplete="email"
                    maxLength={200}
                  />
                </div>

                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox
                    checked={consentContact}
                    onCheckedChange={(checked) => setConsentContact(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">{t.consentLabel}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t.consentHint}
                    </span>
                  </span>
                </label>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full text-base py-6"
              style={{ backgroundColor: accent }}
              disabled={sending || message.trim().length < 5}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? t.submitting : t.submit}
            </Button>

            <p className="text-xs text-muted-foreground text-center">{t.privacyFooter}</p>
          </form>
        )}

        {step === "sent" && (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold">{t.receiptTitle}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.receiptIntro}</p>
            </div>

            {servicePromise && (
              <div className="bg-white border rounded-xl p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.serviceGoal}
                </p>
                <p className="text-sm mt-1">{servicePromise}</p>
              </div>
            )}

            {statusUrl && (
              <div className="bg-white border rounded-xl p-4 space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <p className="font-semibold text-sm">{t.trackingTitle}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t.trackingHint}</p>
                <p className="text-xs font-mono break-all bg-muted rounded-lg px-3 py-2">
                  {statusUrl}
                </p>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" onClick={copyStatusUrl}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? t.copied : t.copyLink}
                  </Button>
                  <Button asChild style={{ backgroundColor: accent }}>
                    <Link href={statusUrl}>{t.openStatus}</Link>
                  </Button>
                </div>
              </div>
            )}

            <Button type="button" variant="ghost" onClick={startOver}>
              {t.newMessage}
            </Button>

            <p className="text-xs text-muted-foreground">{t.privacyFooter}</p>
          </div>
        )}
      </main>
    </div>
  );
}
