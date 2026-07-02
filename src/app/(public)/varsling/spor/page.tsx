"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

type WhistleblowStatus =
  | "RECEIVED"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "ACTION_TAKEN"
  | "RESOLVED"
  | "CLOSED"
  | "DISMISSED";

type MessageSender = "REPORTER" | "HANDLER" | "SYSTEM";

interface WhistleblowCase {
  id: string;
  caseNumber: string;
  category: string;
  title: string;
  description: string;
  occurredAt?: string;
  location?: string;
  status: WhistleblowStatus;
  severity: string;
  receivedAt: string;
  acknowledgedAt?: string;
  investigatedAt?: string;
  closedAt?: string;
  messages: Message[];
}

interface Message {
  id: string;
  sender: MessageSender;
  message: string;
  createdAt: string;
  isInternal: boolean;
}

function getStatusLabel(status: WhistleblowStatus): string {
  const labels: Record<WhistleblowStatus, string> = {
    RECEIVED: "Mottatt",
    ACKNOWLEDGED: "Bekreftet mottatt",
    UNDER_INVESTIGATION: "Under behandling",
    ACTION_TAKEN: "Tiltak iverksatt",
    RESOLVED: "Avsluttet",
    CLOSED: "Avsluttet",
    DISMISSED: "Henlagt",
  };
  return labels[status] ?? status;
}

