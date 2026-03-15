"use client";

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Notification as NotificationModel } from "@prisma/client";

const STREAM_URL = "/api/notifications/stream";
const POLL_INTERVAL_MS = 45000; // 45 sekunder i produksjon
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * SSE gir ofte ERR_HTTP2_PROTOCOL_ERROR på Vercel fordi:
 * - Serverless-funksjoner har timeout (f.eks. 60s), så langvarige streams kuttet
 * - Vercel buffrer/avslutter streams annerledes enn vanlig Node
 * I produksjon bruker vi derfor kun polling – ingen åpen SSE-tilkobling = ingen feil.
 */
const useStream = typeof window !== "undefined" && process.env.NODE_ENV !== "production";

type MessageCallback = (data: Record<string, unknown>) => void;

interface NotificationsState {
  notifications: NotificationModel[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

interface UseNotificationsOptions {
  limit?: number;
  bypassContext?: boolean;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

let shared: {
  eventSource: EventSource | null;
  listeners: Set<MessageCallback>;
  reconnectDelay: number;
  reconnectAttempts: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
} = {
  eventSource: null,
  listeners: new Set(),
  reconnectDelay: INITIAL_RECONNECT_DELAY,
  reconnectAttempts: 0,
  timeoutId: null,
};

function connectStream(): void {
  if (shared.listeners.size === 0) return;
  if (shared.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  shared.eventSource = new EventSource(STREAM_URL);

  shared.eventSource.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      if (data.type === "connected") {
        shared.reconnectDelay = INITIAL_RECONNECT_DELAY;
        shared.reconnectAttempts = 0;
        return;
      }
      shared.listeners.forEach((cb) => cb(data));
    } catch {
      // Ignore parse errors
    }
  });

  shared.eventSource.addEventListener("error", () => {
    shared.eventSource?.close();
    shared.eventSource = null;
    shared.reconnectAttempts += 1;
    if (shared.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (shared.timeoutId) clearTimeout(shared.timeoutId);
      shared.timeoutId = null;
      return;
    }
    const delay = shared.reconnectDelay;
    shared.reconnectDelay = Math.min(
      shared.reconnectDelay * 2,
      MAX_RECONNECT_DELAY
    );
    shared.timeoutId = setTimeout(connectStream, delay);
  });
}

function subscribeToStream(cb: MessageCallback): () => void {
  shared.listeners.add(cb);
  if (
    !shared.eventSource ||
    shared.eventSource.readyState === EventSource.CLOSED
  ) {
    connectStream();
  }
  return () => {
    shared.listeners.delete(cb);
    if (shared.listeners.size === 0) {
      if (shared.timeoutId) clearTimeout(shared.timeoutId);
      shared.eventSource?.close();
      shared.eventSource = null;
      shared.reconnectDelay = INITIAL_RECONNECT_DELAY;
      shared.reconnectAttempts = 0;
    }
  };
}

export function useNotifications() {
  return useNotificationsWithOptions();
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const state = useNotificationsWithOptions({ limit: 100, bypassContext: true });
  return createElement(NotificationsContext.Provider, { value: state }, children);
}

export function useNotificationsWithOptions(options?: UseNotificationsOptions): NotificationsState {
  const contextValue = useContext(NotificationsContext);
  if (contextValue && !options?.bypassContext) {
    return contextValue;
  }

  const safeLimit = useMemo(() => {
    const candidate = options?.limit ?? 10;
    return Math.min(Math.max(candidate, 1), 100);
  }, [options?.limit]);
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const prevUnreadRef = useRef<number>(0);
  const requestUrl = useMemo(() => `/api/notifications?limit=${safeLimit}`, [safeLimit]);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch(requestUrl);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications ?? []);
          const count = data.unreadCount ?? 0;
          setUnreadCount(count);
          prevUnreadRef.current = count;
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch notifications:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
  }, [requestUrl]);

  // I produksjon: bruk kun polling (unngår HTTP/2/SSE-feil på Vercel)
  useEffect(() => {
    if (!useStream) return;

    const unsubscribe = subscribeToStream((data) => {
      const incoming = data as NotificationModel;
      setNotifications((prev) => {
        if (prev.some((notification) => notification.id === incoming.id)) {
          return prev;
        }
        return [incoming, ...prev].slice(0, safeLimit);
      });
      if (!incoming.isRead) {
        setUnreadCount((prev) => prev + 1);
      }
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const payload = data as { title?: string; message?: string; id?: string };
        new Notification(payload.title ?? "Varsel", {
          body: payload.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: payload.id,
        });
      }
    });

    return unsubscribe;
  }, [safeLimit]);

  // Polling i produksjon – oppdater liste og unread count jevnlig (ingen åpen stream)
  useEffect(() => {
    if (useStream) return;

    const poll = async () => {
      try {
        const response = await fetch(requestUrl);
        if (!response.ok) return;
        const data = await response.json();
        setNotifications(data.notifications ?? []);
        const newUnread = data.unreadCount ?? 0;
        if (newUnread > prevUnreadRef.current && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const latest = (data.notifications as NotificationModel[])?.[0];
          if (latest && !latest.isRead) {
            new Notification(latest.title ?? "Varsel", {
              body: latest.message ?? "",
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: latest.id,
            });
          }
        }
        prevUnreadRef.current = newUnread;
        setUnreadCount(newUnread);
      } catch {
        // Stille feil – ikke spam konsollen
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => clearInterval(intervalId);
  }, [requestUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    Notification.requestPermission();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) => {
          let changedUnread = false;
          const next = prev.map((notification) => {
            if (notification.id !== notificationId) {
              return notification;
            }
            if (!notification.isRead) {
              changedUnread = true;
            }
            return { ...notification, isRead: true };
          });
          if (changedUnread) {
            setUnreadCount((current) => Math.max(0, current - 1));
          }
          return next;
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark all as read:", error);
      }
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications((prev) => {
          const target = prev.find((notification) => notification.id === notificationId);
          if (target && !target.isRead) {
            setUnreadCount((current) => Math.max(0, current - 1));
          }
          return prev.filter((notification) => notification.id !== notificationId);
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete notification:", error);
      }
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
