import { isTripletexSessionKeyForTenant, tripletexSessionCacheKey } from "../security";
import { getTripletexConsumerToken } from "./env";

type SessionCache = {
  token: string;
  expiresAt: number;
};

const sessionCache = new Map<string, SessionCache>();

export type TripletexRequestFn = (
  path: string,
  init?: RequestInit & { sessionToken?: string }
) => Promise<Response>;

export class TripletexApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "TripletexApiError";
    this.status = status;
  }
}

export function tripletexBaseUrl(): string {
  return process.env.TRIPLETEX_API_BASE?.replace(/\/$/, "") || "https://tripletex.no/v2";
}

function formatExpirationDate(daysAhead = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/** Offisiell API 2.0: PUT /token/session/:create med query-parametre. */
export function tripletexSessionCreateUrl(input: {
  baseUrl: string;
  consumerToken: string;
  employeeToken: string;
  expirationDate: string;
}): string {
  const params = new URLSearchParams({
    consumerToken: input.consumerToken,
    employeeToken: input.employeeToken,
    expirationDate: input.expirationDate,
  });
  return `${input.baseUrl.replace(/\/$/, "")}/token/session/:create?${params.toString()}`;
}

export async function createSessionToken(input: {
  consumerToken: string;
  employeeToken: string;
  expirationDate?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): Promise<{ token: string; expirationDate?: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.baseUrl ?? tripletexBaseUrl();
  const expirationDate = input.expirationDate ?? formatExpirationDate();
  const res = await fetchImpl(
    tripletexSessionCreateUrl({
      baseUrl,
      consumerToken: input.consumerToken,
      employeeToken: input.employeeToken,
      expirationDate,
    }),
    { method: "PUT" }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new TripletexApiError(`Kunne ikke opprette Tripletex-sesjon (${res.status})`, res.status, body);
  }

  const json = (await res.json()) as {
    value?: { token?: string; expirationDate?: string };
  };
  const token = json.value?.token;
  if (!token) {
    throw new TripletexApiError("Tripletex returnerte ikke sesjonstoken", 500);
  }
  return { token, expirationDate: json.value?.expirationDate };
}

function authHeader(sessionToken: string): string {
  return `Basic ${Buffer.from(`0:${sessionToken}`).toString("base64")}`;
}

export class TripletexClient {
  constructor(
    private readonly tenantId: string,
    private readonly employeeToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = tripletexBaseUrl()
  ) {}

  private sessionKey(): string {
    return tripletexSessionCacheKey(this.tenantId, this.employeeToken);
  }

  private consumerToken(): string {
    const token = getTripletexConsumerToken();
    if (!token) {
      throw new TripletexApiError("Tripletex consumer-token mangler på serveren", 500);
    }
    return token;
  }

  async getSessionToken(force = false): Promise<string> {
    const cacheKey = this.sessionKey();
    const cached = sessionCache.get(cacheKey);
    if (!force && cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const created = await createSessionToken({
      consumerToken: this.consumerToken(),
      employeeToken: this.employeeToken,
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
    });

    const expiresAt = created.expirationDate
      ? new Date(created.expirationDate).getTime()
      : Date.now() + 24 * 60 * 60 * 1000;

    sessionCache.set(cacheKey, { token: created.token, expiresAt });
    return created.token;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const doFetch = async (sessionToken: string) => {
      const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
      return this.fetchImpl(url, {
        ...init,
        headers: {
          Authorization: authHeader(sessionToken),
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
          ...init?.headers,
        },
      });
    };

    let token = await this.getSessionToken();
    let res = await doFetch(token);

    if (res.status === 401) {
      token = await this.getSessionToken(true);
      res = await doFetch(token);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new TripletexApiError(`Tripletex API-feil ${res.status}`, res.status, body);
    }

    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  static clearSession(tenantId?: string) {
    if (!tenantId) {
      sessionCache.clear();
      return;
    }
    TripletexClient.clearTenantSessions(tenantId);
  }

  static clearTenantSessions(tenantId: string) {
    for (const key of sessionCache.keys()) {
      if (isTripletexSessionKeyForTenant(key, tenantId)) {
        sessionCache.delete(key);
      }
    }
  }
}

type ListResponse<T> = { values?: T[]; fullResultSize?: number };

export async function paginatedGet<T>(
  client: TripletexClient,
  path: string,
  fields?: string
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  const count = 1000;

  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const fieldQ = fields ? `&fields=${encodeURIComponent(fields)}` : "";
    const page = await client.request<ListResponse<T>>(
      `${path}${sep}from=${from}&count=${count}${fieldQ}`
    );
    const values = page.values ?? [];
    all.push(...values);
    if (values.length < count) break;
    from += count;
    if (from > 50_000) break;
  }

  return all;
}
