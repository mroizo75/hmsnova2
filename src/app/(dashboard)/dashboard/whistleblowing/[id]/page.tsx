"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WhistleblowStatus =
  | "RECEIVED"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "ACTION_TAKEN"
  | "RESOLVED"
  | "CLOSED"
  | "DISMISSED";

type WhistleblowSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type WhistleblowCategory = "HARASSMENT" | "DISCRIMINATION" | "WORK_ENVIRONMENT" | "SAFETY" | "CORRUPTION" | "ETHICS" | "LEGAL" | "OTHER";
type MessageSender = "REPORTER" | "HANDLER" | "SYSTEM";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface WhistleblowCase {
  id: string;
  caseNumber: string;
  category: WhistleblowCategory;
  title: string;
  description: string;
  occurredAt?: string;
  location?: string;
  involvedPersons?: string;
  witnesses?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  status: WhistleblowStatus;
  severity: WhistleblowSeverity;
  handledBy?: string;
  assignedTo?: string;
  investigationNotes?: string;
  outcome?: string;
  closedReason?: string;
  receivedAt: string;
  acknowledgedAt?: string;
  investigatedAt?: string;
  closedAt?: string;
  messages: Message[];
}

interface Message {
  id: string;
  sender: MessageSender;
  senderUserId?: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
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
  }
}

function getSeverityBadge(severity: WhistleblowSeverity) {
  switch (severity) {
    case "LOW":
      return <Badge variant="outline">Lav</Badge>;
    case "MEDIUM":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">Medium</Badge>;
    case "HIGH":
      return <Badge className="bg-orange-500 hover:bg-orange-500">Høy</Badge>;
    case "CRITICAL":
      return <Badge variant="destructive">Kritisk</Badge>;
  }
}

function getCategoryLabel(category: WhistleblowCategory) {
  const labels: Record<WhistleblowCategory, string> = {
    HARASSMENT: "Trakassering",
    DISCRIMINATION: "Diskriminering",
    WORK_ENVIRONMENT: "Arbeidsmiljø",
    SAFETY: "HMS/Sikkerhet",
    CORRUPTION: "Korrupsjon",
    ETHICS: "Etikk",
    LEGAL: "Lovbrudd",
    OTHER: "Annet",
  };
  return labels[category];
}

