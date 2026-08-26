"use server";

import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchMeetings() {
  const auth = await getAuthContext();
  if (!auth) return [];
  const { tenantId } = auth;

  const meetings = await db.meeting.findMany({
    where: { tenantId },
    include: {
      participants: true,
      decisions: true,
    },
    orderBy: { scheduledDate: "desc" },
  });

  return JSON.parse(JSON.stringify(meetings));
}
