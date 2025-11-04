"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Alert {
  id: string;
  title: string;
  type: "overdue" | "upcoming" | "critical";
  link: string;
  date?: Date;
  category: string;
}

interface CriticalAlertsProps {
  alerts: Alert[];
}

export function CriticalAlerts({ alerts }: CriticalAlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "upcoming":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "overdue":
      case "critical":
        return "destructive";
      case "upcoming":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-900">
          <AlertTriangle className="h-5 w-5" />
          Krever handling
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <Link key={alert.id} href={alert.link}>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alert.title}
                    </p>
                    {alert.date && (
                      <p className="text-xs text-muted-foreground">
                        {format(alert.date, "d. MMM yyyy", { locale: nb })}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={getBadgeVariant(alert.type)} className="ml-2 shrink-0">
                  {alert.category}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        {alerts.length > 5 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            +{alerts.length - 5} flere varsler
          </p>
        )}
      </CardContent>
    </Card>
  );
}

