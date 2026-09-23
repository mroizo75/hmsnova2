import { isTripletexSessionKeyForTenant, tripletexSessionCacheKey } from "../security";
import { getTripletexConsumerToken, tripletexApiBaseCandidates } from "./env";
import { tripletexValidationSummary } from "./project-payload";

type SessionCache = {
  token: string;
  expiresAt: number;
  baseUrl: string;
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
  return tripletexApiBaseCandidates()[0];
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

async function createSessionOnBase(input: {
  consumerToken: string;
  employeeToken: string;
  expirationDate: string;
  fetchImpl: typeof fetch;
  baseUrl: string;
}): Promise<{ token: string; expirationDate?: string; baseUrl: string }> {
  const res = await input.fetchImpl(
    tripletexSessionCreateUrl({
      baseUrl: input.baseUrl,
      consumerToken: input.consumerToken,
      employeeToken: input.employeeToken,
      expirationDate: input.expirationDate,
    }),
    { method: "PUT", headers: { Accept: "application/json" } }
  );

  const body = await res.text();
  if (!res.ok) {
    throw new TripletexApiError(`Kunne ikke opprette Tripletex-sesjon (${res.status})`, res.status, body);
  }

  let json: { value?: { token?: string; expirationDate?: string } };
  try {
    json = JSON.parse(body) as { value?: { token?: string; expirationDate?: string } };
  } catch {
    throw new TripletexApiError("Tripletex returnerte ugyldig sesjons-svar", 500, body);
  }
  const token = json.value?.token;
  if (!token) {
    throw new TripletexApiError("Tripletex returnerte ikke sesjonstoken", 500, body);
  }
  return { token, expirationDate: json.value?.expirationDate, baseUrl: input.baseUrl };
}

export async function createSessionToken(input: {
  consumerToken: string;
  employeeToken: string;
  expirationDate?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): Promise<{ token: string; expirationDate?: string; baseUrl: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const expirationDate = input.expirationDate ?? formatExpirationDate();
  const bases = input.baseUrl
    ? [input.baseUrl.replace(/\/$/, "")]
    : tripletexApiBaseCandidates();

  let lastError: TripletexApiError | null = null;
  for (const baseUrl of bases) {
    try {
      return await createSessionOnBase({
        consumerToken: input.consumerToken,
        employeeToken: input.employeeToken,
        expirationDate,
        fetchImpl,
        baseUrl,
      });
    } catch (error: unknown) {
      if (error instanceof TripletexApiError) {
        lastError = error;
        continue;
      }
      lastError = new TripletexApiError(
        error instanceof Error ? error.message : "Kunne ikke nå Tripletex",
        503
      );
      continue;
    }
  }

  if (lastError) {
    lastError.message = sessionCreateHint(lastError, bases);
    throw lastError;
  }
  throw new TripletexApiError("Kunne ikke opprette Tripletex-sesjon", 500);
}

function sessionCreateHint(error: TripletexApiError, bases: string[]): string {
  const triedTest = bases.some((b) => b.includes("api-test.tripletex.tech"));
  const onlyProd = bases.length === 1 && !triedTest;
  if (error.status === 401 || error.status === 403 || error.status === 400 || error.status === 422) {
    if (onlyProd) {
      return "Tokenet ble avvist av Tripletex. Testkonto-tokens virker bare mot api-test.tripletex.tech — sett TRIPLETEX_API_BASE=https://api-test.tripletex.tech/v2 og lim inn employee-tokenet, ikke consumer-tokenet.";
    }
    return "Ugyldig consumer- eller employee-token. For testkonto: lim inn employee-tokenet fra Tripletex (ikke TRIPELTEX_TOKEN fra .env).";
  }
  if (error.status >= 500) {
    return "Tripletex svarte med serverfeil ved sesjon. Sjekk at testkonto treffer api-test.tripletex.tech, ikke tripletex.no.";
  }
  return error.message;
}

function authHeader(sessionToken: string): string {
  return `Basic ${Buffer.from(`0:${sessionToken}`).toString("base64")}`;
}

export class TripletexClient {
  private resolvedBaseUrl: string | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly employeeToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = tripletexBaseUrl()
  ) {}

  private activeBaseUrl(): string {
    return this.resolvedBaseUrl ?? this.baseUrl;
  }

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
      this.resolvedBaseUrl = cached.baseUrl;
      return cached.token;
    }

    const created = await createSessionToken({
      consumerToken: this.consumerToken(),
      employeeToken: this.employeeToken,
      fetchImpl: this.fetchImpl,
      baseUrl: this.resolvedBaseUrl ?? undefined,
    });
    this.resolvedBaseUrl = created.baseUrl;

    const expiresAt = created.expirationDate
      ? new Date(created.expirationDate).getTime()
      : Date.now() + 24 * 60 * 60 * 1000;

    sessionCache.set(cacheKey, { token: created.token, expiresAt, baseUrl: created.baseUrl });
    return created.token;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const doFetch = async (sessionToken: string) => {
      const url = path.startsWith("http") ? path : `${this.activeBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
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
      const detail = tripletexValidationSummary(body);
      throw new TripletexApiError(
        detail ? `Tripletex API-feil ${res.status}: ${detail}` : `Tripletex API-feil ${res.status}`,
        res.status,
        body
      );
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
