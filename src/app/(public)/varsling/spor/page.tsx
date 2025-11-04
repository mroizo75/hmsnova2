"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, MessageSquare, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

function getStatusBadge(status: WhistleblowStatus) {
  switch (status) {
    case "RECEIVED":
      return <Badge variant="secondary">Mottatt</Badge>;
    case "ACKNOWLEDGED":
      return <Badge className="bg-blue-500 hover:bg-blue-500">Bekreftet</Badge>;
    case "UNDER_INVESTIGATION":
      return <Badge className="bg-purple-500 hover:bg-purple-500">Under etterforskning</Badge>;
    case "ACTION_TAKEN":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">Tiltak iverksatt</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-600 hover:bg-green-600">Løst</Badge>;
    case "CLOSED":
      return <Badge variant="outline">Avsluttet</Badge>;
    case "DISMISSED":
      return <Badge variant="destructive">Avvist</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function TrackWhistleblowingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<WhistleblowCase | null>(null);
  const [accessCode, setAccessCode] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!accessCode) {
        throw new Error("Tilgangskode er påkrevd");
      }

      const response = await fetch(`/api/whistleblowing/track?accessCode=${accessCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke finne saken");
      }

      setCaseData(data.data);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
      setCaseData(null);
    } finally {
      setLoading(false);
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
              Bruk tilgangskoden du mottok når du sendte inn varslingen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="accessCode" className="sr-only">
                  Tilgangskode
                </Label>
                <Input
                  id="accessCode"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Skriv inn tilgangskode"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Søker..." : "Søk"}
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
                      <p className="text-sm font-medium text-muted-foreground">Bekreftet</p>
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
                        Etterforskning startet
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
                    Meldinger
                  </div>
                </CardTitle>
                <CardDescription>
                  Kommunikasjon med saksbehandler (kun meldinger til deg vises her)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {caseData.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ingen meldinger ennå. Du vil få beskjed her når saksbehandler kontakter deg.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {caseData.messages
                      .filter((msg) => !msg.isInternal)
                      .map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-lg p-4 ${
                            message.sender === "REPORTER"
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-gray-50 dark:bg-gray-900"
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
              </CardContent>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Konfidensialitet</AlertTitle>
              <AlertDescription>
                All informasjon behandles konfidensielt og i henhold til gjeldende lover og
                forskrifter. Kun autoriserte personer har tilgang til saken.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

