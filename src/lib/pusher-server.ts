import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

function getPusherServer(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }

  return pusherInstance;
}

export { getPusherServer };

/**
 * Trigger a realtime invalidation event to all users in a tenant.
 * Fire-and-forget: never throws, never blocks the server action.
 */
export async function triggerRealtimeEvent(
  tenantId: string,
  event: string,
  data?: { id?: string; [key: string]: unknown }
): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Pusher] Not configured — skipping event:", event);
    }
    return;
  }

  try {
    await pusher.trigger(`private-tenant-${tenantId}`, event, data ?? {});
  } catch (err) {
    console.error("[Pusher] Failed to trigger event:", event, err instanceof Error ? err.message : err);
  }
}
