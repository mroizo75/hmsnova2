import { createNotification } from "@/server/actions/notification.actions";
import type { NotificationType } from "@prisma/client";

/** Varsler personen som får ansvaret. IK-HMS § 5: ansvaret skal være tydelig. */
export async function notifyTaskAssigned(input: {
  tenantId: string;
  assigneeId: string;
  actorId: string;
  type: Extract<NotificationType, "INSPECTION_SCHEDULED" | "MEASURE_ASSIGNED">;
  title: string;
  message: string;
  link: string;
}): Promise<void> {
  if (!input.assigneeId || input.assigneeId === input.actorId) return;

  await createNotification({
    tenantId: input.tenantId,
    userId: input.assigneeId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
  });
}
