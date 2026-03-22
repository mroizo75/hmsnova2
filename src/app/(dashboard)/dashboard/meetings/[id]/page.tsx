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
  Edit,
  Calendar,
  MapPin,
  Video,
  Users,
  FileText,
  Plus,
  Check,
  X,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useTranslations } from "next-intl";

type MeetingStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type MeetingType = "AMU" | "VO" | "BHT" | "HMS_COMMITTEE" | "OTHER";
type ParticipantRole = "CHAIR" | "SECRETARY" | "MEMBER" | "OBSERVER";
type DecisionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Meeting {
  id: string;
  type: MeetingType;
  title: string;
  scheduledDate: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  summary?: string;
  notes?: string;
  status: MeetingStatus;
  organizer: string;
  minuteTaker?: string;
  participants: Participant[];
  decisions: Decision[];
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  userId?: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  externalName?: string;
  externalEmail?: string;
  role: ParticipantRole;
  attended: boolean;
}

interface Decision {
  id: string;
  decisionNumber: string;
  title: string;
  description: string;
  responsibleId?: string;
  responsible?: {
    id: string;
    name: string | null;
    email: string;
  };
  dueDate?: string;
  status: DecisionStatus;
  notes?: string;
}

function getStatusBadge(status: MeetingStatus, t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case "PLANNED":
      return <Badge variant="secondary">{t("status.planned")}</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-blue-500 hover:bg-blue-500">{t("status.inProgress")}</Badge>;
    case "COMPLETED":
      return <Badge className="bg-green-600 hover:bg-green-600">{t("status.completed")}</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">{t("status.cancelled")}</Badge>;
  }
}

function getDecisionStatusBadge(status: DecisionStatus, t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">{t("decisionStatus.pending")}</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-blue-500 hover:bg-blue-500">{t("decisionStatus.inProgress")}</Badge>;
    case "COMPLETED":
      return <Badge className="bg-green-600 hover:bg-green-600">{t("decisionStatus.completed")}</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">{t("decisionStatus.cancelled")}</Badge>;
  }
}

function getRoleLabel(role: ParticipantRole, t: ReturnType<typeof useTranslations>) {
  switch (role) {
    case "CHAIR":
      return t("roles.chair");
    case "SECRETARY":
      return t("roles.secretary");
    case "MEMBER":
      return t("roles.member");
    case "OBSERVER":
      return t("roles.observer");
  }
}

const NO_DECISION_RESPONSIBLE_VALUE = "__none_decision_responsible__";

