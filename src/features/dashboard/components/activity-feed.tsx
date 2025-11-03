"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  ClipboardCheck,
  GraduationCap,
  Target,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "document" | "risk" | "incident" | "action" | "audit" | "training" | "goal";
  title: string;
  description?: string;
  timestamp: Date;
  link?: string;
  status?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "document":
        return FileText;
      case "risk":
        return AlertTriangle;
      case "incident":
        return AlertCircle;
      case "action":
        return ListTodo;
      case "audit":
        return ClipboardCheck;
      case "training":
        return GraduationCap;
      case "goal":
        return Target;
      default:
        return FileText;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "document":
        return "Dokument";
      case "risk":
        return "Risiko";
      case "incident":
        return "Hendelse";
      case "action":
        return "Tiltak";
      case "audit":
        return "Revisjon";
      case "training":
        return "Opplæring";
      case "goal":
        return "Mål";
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return null;
    
    const statusMap: Record<string, string> = {
      // Document statuses
      DRAFT: "Utkast",
      APPROVED: "Godkjent",
      ARCHIVED: "Arkivert",
      
      // Risk statuses
      OPEN: "Åpen",
      MITIGATED: "Håndtert",
      ACCEPTED: "Akseptert",
      CLOSED: "Lukket",
      
      // Incident statuses
      REPORTED: "Rapportert",
      INVESTIGATING: "Under utredning",
      RESOLVED: "Løst",
      
      // Action/Measure statuses
      PENDING: "Venter",
      IN_PROGRESS: "Pågår",
      DONE: "Ferdig",
      CANCELLED: "Kansellert",
      
      // Audit statuses
      PLANNED: "Planlagt",
      COMPLETED: "Fullført",
      
      // Goal statuses
      ACTIVE: "Aktiv",
      ACHIEVED: "Oppnådd",
      AT_RISK: "I risiko",
      FAILED: "Ikke oppnådd",
    };
    
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "";
    
    // Grønne statuser (fullført/godkjent)
    if (["APPROVED", "DONE", "COMPLETED", "RESOLVED", "ACHIEVED", "CLOSED", "MITIGATED"].includes(status)) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    
    // Blå statuser (pågående/aktiv)
    if (["IN_PROGRESS", "INVESTIGATING", "ACTIVE", "PLANNED"].includes(status)) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    
    // Gule statuser (venter/advarsel)
    if (["PENDING", "DRAFT", "REPORTED", "OPEN", "AT_RISK"].includes(status)) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    
    // Røde statuser (kansellert/feilet)
    if (["CANCELLED", "FAILED", "ARCHIVED"].includes(status)) {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    
    // Orange for akseptert risiko
    if (status === "ACCEPTED") {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }
    
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktivitet</CardTitle>
          <CardDescription>Siste aktivitet i systemet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Ingen aktivitet registrert ennå
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitet</CardTitle>
        <CardDescription>Siste aktivitet i systemet</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <div className="mt-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getLabel(activity.type)}
                      </Badge>
                      {activity.status && (
                        <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                          {getStatusLabel(activity.status)}
                        </Badge>
                      )}
                    </div>
                    {activity.link ? (
                      <Link
                        href={activity.link}
                        className="text-sm font-medium hover:underline"
                      >
                        {activity.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{activity.title}</p>
                    )}
                    {activity.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: nb,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

