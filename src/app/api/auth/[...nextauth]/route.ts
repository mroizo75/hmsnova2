import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

function withoutInternalPort(value: string): string {
  try {
    const url = new URL(value, "https://www.hmsnova.no");
    if (url.port !== "3040") return value;
    url.port = "";
    return url.toString();
  } catch {
    return value;
  }
}

async function sanitizeAuthResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.clone().json().catch(() => null);
    if (data && typeof data === "object" && typeof data.url === "string" && data.url.includes(":3040")) {
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return Response.json(
        { ...data, url: withoutInternalPort(data.url) },
        { status: response.status, headers }
      );
    }
  }

  const location = response.headers.get("location");
  if (location?.includes(":3040")) {
    const headers = new Headers(response.headers);
    headers.set("location", withoutInternalPort(location));
    return new Response(response.body, { status: response.status, headers });
  }

  return response;
}

type AuthContext = { params: Promise<{ nextauth: string[] }> };

async function GET(request: NextRequest, context: AuthContext) {
  return sanitizeAuthResponse(await handler(request, context));
}

async function POST(request: NextRequest, context: AuthContext) {
  return sanitizeAuthResponse(await handler(request, context));
}

export { GET, POST };