export default function MeetingDetailPage() {
  const t = useTranslations("dashboardMeetingDetailPage");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showParticipantDialog, setShowParticipantDialog] = useState(false);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    userId: "",
    externalName: "",
    externalEmail: "",
    role: "MEMBER" as ParticipantRole,
  });
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    description: "",
    responsibleId: NO_DECISION_RESPONSIBLE_VALUE,
    dueDate: "",
  });

  useEffect(() => {
    fetchMeeting();
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

  const fetchMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.fetchMeeting"));
      }

      setMeeting(data.data);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      router.push("/dashboard/meetings");
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = async () => {
    try {
      const payload: any = {
        role: participantForm.role,
      };

      if (participantForm.userId) {
        payload.userId = participantForm.userId;
      } else if (participantForm.externalName) {
        payload.externalName = participantForm.externalName;
        if (participantForm.externalEmail) {
          payload.externalEmail = participantForm.externalEmail;
        }
      } else {
        throw new Error(t("errors.participantRequired"));
      }

      const response = await fetch(`/api/meetings/${params.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.addParticipant"));
      }

      toast({
        title: t("toasts.participantAdded.title"),
        description: t("toasts.participantAdded.description"),
      });

      setShowParticipantDialog(false);
      setParticipantForm({
        userId: "",
        externalName: "",
        externalEmail: "",
        role: "MEMBER",
      });
      fetchMeeting();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addDecision = async () => {
    try {
      if (!decisionForm.title || !decisionForm.description) {
        throw new Error(t("errors.decisionRequired"));
      }

      const payload: any = {
        title: decisionForm.title,
        description: decisionForm.description,
      };

      if (decisionForm.responsibleId && decisionForm.responsibleId !== NO_DECISION_RESPONSIBLE_VALUE) {
        payload.responsibleId = decisionForm.responsibleId;
      }

      if (decisionForm.dueDate) {
        payload.dueDate = new Date(decisionForm.dueDate).toISOString();
      }

      const response = await fetch(`/api/meetings/${params.id}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.addDecision"));
      }

      toast({
        title: t("toasts.decisionAdded.title"),
        description: t("toasts.decisionAdded.description"),
      });

      setShowDecisionDialog(false);
      setDecisionForm({
        title: "",
        description: "",
        responsibleId: NO_DECISION_RESPONSIBLE_VALUE,
        dueDate: "",
      });
      fetchMeeting();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/meetings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            <p className="text-muted-foreground">
              {format(new Date(meeting.scheduledDate), "dd. MMMM yyyy 'kl.' HH:mm", { locale: locale === "en" ? undefined : nb })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(meeting.status, t)}
        </div>
      </div>

      {/* Møtedetaljer */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.details.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("sections.details.dateTime")}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(meeting.scheduledDate), "dd. MMMM yyyy 'kl.' HH:mm", { locale: locale === "en" ? undefined : nb })}
                </p>
              </div>
            </div>

            {meeting.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("sections.details.location")}</p>
                  <p className="text-sm text-muted-foreground">{meeting.location}</p>
                </div>
              </div>
            )}

            {meeting.meetingLink && (
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("sections.details.meetingLink")}</p>
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t("actions.openLink")}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("sections.details.organizer")}</p>
                <p className="text-sm text-muted-foreground">{meeting.organizer}</p>
              </div>
            </div>
          </div>

          {meeting.agenda && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 font-semibold">{t("sections.details.agenda")}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meeting.agenda}
                </p>
              </div>
            </>
          )}

          {meeting.summary && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 font-semibold">{t("sections.details.summary")}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meeting.summary}
                </p>
              </div>
            </>
          )}

          {meeting.notes && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 font-semibold">{t("sections.details.notes")}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meeting.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deltakere */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("sections.participants.title")}</CardTitle>
              <CardDescription>{t("sections.participants.description")}</CardDescription>
            </div>
            <Dialog open={showParticipantDialog} onOpenChange={setShowParticipantDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("actions.add")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("dialogs.addParticipant.title")}</DialogTitle>
                  <DialogDescription>
                    {t("dialogs.addParticipant.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">{t("dialogs.addParticipant.internalUser")}</Label>
                    <Select
                      value={participantForm.userId || "NONE"}
                      onValueChange={(value) =>
                        setParticipantForm({ ...participantForm, userId: value === "NONE" ? "" : value })
                      }
                      disabled={loadingUsers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingUsers ? t("loadingUsers") : t("dialogs.addParticipant.selectUser")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{t("dialogs.addParticipant.noneExternal")}</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.user.id} value={u.user.id}>
                            {u.user.name || u.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="externalName">{t("dialogs.addParticipant.externalName")}</Label>
                    <Input
                      id="externalName"
                      value={participantForm.externalName}
                      onChange={(e) =>
                        setParticipantForm({ ...participantForm, externalName: e.target.value })
                      }
                      placeholder={t("dialogs.addParticipant.externalOnly")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="externalEmail">{t("dialogs.addParticipant.externalEmail")}</Label>
                    <Input
                      id="externalEmail"
                      type="email"
                      value={participantForm.externalEmail}
                      onChange={(e) =>
                        setParticipantForm({ ...participantForm, externalEmail: e.target.value })
                      }
                      placeholder={t("dialogs.addParticipant.externalOnly")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">{t("common.role")}</Label>
                    <Select
                      value={participantForm.role}
                      onValueChange={(value: ParticipantRole) =>
                        setParticipantForm({ ...participantForm, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHAIR">{t("roles.chair")}</SelectItem>
                        <SelectItem value="SECRETARY">{t("roles.secretary")}</SelectItem>
                        <SelectItem value="MEMBER">{t("roles.member")}</SelectItem>
                        <SelectItem value="OBSERVER">{t("roles.observer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowParticipantDialog(false)}>
                    {t("actions.cancel")}
                  </Button>
                  <Button onClick={addParticipant}>{t("actions.add")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.participants.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("sections.participants.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.role")}</TableHead>
                  <TableHead>{t("table.attendance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meeting.participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.user ? (p.user.name || p.user.email) : p.externalName}
                      {p.externalEmail && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({p.externalEmail})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getRoleLabel(p.role, t)}</TableCell>
                    <TableCell>
                      {p.attended ? (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          <Check className="mr-1 h-3 w-3" />
                          {t("attendance.present")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="mr-1 h-3 w-3" />
                          {t("attendance.absent")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vedtak */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("sections.decisions.title")}</CardTitle>
              <CardDescription>{t("sections.decisions.description")}</CardDescription>
            </div>
            <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("actions.newDecision")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("dialogs.addDecision.title")}</DialogTitle>
                  <DialogDescription>{t("dialogs.addDecision.description")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="decisionTitle">
                      {t("common.title")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="decisionTitle"
                      value={decisionForm.title}
                      onChange={(e) =>
                        setDecisionForm({ ...decisionForm, title: e.target.value })
                      }
                      placeholder={t("dialogs.addDecision.titlePlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="decisionDescription">
                      {t("common.description")} <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="decisionDescription"
                      value={decisionForm.description}
                      onChange={(e) =>
                        setDecisionForm({ ...decisionForm, description: e.target.value })
                      }
                      placeholder={t("dialogs.addDecision.descriptionPlaceholder")}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsibleId">{t("common.responsible")}</Label>
                    <Select
                      value={decisionForm.responsibleId}
                      onValueChange={(value) =>
                        setDecisionForm({ ...decisionForm, responsibleId: value })
                      }
                      disabled={loadingUsers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingUsers ? t("loadingUsers") : t("dialogs.addDecision.selectResponsible")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DECISION_RESPONSIBLE_VALUE}>{t("noneSelected")}</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.user.id} value={u.user.id}>
                            {u.user.name || u.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">{t("common.deadline")}</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={decisionForm.dueDate}
                      onChange={(e) =>
                        setDecisionForm({ ...decisionForm, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
                    {t("actions.cancel")}
                  </Button>
                  <Button onClick={addDecision}>{t("actions.addDecision")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.decisions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("sections.decisions.empty")}</p>
          ) : (
            <div className="space-y-4">
              {meeting.decisions.map((decision) => (
                <div key={decision.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{decision.decisionNumber}</Badge>
                        <h4 className="font-semibold">{decision.title}</h4>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{decision.description}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        {decision.responsible && (
                          <span>{t("common.responsible")}: {decision.responsible.name || decision.responsible.email}</span>
                        )}
                        {decision.dueDate && (
                          <span>
                            {t("common.deadline")}: {format(new Date(decision.dueDate), "dd. MMM yyyy", { locale: locale === "en" ? undefined : nb })}
                          </span>
                        )}
                      </div>
                    </div>
                    {getDecisionStatusBadge(decision.status, t)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