export default function WhistleblowingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [caseData, setCaseData] = useState<WhistleblowCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingSeverity, setUpdatingSeverity] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [params.id]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/users`);
        const data = await response.json();

        if (response.ok && data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session?.user?.tenantId]);

  const fetchCase = async () => {
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke hente sak");
      }

      setCaseData(data.data);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
      router.push("/dashboard/whistleblowing");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          isInternal: isInternalMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke sende melding");
      }

      toast({
        title: "Melding sendt",
        description: isInternalMessage
          ? "Intern notat lagt til"
          : "Melding sendt til varsler",
      });

      setMessageText("");
      setIsInternalMessage(false);
      fetchCase();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const updateStatus = async (newStatus: WhistleblowStatus) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke oppdatere status");
      }

      toast({
        title: "Status oppdatert",
        description: "Sakens status er oppdatert",
      });

      fetchCase();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateSeverity = async (newSeverity: WhistleblowSeverity) => {
    setUpdatingSeverity(true);
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity: newSeverity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke oppdatere alvorlighet");
      }

      toast({
        title: "Alvorlighet oppdatert",
        description: "Sakens alvorlighet er oppdatert",
      });

      fetchCase();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingSeverity(false);
    }
  };

  const updateAssignedTo = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: userId || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke tildele sak");
      }

      toast({
        title: "Sak tildelt",
        description: "Saken er tildelt valgt person",
      });

      fetchCase();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Laster...</p>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/whistleblowing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{caseData.title}</h1>
            <p className="text-muted-foreground">Saksnummer: {caseData.caseNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getSeverityBadge(caseData.severity)}
          {getStatusBadge(caseData.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hovedinnhold */}
        <div className="space-y-6 lg:col-span-2">
          {/* Saksdetaljer */}
          <Card>
            <CardHeader>
              <CardTitle>Saksdetaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold">Beskrivelse</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {caseData.description}
                </p>
              </div>

              {(caseData.occurredAt || caseData.location) && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    {caseData.occurredAt && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Når</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(caseData.occurredAt), "dd. MMMM yyyy HH:mm", {
                              locale: nb,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {caseData.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Hvor</p>
                          <p className="text-sm text-muted-foreground">{caseData.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {caseData.involvedPersons && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 font-semibold">Involverte personer</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.involvedPersons}
                    </p>
                  </div>
                </>
              )}

              {caseData.witnesses && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 font-semibold">Vitner</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.witnesses}
                    </p>
                  </div>
                </>
              )}

              {caseData.investigationNotes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 font-semibold">Etterforskningsnotater</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.investigationNotes}
                    </p>
                  </div>
                </>
              )}

              {caseData.outcome && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 font-semibold">Resultat</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.outcome}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Meldinger */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Kommunikasjon
                </div>
              </CardTitle>
              <CardDescription>Meldinger med varsler og interne notater</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Ingen meldinger ennå</p>
              ) : (
                <div className="space-y-4">
                  {caseData.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-4 ${
                        message.isInternal
                          ? "border-2 border-dashed border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950"
                          : message.sender === "REPORTER"
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "bg-gray-50 dark:bg-gray-900"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {message.sender === "REPORTER"
                              ? "Varsler"
                              : message.sender === "HANDLER"
                              ? "Saksbehandler"
                              : "System"}
                          </Badge>
                          {message.isInternal && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-500">
                              Intern
                            </Badge>
                          )}
                        </div>
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

              <Separator />

              {/* Nytt svar */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Ny melding</Label>
                  <Textarea
                    id="message"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Skriv en melding til varsler eller et internt notat..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isInternal"
                    checked={isInternalMessage}
                    onChange={(e) => setIsInternalMessage(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isInternal" className="font-normal">
                    Intern notat (ikke synlig for varsler)
                  </Label>
                </div>

                <Button onClick={sendMessage} disabled={sendingMessage || !messageText.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  {sendingMessage ? "Sender..." : "Send melding"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Varsler info */}
          <Card>
            <CardHeader>
              <CardTitle>Varsler</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.isAnonymous ? (
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Anonym varsling</span>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {caseData.reporterName && (
                    <div>
                      <p className="font-medium">Navn</p>
                      <p className="text-muted-foreground">{caseData.reporterName}</p>
                    </div>
                  )}
                  {caseData.reporterEmail && (
                    <div>
                      <p className="font-medium">E-post</p>
                      <p className="text-muted-foreground">{caseData.reporterEmail}</p>
                    </div>
                  )}
                  {caseData.reporterPhone && (
                    <div>
                      <p className="font-medium">Telefon</p>
                      <p className="text-muted-foreground">{caseData.reporterPhone}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Saksbehandling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={caseData.status}
                  onValueChange={(value: WhistleblowStatus) => updateStatus(value)}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVED">Mottatt</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Bekreftet</SelectItem>
                    <SelectItem value="UNDER_INVESTIGATION">Under etterforskning</SelectItem>
                    <SelectItem value="ACTION_TAKEN">Tiltak iverksatt</SelectItem>
                    <SelectItem value="RESOLVED">Løst</SelectItem>
                    <SelectItem value="CLOSED">Avsluttet</SelectItem>
                    <SelectItem value="DISMISSED">Avvist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Alvorlighet</Label>
                <Select
                  value={caseData.severity}
                  onValueChange={(value: WhistleblowSeverity) => updateSeverity(value)}
                  disabled={updatingSeverity}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Lav</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">Høy</SelectItem>
                    <SelectItem value="CRITICAL">Kritisk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Tildelt til</Label>
                <Select
                  value={caseData.assignedTo || ""}
                  onValueChange={(value) => updateAssignedTo(value)}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder={loadingUsers ? "Laster brukere..." : "Ingen valgt"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ingen</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user.id} value={u.user.id}>
                        {u.user.name || u.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Kategori</p>
                  <p className="text-muted-foreground">{getCategoryLabel(caseData.category)}</p>
                </div>

                <div>
                  <p className="font-medium">Mottatt</p>
                  <p className="text-muted-foreground">
                    {format(new Date(caseData.receivedAt), "dd. MMM yyyy HH:mm", {
                      locale: nb,
                    })}
                  </p>
                </div>

                {caseData.acknowledgedAt && (
                  <div>
                    <p className="font-medium">Bekreftet</p>
                    <p className="text-muted-foreground">
                      {format(new Date(caseData.acknowledgedAt), "dd. MMM yyyy HH:mm", {
                        locale: nb,
                      })}
                    </p>
                  </div>
                )}

                {caseData.investigatedAt && (
                  <div>
                    <p className="font-medium">Etterforskning startet</p>
                    <p className="text-muted-foreground">
                      {format(new Date(caseData.investigatedAt), "dd. MMM yyyy HH:mm", {
                        locale: nb,
                      })}
                    </p>
                  </div>
                )}

                {caseData.closedAt && (
                  <div>
                    <p className="font-medium">Avsluttet</p>
                    <p className="text-muted-foreground">
                      {format(new Date(caseData.closedAt), "dd. MMM yyyy HH:mm", {
                        locale: nb,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

