"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { differenceInDays, format } from "date-fns";
import { nb } from "date-fns/locale";

interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  type: "action" | "audit" | "training" | "document" | "goal";
  link?: string;
  isOverdue?: boolean;
}

interface UpcomingDeadlinesProps {
  deadlines: Deadline[];
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "action":
        return "Tiltak";
      case "audit":
        return "Revisjon";
      case "training":
        return "Opplæring";
      case "document":
        return "Dokument";
      case "goal":
        return "Mål";
      default:
        return type;
    }
  };

  const getDaysUntil = (date: Date) => {
    return differenceInDays(new Date(date), new Date());
  };

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          {Math.abs(daysUntil)} dager forsinket
        </Badge>
      );
    } else if (daysUntil === 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">I dag!</Badge>
      );
    } else if (daysUntil <= 3) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          {daysUntil} dager igjen
        </Badge>
      );
    } else if (daysUntil <= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          {daysUntil} dager igjen
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          {daysUntil} dager igjen
        </Badge>
      );
    }
  };

  if (deadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Kommende frister
          </CardTitle>
          <CardDescription>Neste 30 dager</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            🎉 Ingen kommende frister!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Kommende frister
        </CardTitle>
        <CardDescription>Neste 30 dager</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {deadlines.map((deadline) => {
              const daysUntil = getDaysUntil(deadline.dueDate);
              return (
                <div
                  key={deadline.id}
                  className="flex items-start justify-between gap-4 pb-4 border-b last:border-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(deadline.type)}
                      </Badge>
                      {deadline.isOverdue && (
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                    {deadline.link ? (
                      <Link
                        href={deadline.link}
                        className="text-sm font-medium hover:underline block"
                      >
                        {deadline.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{deadline.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(deadline.dueDate), "d. MMMM yyyy", { locale: nb })}
                    </p>
                  </div>
                  <div>{getUrgencyBadge(daysUntil)}</div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

