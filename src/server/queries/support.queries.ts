"use server";

import { listMySupportTickets, getSupportTicketForCustomer } from "@/server/actions/support.actions";

export async function fetchSupportTickets() {
  const result = await listMySupportTickets();
  const tickets = result.success ? result.data : [];
  return JSON.parse(JSON.stringify({ success: result.success, tickets }));
}

export async function fetchSupportTicket(id: string) {
  const result = await getSupportTicketForCustomer(id);
  if (!result.success) {
    return null;
  }
  return JSON.parse(JSON.stringify(result.data));
}
