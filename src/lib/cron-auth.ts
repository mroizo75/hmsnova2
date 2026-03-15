import { NextRequest, NextResponse } from "next/server";

export function isCronAuthorized(authHeader: string | null, cronSecret?: string): boolean {
  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

export function validateCronRequest(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json({ error: "Cron er ikke konfigurert" }, { status: 500 });
  }

  if (!isCronAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
