"use client";

import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function NotificationBell() {
  return <NotificationBellInner />;
}

function NotificationBellInner() {
  const pathname = usePathname();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const previewNotifications = notifications.slice(0, 10);
  const notificationsPageHref = pathname.startsWith("/ansatt")
    ? "/ansatt/notifications"
    : "/dashboard/notifications";

  const getNotificationIcon = (type: string) => {
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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Varslinger${unreadCount > 0 ? `, ${unreadCount} uleste` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Varslinger</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Merk alle som lest
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Laster...
            </div>
          ) : previewNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Ingen varslinger enda
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {previewNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-blue-50/50"
                  )}
                >
                  <div className="p-4 pr-10">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                  locale: nb,
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                                locale: nb,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                        title="Merk som lest"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteNotification(notification.id)}
                      title="Slett"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {previewNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href={notificationsPageHref}>
                <Button variant="ghost" className="w-full text-sm">
                  Se alle varslinger
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

