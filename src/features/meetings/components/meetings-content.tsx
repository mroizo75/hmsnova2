"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { Calendar, Users, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMeetings } from "@/server/queries/meeting.queries";

type MeetingsData = Awaited<ReturnType<typeof fetchMeetings>>;

interface MeetingsContentProps {
  initialData: MeetingsData;
  locale: string;
  canCreateMeetings: boolean;
}

export function MeetingsContent({ initialData, locale, canCreateMeetings }: MeetingsContentProps) {
  const t = useTranslations("dashboardMeetingsPage");
  const dateLocale = locale === "en" ? enUS : nb;

  const { data: meetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => fetchMeetings(),
    initialData,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNED":
        return <Badge variant="secondary">{t("status.planned")}</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500 hover:bg-blue-500">{t("status.inProgress")}</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600 hover:bg-green-600">{t("status.completed")}</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">{t("status.cancelled")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "AMU":
        return <Badge variant="outline">AMU</Badge>;
      case "VO":
        return <Badge variant="outline">{t("types.vo")}</Badge>;
      case "BHT":
        return <Badge variant="outline">BHT</Badge>;
      case "HMS_COMMITTEE":
        return <Badge variant="outline">{t("types.hmsCommittee")}</Badge>;
      case "OTHER":
        return <Badge variant="outline">{t("types.other")}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.planned")}</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetings.filter((m: any) => m.status === "PLANNED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed")}</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetings.filter((m: any) => m.status === "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.decisions")}</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetings.reduce((sum: number, m: any) => sum + m.decisions.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">{t("empty.title")}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("empty.description")}</p>
          {canCreateMeetings && (
            <Button asChild>
              <Link href="/dashboard/meetings/new">{t("actions.createMeeting")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.title")}</TableHead>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.participants")}</TableHead>
                  <TableHead>{t("table.decisions")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting: any) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell>{getTypeBadge(meeting.type)}</TableCell>
                    <TableCell>
                      {format(new Date(meeting.scheduledDate), "dd. MMM yyyy HH:mm", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{meeting.participants.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{meeting.decisions.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/meetings/${meeting.id}`}>
                        <Button variant="ghost" size="sm">{t("actions.details")}</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {meetings.map((meeting: any) => (
              <div key={meeting.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 font-medium">{meeting.title}</h3>
                  {getStatusBadge(meeting.status)}
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {getTypeBadge(meeting.type)}
                  <span>{format(new Date(meeting.scheduledDate), "dd. MMM yyyy HH:mm", { locale: dateLocale })}</span>
                  <span>{meeting.participants.length} deltakere</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/dashboard/meetings/${meeting.id}`}>{t("actions.details")}</Link>
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
