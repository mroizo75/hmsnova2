"use client";

import Link from "next/link";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificationsWithOptions } from "@/hooks/useNotifications";

function getNotificationIcon(type: string): string {
  switch (type) {
    case "NEW_INCIDENT":
    case "INCIDENT_UPDATED":
    case "INCIDENT_CLOSED":
      return "🔴";
    case "FORM_SUBMITTED":
    case "FORM_APPROVED":
    case "FORM_REJECTED":
      return "📋";
    case "WHISTLEBLOWING":
    case "WHISTLEBLOWING_MSG":
      return "🔔";
    case "MEASURE_OVERDUE":
    case "MEASURE_ASSIGNED":
      return "⚠️";
    case "AUDIT_SCHEDULED":
      return "📅";
    case "TRAINING_DUE":
      return "🎓";
    default:
      return "📢";
  }
}

export function NotificationsPageContent() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotificationsWithOptions({ limit: 100 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Varslinger</CardTitle>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Merk alle som lest
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Laster varslinger...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Ingen varslinger ennå</p>
          </div>
        ) : (
          <ScrollArea className="h-[65vh]">
            <div className="divide-y rounded-md border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative p-4 pr-24 transition-colors hover:bg-muted/40",
                    !notification.isRead && "bg-blue-50/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                    <div className="min-w-0 flex-1">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          className="block"
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                        </Link>
                      ) : (
                        <>
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                        </>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: nb,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Merk som lest"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Slett varsling"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
