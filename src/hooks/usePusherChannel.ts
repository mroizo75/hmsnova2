"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  "incident-updated": [["incidents"], ["complaints"], ["dashboard"], ["hms-cockpit"], ["hms-pulse"]],
  "risk-updated": [["risks"], ["dashboard"], ["hms-cockpit"]],
  "routine-updated": [["routines"]],
  "document-updated": [["documents"], ["bcm"]],
  "chemical-updated": [["chemicals"]],
  "measure-updated": [["measures"]],
  "training-updated": [["training"], ["fire-drills"], ["aktivitetssikkerhet"]],
  "audit-updated": [["audits"], ["bcm"]],
  "sja-updated": [["sja"]],
  "goal-updated": [["goals"], ["dashboard"], ["hms-cockpit"]],
  "inspection-updated": [["inspections"], ["aktivitetssikkerhet"]],
  "employee-review-updated": [["employee-reviews"]],
  "settings-updated": [
    ["settings"],
    ["environment"],
    ["hms-tavle"],
    ["hms-handbok"],
    ["juridisk-register"],
    ["beredskap-reiseliv"],
    ["bht-nattarbeid"],
    ["ik-mat"],
    ["transport"],
    ["welcome"],
    ["samsvarserklaringer"],
  ],
  "notification-updated": [["notifications"]],
  "meeting-updated": [["meetings"]],
  "management-review-updated": [["management-reviews"]],
  "wellbeing-updated": [["wellbeing"], ["dashboard"]],
  "feedback-updated": [["feedback"]],
  "form-updated": [["forms"]],
  "time-registration-updated": [["time-registration"]],
  "support-updated": [["support"]],
  "whistleblowing-updated": [["whistleblowing"]],
  "project-updated": [["projects"]],
  "benchmark-updated": [["benchmark"]],
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
