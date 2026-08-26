"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  "incident-updated": [["incidents"]],
  "risk-updated": [["risks"]],
  "routine-updated": [["routines"]],
  "document-updated": [["documents"]],
  "chemical-updated": [["chemicals"]],
  "measure-updated": [["measures"]],
  "training-updated": [["training"]],
  "audit-updated": [["audits"]],
  "sja-updated": [["sja"]],
  "goal-updated": [["goals"]],
  "inspection-updated": [["inspections"]],
  "employee-review-updated": [["employee-reviews"]],
  "settings-updated": [["settings"]],
  "notification-updated": [["notifications"]],
  "meeting-updated": [["meetings"]],
  "management-review-updated": [["management-reviews"]],
};

export function usePusherChannel() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const channelRef = useRef<Channel | null>(null);

  const tenantId = session?.user?.tenantId;

  useEffect(() => {
    if (!tenantId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-tenant-${tenantId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    const eventNames = Object.keys(EVENT_TO_QUERY_KEYS);

    for (const eventName of eventNames) {
      channel.bind(eventName, () => {
        const queryKeys = EVENT_TO_QUERY_KEYS[eventName];
        if (queryKeys) {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      });
    }

    return () => {
      for (const eventName of eventNames) {
        channel.unbind(eventName);
      }
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [tenantId, queryClient]);
}
