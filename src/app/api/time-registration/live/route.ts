import { NextRequest, NextResponse } from "next/server";
import {
  getDayTimesheetContext,
  routeTimesheetKm,
  searchGeonorgeAddresses,
} from "@/server/actions/timesheet.actions";

function coord(value: string | null, limit: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return n;
}

/** Lesing til timelisten. Vanlig GET, slik at Next.js ikke laster siden på nytt. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");

  if (kind === "addresses") {
    const hits = await searchGeonorgeAddresses(params.get("q") ?? "");
    return NextResponse.json(hits);
  }

  if (kind === "route") {
    const fromLat = coord(params.get("fromLat"), 90);
    const fromLon = coord(params.get("fromLon"), 180);
    const toLat = coord(params.get("toLat"), 90);
    const toLon = coord(params.get("toLon"), 180);
    if (fromLat == null || fromLon == null || toLat == null || toLon == null) {
      return NextResponse.json({ success: false, error: "Ugyldige koordinater" }, { status: 400 });
    }
    const route = await routeTimesheetKm({
      from: { lat: fromLat, lon: fromLon },
      to: { lat: toLat, lon: toLon },
    });
    return NextResponse.json(route);
  }

  if (kind === "day") {
    const date = params.get("date") ?? "";
    const projectId = params.get("projectId") ?? undefined;
    const day = await getDayTimesheetContext(date, projectId || undefined);
    return NextResponse.json(day);
  }

  return NextResponse.json({ code: "BAD_REQUEST", message: "Ukjent kall" }, { status: 400 });
}