function getStatusBadge(status: WhistleblowStatus) {
  switch (status) {
    case "RECEIVED":
      return <Badge variant="secondary">Mottatt</Badge>;
    case "ACKNOWLEDGED":
      return <Badge className="bg-blue-500 hover:bg-blue-500">Bekreftet mottatt</Badge>;
    case "UNDER_INVESTIGATION":
      return <Badge className="bg-purple-500 hover:bg-purple-500">Under behandling</Badge>;
    case "ACTION_TAKEN":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">Tiltak iverksatt</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-600 hover:bg-green-600">Avsluttet</Badge>;
    case "CLOSED":
      return <Badge variant="outline">Avsluttet</Badge>;
    case "DISMISSED":
      return <Badge variant="destructive">Henlagt</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const STATUS_STEPS: WhistleblowStatus[] = [
  "RECEIVED",
  "ACKNOWLEDGED",
  "UNDER_INVESTIGATION",
  "ACTION_TAKEN",
  "RESOLVED",
];

function StatusStepper({ status }: { status: WhistleblowStatus }) {
  const activeIndex = STATUS_STEPS.indexOf(status);
  const isDismissed = status === "DISMISSED" || status === "CLOSED";

  return (
    <div className="my-4">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const isActive = i === activeIndex && !isDismissed;
          const isPast = i < activeIndex && !isDismissed;
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isPast
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-500 text-white ring-2 ring-blue-300"
                      : isDismissed
                      ? "bg-red-200 text-red-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPast ? "✓" : i + 1}
                </div>
                <span className="hidden text-center text-[10px] leading-tight text-muted-foreground sm:block">
                  {getStatusLabel(step)}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    isPast ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {isDismissed && (
        <p className="mt-2 text-center text-sm font-medium text-red-600">Saken er henlagt/avsluttet</p>
      )}
    </div>
  );
}

export default function TrackWhistleblowingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<WhistleblowCase | null>(null);
  const [caseNumber, setCaseNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCaseData(null);

    try {
      if (!caseNumber || !accessCode) {
        throw new Error("Saksnummer og tilgangskode er påkrevd");
      }

      const response = await fetch("/api/whistleblowing/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber, accessCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke finne saken. Sjekk at saksnummer og tilgangskode er korrekte.");
      }

      setCaseData(data.data);
    } catch (error: any) {
      toast({
        title: "Saken ikke funnet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !caseData) return;

    setSendingReply(true);
    try {
      const response = await fetch(`/api/whistleblowing/${caseData.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseNumber,
          accessCode,
          message: replyText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke sende melding");
      }

      toast({
        title: "Melding sendt",
        description: "Din melding er sendt til saksbehandler.",
      });

      setReplyText("");

      // Oppdater meldingslisten
      const refreshResponse = await fetch("/api/whistleblowing/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber, accessCode }),
      });
      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        setCaseData(refreshData.data);
      }
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <Link href="/">
            <h1 className="text-3xl font-bold">HMS Nova</h1>
          </Link>
          <p className="mt-2 text-muted-foreground">Spor din varsling</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Søk etter saken din</CardTitle>
            <CardDescription>
              Bruk saksnummeret og tilgangskoden du mottok da du sendte inn varslingen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="caseNumber">Saksnummer</Label>
                  <Input
                    id="caseNumber"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value.trim().toUpperCase())}
                    placeholder="f.eks. VAR-2026-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Tilgangskode</Label>
                  <Input
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.trim())}
                    placeholder="Din personlige tilgangskode"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Søker..." : "Hent saken"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {caseData && (
          <div className="space-y-6">
            {/* Status oversikt */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{caseData.title}</CardTitle>
                    <CardDescription>Saksnummer: {caseData.caseNumber}</CardDescription>
                  </div>
                  {getStatusBadge(caseData.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fremgangssteg */}
                <StatusStepper status={caseData.status} />

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Beskrivelse</p>
                  <p className="mt-1 whitespace-pre-wrap">{caseData.description}</p>
                </div>

                {caseData.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sted</p>
                    <p className="mt-1">{caseData.location}</p>
                  </div>
                )}

                <Separator />

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mottatt</p>
                    <p className="mt-1 text-sm">
                      {format(new Date(caseData.receivedAt), "dd. MMM yyyy HH:mm", { locale: nb })}
                    </p>
                  </div>

                  {caseData.acknowledgedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bekreftet mottatt</p>
                      <p className="mt-1 text-sm">
                        {format(new Date(caseData.acknowledgedAt), "dd. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </p>
                    </div>
                  )}

                  {caseData.investigatedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Behandling startet
                      </p>
                      <p className="mt-1 text-sm">
                        {format(new Date(caseData.investigatedAt), "dd. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </p>
                    </div>
                  )}

                  {caseData.closedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avsluttet</p>
                      <p className="mt-1 text-sm">
                        {format(new Date(caseData.closedAt), "dd. MMM yyyy HH:mm", { locale: nb })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Meldinger */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Kommunikasjon med saksbehandler
                  </div>
                </CardTitle>
                <CardDescription>
                  Meldinger fra saksbehandler og dine svar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {caseData.messages.filter((m) => !m.isInternal).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ingen meldinger ennå. Du vil se meldinger her når saksbehandler kontakter deg.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {caseData.messages
                      .filter((msg) => !msg.isInternal)
                      .map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-lg p-4 ${
                            message.sender === "REPORTER"
                              ? "ml-8 bg-blue-50 dark:bg-blue-950"
                              : "mr-8 bg-gray-50 dark:bg-gray-900"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="outline">
                              {message.sender === "REPORTER"
                                ? "Deg"
                                : message.sender === "HANDLER"
                                ? "Saksbehandler"
                                : "System"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.createdAt), "dd. MMM yyyy HH:mm", {
                                locale: nb,
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Svar-boks */}
                {caseData.status !== "RESOLVED" &&
                  caseData.status !== "CLOSED" &&
                  caseData.status !== "DISMISSED" && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label htmlFor="reply">Send melding til saksbehandler</Label>
                        <Textarea
                          id="reply"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Skriv en melding til saksbehandler..."
                          rows={3}
                        />
                        <Button
                          onClick={sendReply}
                          disabled={sendingReply || !replyText.trim()}
                          size="sm"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {sendingReply ? "Sender..." : "Send melding"}
                        </Button>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Konfidensialitet</AlertTitle>
              <AlertDescription>
                All informasjon behandles konfidensielt i henhold til Varslerloven (AML kap. 2 A)
                og GDPR. Kun autoriserte personer har tilgang til saken din.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
